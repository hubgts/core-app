import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { isValidDateStr, isValidTimeStr } from './date.util';
import { TrainingEventEntity } from './entities/training-event.entity';
import { ExerciseEntity } from './entities/exercise.entity';
import { ExerciseSetEntity } from './entities/exercise-set.entity';
import {
  CARDIO_ZONES,
  CardioZone,
  EventInput,
  ExerciseInput,
  PrReached,
  TRAINING_TYPES,
  TrainingType,
} from './types';

interface ResolvedEvent {
  date: string;
  type: TrainingType;
  startTime: string | null;
  durationMin: number | null;
  feeling: number | null;
  zone: CardioZone | null;
  title: string | null;
  description: string | null;
  exercises: ExerciseInput[];
}

@Injectable()
export class TrainingService {
  constructor(
    @InjectRepository(TrainingEventEntity)
    private readonly events: Repository<TrainingEventEntity>,
    @InjectRepository(ExerciseEntity)
    private readonly exercises: Repository<ExerciseEntity>,
    @InjectRepository(ExerciseSetEntity)
    private readonly sets: Repository<ExerciseSetEntity>,
  ) {}

  // ---------------------------------------------------------------------------
  // Lecture
  // ---------------------------------------------------------------------------

  async eventsInRange(from: string, to: string) {
    if (!isValidDateStr(from) || !isValidDateStr(to)) {
      throw new BadRequestException(
        'Paramètres "from" / "to" invalides (YYYY-MM-DD attendu).',
      );
    }
    const rows = await this.events.find({
      where: { date: Between(from, to) },
      relations: { exercises: { sets: true } },
      order: { date: 'ASC', startTime: 'ASC' },
    });
    return rows.map((e) => this.toResponse(e));
  }

  async getEvent(id: string) {
    return this.toResponse(await this.getOrThrow(id));
  }

  /** Autocomplétion : noms d'exercices déjà saisis, filtrés par `q`. */
  async exerciseNames(q?: string): Promise<string[]> {
    const qb = this.exercises
      .createQueryBuilder('e')
      .select('MAX(e.name)', 'name')
      .groupBy('e.name_key')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10);
    if (q && q.trim()) {
      qb.where('e.name_key LIKE :q', { q: `%${this.normalizeKey(q)}%` });
    }
    const rows = await qb.getRawMany<{ name: string }>();
    return rows.map((r) => r.name);
  }

  // ---------------------------------------------------------------------------
  // Écriture
  // ---------------------------------------------------------------------------

  async create(input: EventInput) {
    const data = this.resolve(input, null);
    const event = this.events.create({
      date: data.date,
      type: data.type,
      startTime: data.startTime,
      durationMin: data.durationMin,
      feeling: data.feeling,
      zone: data.zone,
      title: data.title,
      description: data.description,
    });
    const saved = await this.events.save(event);

    let prs: PrReached[] = [];
    if (data.type === 'musculation') {
      prs = await this.computePrs(saved.id, data.exercises);
      await this.persistExercises(saved.id, data.exercises);
    }
    return { event: await this.getEvent(saved.id), prs };
  }

  async update(id: string, input: EventInput) {
    const existing = await this.getOrThrow(id);
    const data = this.resolve(input, existing);

    existing.date = data.date;
    existing.startTime = data.startTime;
    existing.durationMin = data.durationMin;
    existing.feeling = data.feeling;
    existing.zone = data.zone;
    existing.title = data.title;
    existing.description = data.description;
    await this.events.save(existing);

    let prs: PrReached[] = [];
    if (existing.type === 'musculation') {
      prs = await this.computePrs(id, data.exercises);
      await this.exercises.delete({ eventId: id }); // cascade sur les séries
      await this.persistExercises(id, data.exercises);
    }
    return { event: await this.getEvent(id), prs };
  }

  async remove(id: string): Promise<void> {
    await this.getOrThrow(id);
    await this.events.delete(id); // cascade exercices + séries
  }

  // ---------------------------------------------------------------------------
  // Statistiques (agrégats consommés par le Dashboard)
  // ---------------------------------------------------------------------------

  async stats(from: string, to: string) {
    if (!isValidDateStr(from) || !isValidDateStr(to)) {
      throw new BadRequestException(
        'Paramètres "from" / "to" invalides (YYYY-MM-DD attendu).',
      );
    }
    const rows = await this.events.find({
      where: { date: Between(from, to) },
      relations: { exercises: { sets: true } },
      order: { date: 'ASC' },
    });
    const events = rows.map((e) => this.toResponse(e));

    const byType = { musculation: 0, cardio: 0, autre: 0 };
    let durationMin = 0;
    let feelingSum = 0;
    let feelingCount = 0;
    for (const e of events) {
      byType[e.type] += 1;
      if (e.durationMin) durationMin += e.durationMin;
      if (e.feeling != null) {
        feelingSum += e.feeling;
        feelingCount += 1;
      }
    }

    // Musculation
    const tonnageByDate = new Map<string, number>();
    const maxByExercise = new Map<
      string,
      { name: string; maxWeight: number }
    >();
    let totalTonnage = 0;
    for (const e of events.filter((x) => x.type === 'musculation')) {
      totalTonnage += e.tonnage;
      tonnageByDate.set(e.date, (tonnageByDate.get(e.date) ?? 0) + e.tonnage);
      for (const ex of e.exercises) {
        const key = this.normalizeKey(ex.name);
        const max = ex.sets.reduce((m, s) => Math.max(m, s.weight), 0);
        const prev = maxByExercise.get(key);
        if (!prev || max > prev.maxWeight) {
          maxByExercise.set(key, { name: ex.name, maxWeight: max });
        }
      }
    }

    // Cardio
    const timeByZone: Record<string, number> = {
      Z1: 0,
      Z2: 0,
      Z3: 0,
      Z4: 0,
      Z5: 0,
    };
    let cardioSessions = 0;
    let cardioDuration = 0;
    for (const e of events.filter((x) => x.type === 'cardio')) {
      cardioSessions += 1;
      if (e.durationMin) {
        cardioDuration += e.durationMin;
        if (e.zone && timeByZone[e.zone] !== undefined) {
          timeByZone[e.zone] += e.durationMin;
        }
      }
    }

    return {
      overview: {
        sessions: events.length,
        durationMin,
        avgFeeling: feelingCount
          ? Math.round((feelingSum / feelingCount) * 10) / 10
          : null,
        byType,
      },
      musculation: {
        tonnage: totalTonnage,
        tonnageByDate: [...tonnageByDate.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, tonnage]) => ({ date, tonnage })),
        maxByExercise: [...maxByExercise.values()].sort(
          (a, b) => b.maxWeight - a.maxWeight,
        ),
      },
      cardio: {
        sessions: cardioSessions,
        durationMin: cardioDuration,
        timeByZone,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private toResponse(ev: TrainingEventEntity) {
    const exercises = (ev.exercises ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((ex) => ({
        id: ex.id,
        name: ex.name,
        position: ex.position,
        sets: (ex.sets ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((s) => ({
            id: s.id,
            reps: s.reps,
            weight: s.weight,
            position: s.position,
          })),
      }));
    const tonnage = exercises.reduce(
      (t, ex) => t + ex.sets.reduce((st, s) => st + s.reps * s.weight, 0),
      0,
    );
    return {
      id: ev.id,
      date: ev.date,
      type: ev.type,
      startTime: ev.startTime,
      durationMin: ev.durationMin,
      feeling: ev.feeling,
      zone: ev.zone,
      title: ev.title,
      description: ev.description,
      programLabel: ev.programLabel ?? null,
      programObjective: ev.programObjective ?? null,
      createdAt: ev.createdAt,
      updatedAt: ev.updatedAt,
      exercises,
      tonnage,
    };
  }

  /**
   * Crée une séance réelle à partir d'une séance de programme (démarrage). Ne
   * déclenche pas la détection de PR (charges planifiées ≠ réalisées) et fige le
   * snapshot programme. Réutilise `resolve` / `persistExercises`.
   */
  async createForProgram(
    input: EventInput,
    snapshot: { programLabel: string; programObjective: string | null },
  ): Promise<void> {
    const data = this.resolve(input, null);
    const event = this.events.create({
      date: data.date,
      type: data.type,
      startTime: data.startTime,
      durationMin: data.durationMin,
      feeling: data.feeling,
      zone: data.zone,
      title: data.title,
      description: data.description,
      programLabel: snapshot.programLabel,
      programObjective: snapshot.programObjective,
    });
    const saved = await this.events.save(event);
    if (data.type === 'musculation') {
      await this.persistExercises(saved.id, data.exercises);
    }
  }

  /** Clé de consolidation : sans accents, espaces normalisés, minuscule (RG-11). */
  private normalizeKey(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private async persistExercises(eventId: string, exercises: ExerciseInput[]) {
    for (let i = 0; i < exercises.length; i += 1) {
      const ex = exercises[i];
      const savedEx = await this.exercises.save(
        this.exercises.create({
          eventId,
          name: ex.name,
          nameKey: this.normalizeKey(ex.name),
          position: i,
        }),
      );
      const sets = ex.sets.map((s, j) =>
        this.sets.create({
          exerciseId: savedEx.id,
          reps: s.reps,
          weight: s.weight,
          position: j,
        }),
      );
      if (sets.length) await this.sets.save(sets);
    }
  }

  /** Détecte les nouveaux records de charge (PR) par exercice (RG-13). */
  private async computePrs(
    eventId: string,
    exercises: ExerciseInput[],
  ): Promise<PrReached[]> {
    const inputMax = new Map<string, { name: string; weight: number }>();
    for (const ex of exercises) {
      const max = ex.sets.reduce((m, s) => Math.max(m, s.weight), 0);
      const key = this.normalizeKey(ex.name);
      const prev = inputMax.get(key);
      if (!prev || max > prev.weight)
        inputMax.set(key, { name: ex.name, weight: max });
    }

    const prs: PrReached[] = [];
    for (const { name, weight } of inputMax.values()) {
      const prevMax = await this.prevMaxForExercise(name, eventId);
      // PR uniquement s'il existait déjà un historique dépassé (RG-13).
      if (prevMax != null && weight > prevMax) {
        prs.push({ exerciseName: name, weight });
      }
    }
    return prs;
  }

  private async prevMaxForExercise(
    name: string,
    excludeEventId: string,
  ): Promise<number | null> {
    const row = await this.sets
      .createQueryBuilder('s')
      .innerJoin('s.exercise', 'e')
      .select('MAX(s.weight)', 'max')
      .where('e.name_key = :key', { key: this.normalizeKey(name) })
      .andWhere('e.event_id != :excludeEventId', { excludeEventId })
      .getRawOne<{ max: number | null }>();
    return row?.max != null ? Number(row.max) : null;
  }

  private async getOrThrow(id: string): Promise<TrainingEventEntity> {
    const event = await this.events.findOne({
      where: { id },
      relations: { exercises: { sets: true } },
    });
    if (!event) throw new NotFoundException('Séance introuvable.');
    return event;
  }

  /** Valide et normalise l'entrée. `existing` non-null = édition (type immuable). */
  private resolve(
    input: EventInput,
    existing: TrainingEventEntity | null,
  ): ResolvedEvent {
    const type = (existing ? existing.type : input.type) as TrainingType;
    if (!TRAINING_TYPES.includes(type)) {
      throw new BadRequestException('Type de séance invalide.');
    }

    const date = input.date !== undefined ? input.date : existing?.date;
    if (!isValidDateStr(date)) {
      throw new BadRequestException('Date invalide (YYYY-MM-DD attendu).');
    }

    const startTime: string | null =
      input.startTime !== undefined
        ? input.startTime
        : (existing?.startTime ?? null);
    if (startTime !== null) {
      if (!isValidTimeStr(startTime)) {
        throw new BadRequestException('Horaire invalide (HH:MM attendu).');
      }
    }

    const durationMin = this.resolveInt(
      input.durationMin !== undefined
        ? input.durationMin
        : (existing?.durationMin ?? null),
      'durationMin',
      0,
    );

    const feeling = this.resolveFeeling(
      input.feeling !== undefined ? input.feeling : (existing?.feeling ?? null),
    );

    // Champs spécifiques au type (les autres sont neutralisés).
    let zone: CardioZone | null = null;
    let title: string | null = null;
    let description: string | null = null;
    let exercises: ExerciseInput[] = [];

    if (type === 'cardio') {
      const z =
        input.zone !== undefined
          ? input.zone
          : ((existing?.zone as CardioZone | null) ?? null);
      if (z !== null && z !== undefined && !CARDIO_ZONES.includes(z)) {
        throw new BadRequestException('Zone cardio invalide (Z1 à Z5).');
      }
      zone = z ?? null;
      description = this.resolveDescription(input, existing);
    } else if (type === 'autre') {
      const t =
        (input.title !== undefined ? input.title : (existing?.title ?? '')) ??
        '';
      const trimmed = t.trim();
      if (!trimmed) throw new BadRequestException('Le titre est obligatoire.');
      if (trimmed.length > 60) {
        throw new BadRequestException(
          'Le titre ne peut dépasser 60 caractères.',
        );
      }
      title = trimmed;
      description = this.resolveDescription(input, existing);
    } else {
      // musculation
      exercises = this.resolveExercises(input.exercises);
    }

    return {
      date,
      type,
      startTime,
      durationMin,
      feeling,
      zone,
      title,
      description,
      exercises,
    };
  }

  private resolveDescription(
    input: EventInput,
    existing: TrainingEventEntity | null,
  ): string | null {
    const d =
      input.description !== undefined
        ? input.description
        : (existing?.description ?? null);
    if (d === null || d === undefined) return null;
    return String(d);
  }

  private resolveInt(
    value: unknown,
    field: string,
    min: number,
  ): number | null {
    if (value === null || value === undefined) return null;
    if (!Number.isInteger(value) || (value as number) < min) {
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

  private resolveExercises(exercises?: ExerciseInput[]): ExerciseInput[] {
    if (!Array.isArray(exercises) || exercises.length === 0) {
      throw new BadRequestException(
        'Une séance de musculation doit contenir au moins un exercice.',
      );
    }
    return exercises.map((ex) => {
      const name = (ex?.name ?? '').trim();
      if (!name)
        throw new BadRequestException('Chaque exercice doit avoir un nom.');
      if (name.length > 60) {
        throw new BadRequestException(
          "Le nom d'exercice ne peut dépasser 60 caractères.",
        );
      }
      if (!Array.isArray(ex.sets) || ex.sets.length === 0) {
        throw new BadRequestException(
          `L'exercice "${name}" doit contenir au moins une série.`,
        );
      }
      const sets = ex.sets.map((s) => {
        if (!Number.isInteger(s?.reps) || s.reps < 1) {
          throw new BadRequestException(
            `Répétitions invalides pour "${name}" (entier ≥ 1).`,
          );
        }
        const weight = Number(s?.weight);
        if (!Number.isFinite(weight) || weight < 0) {
          throw new BadRequestException(
            `Charge invalide pour "${name}" (≥ 0).`,
          );
        }
        return { reps: s.reps, weight };
      });
      return { name, sets };
    });
  }
}
