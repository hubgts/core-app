import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { TrainingTemplateEntity } from './entities/training-template.entity';
import {
  CARDIO_ZONES,
  CardioZone,
  ExerciseInput,
  TRAINING_TYPES,
  TemplateInput,
  TrainingType,
} from './types';

interface ResolvedTemplate {
  name: string;
  type: TrainingType;
  tags: string[];
  durationMin: number | null;
  feeling: number | null;
  zone: CardioZone | null;
  title: string | null;
  description: string | null;
  exercises: ExerciseInput[] | null;
}

@Injectable()
export class TrainingTemplateService {
  constructor(
    @InjectRepository(TrainingTemplateEntity)
    private readonly templates: Repository<TrainingTemplateEntity>,
  ) {}

  async list(q?: string, type?: string) {
    const where: Record<string, unknown> = {};
    if (type && TRAINING_TYPES.includes(type as TrainingType)) {
      where.type = type;
    }
    const rows = await this.templates.find({
      where: q && q.trim() ? { ...where, name: ILike(`%${q.trim()}%`) } : where,
      order: { name: 'ASC' },
    });
    return rows.map((t) => this.toResponse(t));
  }

  async get(id: string) {
    return this.toResponse(await this.getOrThrow(id));
  }

  async create(input: TemplateInput) {
    const data = this.resolve(input, null);
    const tpl = this.templates.create({
      name: data.name,
      nameKey: this.normalizeKey(data.name),
      type: data.type,
      tags: data.tags,
      durationMin: data.durationMin,
      feeling: data.feeling,
      zone: data.zone,
      title: data.title,
      description: data.description,
      exercises: data.exercises,
    });
    const saved = await this.templates.save(tpl);
    return this.get(saved.id);
  }

  async update(id: string, input: TemplateInput) {
    const existing = await this.getOrThrow(id);
    const data = this.resolve(input, existing);
    existing.name = data.name;
    existing.nameKey = this.normalizeKey(data.name);
    existing.tags = data.tags;
    existing.durationMin = data.durationMin;
    existing.feeling = data.feeling;
    existing.zone = data.zone;
    existing.title = data.title;
    existing.description = data.description;
    existing.exercises = data.exercises;
    await this.templates.save(existing);
    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    await this.getOrThrow(id);
    await this.templates.delete(id);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private toResponse(t: TrainingTemplateEntity) {
    return {
      id: t.id,
      name: t.name,
      type: t.type,
      tags: t.tags ?? [],
      durationMin: t.durationMin,
      feeling: t.feeling,
      zone: t.zone,
      title: t.title,
      description: t.description,
      exercises: t.exercises ?? [],
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  private normalizeKey(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private async getOrThrow(id: string): Promise<TrainingTemplateEntity> {
    const tpl = await this.templates.findOne({ where: { id } });
    if (!tpl) throw new NotFoundException('Template introuvable.');
    return tpl;
  }

  private resolve(
    input: TemplateInput,
    existing: TrainingTemplateEntity | null,
  ): ResolvedTemplate {
    const type = (existing ? existing.type : input.type) as TrainingType;
    if (!TRAINING_TYPES.includes(type)) {
      throw new BadRequestException('Type de template invalide.');
    }

    const rawName =
      (input.name !== undefined ? input.name : (existing?.name ?? '')) ?? '';
    const name = rawName.trim();
    if (!name)
      throw new BadRequestException('Le nom du template est obligatoire.');
    if (name.length > 80) {
      throw new BadRequestException('Le nom ne peut dépasser 80 caractères.');
    }

    const tags = this.resolveTags(
      input.tags !== undefined ? input.tags : (existing?.tags ?? []),
    );

    const durationMin = this.resolveInt(
      input.durationMin !== undefined
        ? input.durationMin
        : (existing?.durationMin ?? null),
      'durationMin',
    );

    const feeling = this.resolveFeeling(
      input.feeling !== undefined ? input.feeling : (existing?.feeling ?? null),
    );

    let zone: CardioZone | null = null;
    let title: string | null = null;
    let description: string | null = null;
    let exercises: ExerciseInput[] | null = null;

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
      if (trimmed.length > 60) {
        throw new BadRequestException(
          'Le titre ne peut dépasser 60 caractères.',
        );
      }
      title = trimmed || null;
      description = this.resolveDescription(input, existing);
    } else {
      // musculation
      exercises = this.resolveExercises(
        input.exercises !== undefined
          ? input.exercises
          : (existing?.exercises ?? []),
      );
    }

    return {
      name,
      type,
      tags,
      durationMin,
      feeling,
      zone,
      title,
      description,
      exercises,
    };
  }

  private resolveTags(value: unknown): string[] {
    if (value === null || value === undefined) return [];
    if (!Array.isArray(value)) {
      throw new BadRequestException('Les étiquettes doivent être une liste.');
    }
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of value) {
      const tag = String(raw ?? '').trim();
      if (!tag) continue;
      if (tag.length > 40) {
        throw new BadRequestException(
          'Une étiquette ne peut dépasser 40 caractères.',
        );
      }
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(tag);
    }
    if (out.length > 20) {
      throw new BadRequestException('20 étiquettes maximum.');
    }
    return out;
  }

  private resolveDescription(
    input: TemplateInput,
    existing: TrainingTemplateEntity | null,
  ): string | null {
    const d =
      input.description !== undefined
        ? input.description
        : (existing?.description ?? null);
    if (d === null || d === undefined) return null;
    const str = String(d).trim();
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

  /** Exercices d'un template : tolérants (préréglage), mais cohérents. */
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
}
