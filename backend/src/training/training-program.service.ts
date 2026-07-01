import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import {
  addDays,
  isValidDateStr,
  isValidTimeStr,
  mondayOf,
} from '../common/date.util';
import { TrainingProgramEntity } from './entities/training-program.entity';
import { TrainingProgramPhaseEntity } from './entities/training-program-phase.entity';
import { TrainingProgramWeekEntity } from './entities/training-program-week.entity';
import { TrainingProgramSessionEntity } from './entities/training-program-session.entity';
import { TrainingService } from './training.service';
import {
  CARDIO_ZONES,
  CardioZone,
  EventInput,
  ExerciseInput,
  ProgramInput,
  ProgramSessionInput,
  TRAINING_TYPES,
  TrainingType,
} from './types';

/** Une séance placée (ou ignorée) calculée par l'aperçu de démarrage. */
interface PlacedSession {
  weekIndex: number;
  dayOfWeek: number;
  label: string | null;
  type: TrainingType;
  date: string;
  objective: string | null;
  skipped: boolean; // true = antérieure à la date de début (semaine partielle)
  input: EventInput; // payload prêt pour createForProgram
}

@Injectable()
export class TrainingProgramService {
  constructor(
    @InjectRepository(TrainingProgramEntity)
    private readonly programs: Repository<TrainingProgramEntity>,
    @InjectRepository(TrainingProgramPhaseEntity)
    private readonly phases: Repository<TrainingProgramPhaseEntity>,
    @InjectRepository(TrainingProgramWeekEntity)
    private readonly weeks: Repository<TrainingProgramWeekEntity>,
    @InjectRepository(TrainingProgramSessionEntity)
    private readonly sessions: Repository<TrainingProgramSessionEntity>,
    private readonly training: TrainingService,
  ) {}

  // ---------------------------------------------------------------------------
  // Lecture
  // ---------------------------------------------------------------------------

  async list(q?: string) {
    const rows = await this.programs.find({
      where: q && q.trim() ? { name: ILike(`%${q.trim()}%`) } : {},
      relations: { phases: true, weeks: { sessions: true } },
      order: { name: 'ASC' },
    });
    return rows.map((p) => this.toSummary(p));
  }

  async get(id: string) {
    return this.toResponse(await this.getOrThrow(id));
  }

  // ---------------------------------------------------------------------------
  // Écriture (création / remplacement complet des enfants)
  // ---------------------------------------------------------------------------

  async create(input: ProgramInput) {
    const name = this.resolveName(input.name);
    const program = await this.programs.save(
      this.programs.create({
        name,
        nameKey: this.normalizeKey(name),
        description: this.resolveDescription(input.description),
      }),
    );
    await this.persistChildren(program.id, input);
    return this.get(program.id);
  }

  async update(id: string, input: ProgramInput) {
    const existing = await this.getOrThrow(id);
    if (input.name !== undefined) {
      existing.name = this.resolveName(input.name);
      existing.nameKey = this.normalizeKey(existing.name);
    }
    if (input.description !== undefined) {
      existing.description = this.resolveDescription(input.description);
    }
    await this.programs.save(existing);
    // Remplacement complet des enfants (comme les exercices d'une séance).
    await this.phases.delete({ programId: id }); // weeks.phase_id → SET NULL
    await this.weeks.delete({ programId: id }); // cascade sur les sessions
    await this.persistChildren(id, input);
    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    await this.getOrThrow(id);
    await this.programs.delete(id); // cascade phases / weeks / sessions
  }

  // ---------------------------------------------------------------------------
  // Démarrage
  // ---------------------------------------------------------------------------

  /** Aperçu : pour chaque séance, sa date calculée et son statut placée/ignorée. */
  async previewStart(id: string, startDate?: string) {
    const program = await this.getOrThrow(id);
    const placed = this.computePlacements(program, startDate);
    const kept = placed.filter((p) => !p.skipped);
    const skipped = placed.filter((p) => p.skipped);
    return {
      startDate,
      total: placed.length,
      placed: kept.length,
      skipped: skipped.length,
      sessions: placed.map((p) => ({
        weekIndex: p.weekIndex,
        dayOfWeek: p.dayOfWeek,
        label: p.label,
        type: p.type,
        date: p.date,
        objective: p.objective,
        skipped: p.skipped,
      })),
    };
  }

  /** Démarre le programme : crée les séances réelles dans le planning. */
  async start(id: string, startDate?: string) {
    const program = await this.getOrThrow(id);
    const placed = this.computePlacements(program, startDate).filter(
      (p) => !p.skipped,
    );
    if (placed.length === 0) {
      throw new BadRequestException(
        'Aucune séance à placer pour cette date de début (programme vide ou semaine entièrement passée).',
      );
    }
    // Pré-validation : évite une création partielle si une séance est invalide.
    for (const p of placed) {
      if (p.type === 'musculation' && (p.input.exercises ?? []).length === 0) {
        throw new BadRequestException(
          `La séance S${p.weekIndex} J${p.dayOfWeek} (musculation) doit contenir au moins un exercice.`,
        );
      }
    }
    for (const p of placed) {
      await this.training.createForProgram(p.input, {
        programLabel: program.name,
        programObjective: p.objective,
      });
    }
    return {
      ok: true,
      created: placed.length,
      skipped: this.skippedCount(program, startDate),
    };
  }

  // ---------------------------------------------------------------------------
  // Calcul du placement (RG-04 / RG-05)
  // ---------------------------------------------------------------------------

  private computePlacements(
    program: TrainingProgramEntity,
    startDate?: string,
  ): PlacedSession[] {
    if (!isValidDateStr(startDate)) {
      throw new BadRequestException(
        'Date de début invalide (YYYY-MM-DD attendu).',
      );
    }
    const monday = mondayOf(startDate);
    const phaseObjectiveById = new Map<string, string | null>(
      (program.phases ?? []).map((ph) => [ph.id, ph.objective ?? null]),
    );
    const orderedWeeks = [...(program.weeks ?? [])].sort(
      (a, b) => a.position - b.position || a.index - b.index,
    );

    const out: PlacedSession[] = [];
    orderedWeeks.forEach((week, ordinal) => {
      // n-ième semaine du programme (1-based) → lundi de référence.
      const weekMonday = addDays(monday, ordinal * 7);
      const objective =
        week.objective ??
        (week.phaseId ? (phaseObjectiveById.get(week.phaseId) ?? null) : null);
      const orderedSessions = [...(week.sessions ?? [])].sort(
        (a, b) => a.dayOfWeek - b.dayOfWeek || a.position - b.position,
      );
      for (const s of orderedSessions) {
        const date = addDays(weekMonday, s.dayOfWeek - 1);
        // Semaine partielle : on n'ignore que des séances de la 1re semaine.
        const skipped = ordinal === 0 && date < startDate;
        out.push({
          weekIndex: week.index,
          dayOfWeek: s.dayOfWeek,
          label: s.label ?? null,
          type: s.type as TrainingType,
          date,
          objective,
          skipped,
          input: this.sessionToEventInput(s, date),
        });
      }
    });
    return out;
  }

  private skippedCount(
    program: TrainingProgramEntity,
    startDate?: string,
  ): number {
    return this.computePlacements(program, startDate).filter((p) => p.skipped)
      .length;
  }

  /** Construit le payload d'évènement à partir d'une séance de programme. */
  private sessionToEventInput(
    s: TrainingProgramSessionEntity,
    date: string,
  ): EventInput {
    const base: EventInput = {
      date,
      type: s.type as TrainingType,
      startTime: s.startTime ?? null,
      durationMin: s.durationMin ?? null,
      feeling: s.feeling ?? null,
    };
    if (s.type === 'cardio') {
      base.zone = (s.zone as CardioZone | null) ?? null;
      base.description = s.description ?? null;
    } else if (s.type === 'autre') {
      // L'évènement « autre » exige un titre : repli sur le label puis défaut.
      base.title = (s.title || s.label || 'Séance').trim();
      base.description = s.description ?? null;
    } else {
      base.exercises = s.exercises ?? [];
    }
    return base;
  }

  // ---------------------------------------------------------------------------
  // Persistance des enfants
  // ---------------------------------------------------------------------------

  private async persistChildren(programId: string, input: ProgramInput) {
    // Phases (référencées par position dans le payload).
    const phaseInputs = Array.isArray(input.phases) ? input.phases : [];
    const phaseIds: string[] = [];
    for (let i = 0; i < phaseInputs.length; i += 1) {
      const ph = phaseInputs[i];
      const name = (ph?.name ?? '').trim();
      if (!name)
        throw new BadRequestException('Chaque phase doit avoir un nom.');
      if (name.length > 60) {
        throw new BadRequestException(
          'Le nom de phase ne peut dépasser 60 caractères.',
        );
      }
      const saved = await this.phases.save(
        this.phases.create({
          programId,
          name,
          objective: this.resolveObjective(ph.objective),
          position: i,
        }),
      );
      phaseIds.push(saved.id);
    }

    // Semaines + séances.
    const weekInputs = Array.isArray(input.weeks) ? input.weeks : [];
    const seenIndex = new Set<number>();
    for (let i = 0; i < weekInputs.length; i += 1) {
      const w = weekInputs[i];
      const index =
        Number.isInteger(w.index) && (w.index as number) >= 1
          ? (w.index as number)
          : i + 1;
      if (seenIndex.has(index)) {
        throw new BadRequestException(
          `Index de semaine en double : S${index}.`,
        );
      }
      seenIndex.add(index);

      let phaseId: string | null = null;
      if (w.phaseIndex !== null && w.phaseIndex !== undefined) {
        if (
          !Number.isInteger(w.phaseIndex) ||
          w.phaseIndex < 0 ||
          w.phaseIndex >= phaseIds.length
        ) {
          throw new BadRequestException(
            'Référence de phase invalide pour une semaine.',
          );
        }
        phaseId = phaseIds[w.phaseIndex];
      }

      const savedWeek = await this.weeks.save(
        this.weeks.create({
          programId,
          phaseId,
          index,
          objective: this.resolveObjective(w.objective),
          isDeload: Boolean(w.isDeload),
          position: i,
        }),
      );

      const sessionInputs = Array.isArray(w.sessions) ? w.sessions : [];
      for (let j = 0; j < sessionInputs.length; j += 1) {
        await this.sessions.save(
          this.buildSession(savedWeek.id, sessionInputs[j], j),
        );
      }
    }
  }

  private buildSession(
    weekId: string,
    s: ProgramSessionInput,
    position: number,
  ) {
    const type = s.type as TrainingType;
    if (!TRAINING_TYPES.includes(type)) {
      throw new BadRequestException('Type de séance de programme invalide.');
    }
    const dow = Number(s.dayOfWeek);
    if (!Number.isInteger(dow) || dow < 1 || dow > 7) {
      throw new BadRequestException(
        'Jour de séance invalide (1 = lundi … 7 = dimanche).',
      );
    }
    if (
      s.startTime !== null &&
      s.startTime !== undefined &&
      !isValidTimeStr(s.startTime)
    ) {
      throw new BadRequestException('Horaire invalide (HH:MM attendu).');
    }

    let zone: CardioZone | null = null;
    let title: string | null = null;
    let description: string | null = null;
    let exercises: ExerciseInput[] | null = null;
    if (type === 'cardio') {
      if (s.zone != null && !CARDIO_ZONES.includes(s.zone)) {
        throw new BadRequestException('Zone cardio invalide (Z1 à Z5).');
      }
      zone = s.zone ?? null;
      description = this.resolveDescription(s.description);
    } else if (type === 'autre') {
      title = (s.title ?? '').trim() || null;
      description = this.resolveDescription(s.description);
    } else {
      exercises = this.resolveExercises(s.exercises);
    }

    const label = (s.label ?? '').trim() || null;
    if (label && label.length > 60) {
      throw new BadRequestException(
        'Le nom de séance ne peut dépasser 60 caractères.',
      );
    }

    return this.sessions.create({
      weekId,
      dayOfWeek: dow,
      position,
      type,
      label,
      startTime: s.startTime ?? null,
      durationMin: this.resolveInt(s.durationMin, 'durationMin'),
      feeling: this.resolveFeeling(s.feeling),
      zone,
      title,
      description,
      exercises,
      sourceTemplateId: s.sourceTemplateId ?? null,
    });
  }

  // ---------------------------------------------------------------------------
  // Réponses
  // ---------------------------------------------------------------------------

  private toResponse(p: TrainingProgramEntity) {
    const phases = [...(p.phases ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((ph) => ({
        id: ph.id,
        name: ph.name,
        objective: ph.objective,
        position: ph.position,
      }));
    const phaseIndexById = new Map(phases.map((ph, i) => [ph.id, i]));

    const weeks = [...(p.weeks ?? [])]
      .sort((a, b) => a.position - b.position || a.index - b.index)
      .map((w) => ({
        id: w.id,
        index: w.index,
        phaseIndex:
          w.phaseId != null ? (phaseIndexById.get(w.phaseId) ?? null) : null,
        objective: w.objective,
        isDeload: w.isDeload,
        sessions: [...(w.sessions ?? [])]
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.position - b.position)
          .map((s) => ({
            id: s.id,
            dayOfWeek: s.dayOfWeek,
            label: s.label,
            type: s.type,
            startTime: s.startTime,
            durationMin: s.durationMin,
            feeling: s.feeling,
            zone: s.zone,
            title: s.title,
            description: s.description,
            exercises: s.exercises ?? [],
            sourceTemplateId: s.sourceTemplateId,
          })),
      }));

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      phases,
      weeks,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private toSummary(p: TrainingProgramEntity) {
    const weeks = p.weeks ?? [];
    const sessions = weeks.reduce((n, w) => n + (w.sessions?.length ?? 0), 0);
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      phaseCount: (p.phases ?? []).length,
      weekCount: weeks.length,
      sessionCount: sessions,
      phaseObjectives: [...(p.phases ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((ph) => ph.name),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers de validation
  // ---------------------------------------------------------------------------

  private async getOrThrow(id: string): Promise<TrainingProgramEntity> {
    const program = await this.programs.findOne({
      where: { id },
      relations: { phases: true, weeks: { sessions: true } },
    });
    if (!program) throw new NotFoundException('Programme introuvable.');
    return program;
  }

  private resolveName(value?: string): string {
    const name = (value ?? '').trim();
    if (!name)
      throw new BadRequestException('Le nom du programme est obligatoire.');
    if (name.length > 80) {
      throw new BadRequestException('Le nom ne peut dépasser 80 caractères.');
    }
    return name;
  }

  private resolveDescription(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const str = String(value).trim();
    return str || null;
  }

  private resolveObjective(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const str = String(value).trim();
    if (str.length > 120) {
      throw new BadRequestException(
        "L'objectif ne peut dépasser 120 caractères.",
      );
    }
    return str || null;
  }

  private resolveInt(value: unknown, field: string): number | null {
    if (value === null || value === undefined) return null;
    if (!Number.isInteger(value) || (value as number) < 0) {
      throw new BadRequestException(`Champ "${field}" invalide.`);
    }
    return value as number;
  }

  private resolveFeeling(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    if (
      !Number.isInteger(value) ||
      (value as number) < 1 ||
      (value as number) > 5
    ) {
      throw new BadRequestException(
        'Le ressenti doit être un entier de 1 à 5.',
      );
    }
    return value as number;
  }

  /** Exercices d'une séance de programme : tolérants (modèle), mais cohérents. */
  private resolveExercises(exercises?: ExerciseInput[]): ExerciseInput[] {
    if (!Array.isArray(exercises)) return [];
    return exercises
      .map((ex) => {
        const name = (ex?.name ?? '').trim();
        if (!name) return null;
        if (name.length > 60) {
          throw new BadRequestException(
            "Le nom d'exercice ne peut dépasser 60 caractères.",
          );
        }
        const sets = (Array.isArray(ex.sets) ? ex.sets : []).map((s) => {
          const reps = Number(s?.reps);
          const weight = Number(s?.weight);
          if (!Number.isInteger(reps) || reps < 0) {
            throw new BadRequestException(
              `Répétitions invalides pour "${name}".`,
            );
          }
          if (!Number.isFinite(weight) || weight < 0) {
            throw new BadRequestException(`Charge invalide pour "${name}".`);
          }
          return { reps, weight };
        });
        return { name, sets };
      })
      .filter((ex): ex is ExerciseInput => ex !== null);
  }

  private normalizeKey(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }
}
