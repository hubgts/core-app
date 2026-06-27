import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { addDays, isValidDateStr, mondayOf, todayStr } from './date.util';
import { HabitEntity } from './entities/habit.entity';
import { HabitCheckEntity } from './entities/habit-check.entity';
import { HabitStats } from './types';

const DEFAULT_COLORS = [
  '#4F46E5', '#0EA5E9', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6',
];
/** Paliers de streak : jours pour une habitude quotidienne, semaines sinon. */
const MILESTONES_DAYS = [7, 30, 100, 365];
const MILESTONES_WEEKS = [4, 12, 26, 52];
const NAME_MAX = 40;
const DEFAULT_WEEKLY_TARGET = 7;

@Injectable()
export class HabitsService {
  constructor(
    @InjectRepository(HabitEntity)
    private readonly habits: Repository<HabitEntity>,
    @InjectRepository(HabitCheckEntity)
    private readonly checks: Repository<HabitCheckEntity>,
  ) {}

  // ---------------------------------------------------------------------------
  // Lecture
  // ---------------------------------------------------------------------------

  async listActive(today?: string) {
    const ref = isValidDateStr(today) ? (today as string) : todayStr();
    const habits = await this.habits.find({
      where: { status: 'active' },
      order: { position: 'ASC' },
    });
    if (habits.length === 0) return [];

    const checks = await this.checks.find({
      where: { habitId: In(habits.map((h) => h.id)) },
    });
    const byHabit = new Map<string, Set<string>>();
    for (const c of checks) {
      let set = byHabit.get(c.habitId);
      if (!set) {
        set = new Set();
        byHabit.set(c.habitId, set);
      }
      set.add(c.date);
    }

    return habits.map((h) => {
      const weeklyTarget = this.normalizeTarget(h.weeklyTarget);
      const dates = byHabit.get(h.id) ?? new Set<string>();
      return { ...h, weeklyTarget, stats: this.computeStats(dates, ref, weeklyTarget) };
    });
  }

  async checksInRange(from: string, to: string): Promise<HabitCheckEntity[]> {
    if (!isValidDateStr(from) || !isValidDateStr(to)) {
      throw new BadRequestException('Paramètres "from" / "to" invalides (YYYY-MM-DD attendu).');
    }
    return this.checks.find({
      where: { date: Between(from, to) },
      order: { date: 'ASC' },
    });
  }

  // ---------------------------------------------------------------------------
  // CRUD habitudes
  // ---------------------------------------------------------------------------

  async create(input: {
    name?: string;
    weeklyTarget?: number;
    color?: string;
    icon?: string;
  }): Promise<HabitEntity> {
    const name = this.validateName(input.name);
    await this.assertNameUnique(name, null);

    const maxPos = await this.maxPosition();
    const habit = this.habits.create({
      name,
      weeklyTarget: this.validateTarget(input.weeklyTarget),
      color: input.color || DEFAULT_COLORS[(maxPos + 1) % DEFAULT_COLORS.length],
      icon: (input.icon || '').slice(0, 8),
      position: maxPos + 1,
      status: 'active',
      archivedAt: null,
    });
    return this.habits.save(habit);
  }

  async update(
    id: string,
    input: { name?: string; weeklyTarget?: number; color?: string; icon?: string },
  ): Promise<HabitEntity> {
    const habit = await this.getOrThrow(id);
    if (input.name !== undefined) {
      const name = this.validateName(input.name);
      await this.assertNameUnique(name, id);
      habit.name = name;
    }
    if (input.weeklyTarget !== undefined) {
      habit.weeklyTarget = this.validateTarget(input.weeklyTarget);
    }
    if (input.color !== undefined) habit.color = input.color;
    if (input.icon !== undefined) habit.icon = input.icon.slice(0, 8);
    return this.habits.save(habit);
  }

  async archive(id: string): Promise<HabitEntity> {
    const habit = await this.getOrThrow(id);
    habit.status = 'archived';
    habit.archivedAt = new Date();
    return this.habits.save(habit);
  }

  async unarchive(id: string): Promise<HabitEntity> {
    const habit = await this.getOrThrow(id);
    habit.status = 'active';
    habit.archivedAt = null;
    return this.habits.save(habit);
  }

  async remove(id: string): Promise<void> {
    await this.getOrThrow(id);
    // Les coches sont supprimées en cascade (FK ON DELETE CASCADE).
    await this.habits.delete(id);
  }

  async reorder(ids: string[]) {
    if (!Array.isArray(ids)) {
      throw new BadRequestException('Le corps doit contenir un tableau "ids".');
    }
    await Promise.all(
      ids.map((id, index) => this.habits.update(id, { position: index })),
    );
    return this.listActive();
  }

  // ---------------------------------------------------------------------------
  // Coches (toggle)
  // ---------------------------------------------------------------------------

  async setCheck(
    habitId: string,
    date: string,
    checked: boolean,
    today?: string,
  ): Promise<HabitStats> {
    const habit = await this.getOrThrow(habitId);
    if (!isValidDateStr(date)) {
      throw new BadRequestException('Date invalide (YYYY-MM-DD attendu).');
    }
    const existing = await this.checks.findOne({ where: { habitId, date } });
    if (checked && !existing) {
      await this.checks.save(this.checks.create({ habitId, date }));
    } else if (!checked && existing) {
      await this.checks.delete(existing.id);
    }

    const ref = isValidDateStr(today) ? (today as string) : todayStr();
    const rows = await this.checks.find({ where: { habitId } });
    const dates = new Set(rows.map((c) => c.date));
    return this.computeStats(dates, ref, this.normalizeTarget(habit.weeklyTarget));
  }

  // ---------------------------------------------------------------------------
  // Calculs (streak / paliers)
  // ---------------------------------------------------------------------------

  /** Paliers franchis par la série en cours, selon l'unité du streak. */
  milestonesForStreak(streak: number, unit: 'days' | 'weeks' = 'days'): number[] {
    const milestones = unit === 'weeks' ? MILESTONES_WEEKS : MILESTONES_DAYS;
    return milestones.filter((m) => streak >= m);
  }

  private computeStats(
    dates: Set<string>,
    today: string,
    weeklyTarget: number,
  ): HabitStats {
    const totalChecks = dates.size;

    // Avancement de la semaine courante (commun aux deux modes).
    const weekStart = mondayOf(today);
    let weekDone = 0;
    for (let i = 0; i < 7; i += 1) {
      if (dates.has(addDays(weekStart, i))) weekDone += 1;
    }

    const base =
      weeklyTarget >= 7
        ? this.dailyStats(dates, today, totalChecks)
        : this.weeklyStats(dates, today, weeklyTarget, totalChecks);
    return { ...base, weekDone };
  }

  /** Streak quotidien : jours consécutifs cochés. */
  private dailyStats(
    dates: Set<string>,
    today: string,
    totalChecks: number,
  ): Omit<HabitStats, 'weekDone'> {
    // Tolérance « aujourd'hui pas encore fait » : si aujourd'hui n'est pas
    // coché, on prend hier comme point de départ.
    let ref = dates.has(today) ? today : addDays(today, -1);
    let currentStreak = 0;
    while (dates.has(ref)) {
      currentStreak += 1;
      ref = addDays(ref, -1);
    }

    const sorted = [...dates].sort();
    let bestStreak = 0;
    let run = 0;
    let prev: string | null = null;
    for (const d of sorted) {
      run = prev && addDays(prev, 1) === d ? run + 1 : 1;
      if (run > bestStreak) bestStreak = run;
      prev = d;
    }

    return { currentStreak, bestStreak, totalChecks, streakUnit: 'days' };
  }

  /** Streak hebdomadaire : semaines consécutives où l'objectif est atteint. */
  private weeklyStats(
    dates: Set<string>,
    today: string,
    weeklyTarget: number,
    totalChecks: number,
  ): Omit<HabitStats, 'weekDone'> {
    // Nombre de coches par semaine ISO (clé = lundi de la semaine).
    const perWeek = new Map<string, number>();
    for (const d of dates) {
      const mon = mondayOf(d);
      perWeek.set(mon, (perWeek.get(mon) ?? 0) + 1);
    }
    const meets = (mon: string) => (perWeek.get(mon) ?? 0) >= weeklyTarget;

    // Série en cours : la semaine courante ne casse pas le streak tant qu'elle
    // n'est pas finie ; elle ne le prolonge que si l'objectif y est déjà atteint.
    const currentMon = mondayOf(today);
    let ref = meets(currentMon) ? currentMon : addDays(currentMon, -7);
    let currentStreak = 0;
    while (meets(ref)) {
      currentStreak += 1;
      ref = addDays(ref, -7);
    }

    // Record : plus longue suite de semaines consécutives ayant atteint l'objectif.
    const sortedWeeks = [...perWeek.keys()].filter(meets).sort();
    let bestStreak = 0;
    let run = 0;
    let prev: string | null = null;
    for (const w of sortedWeeks) {
      run = prev && addDays(prev, 7) === w ? run + 1 : 1;
      if (run > bestStreak) bestStreak = run;
      prev = w;
    }

    return { currentStreak, bestStreak, totalChecks, streakUnit: 'weeks' };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async maxPosition(): Promise<number> {
    const row = await this.habits
      .createQueryBuilder('h')
      .select('MAX(h.position)', 'max')
      .getRawOne<{ max: number | null }>();
    return row?.max ?? -1;
  }

  private async getOrThrow(id: string): Promise<HabitEntity> {
    const habit = await this.habits.findOne({ where: { id } });
    if (!habit) throw new NotFoundException('Habitude introuvable.');
    return habit;
  }

  private validateName(name?: string): string {
    const trimmed = (name ?? '').trim();
    if (!trimmed) throw new BadRequestException('Le nom est obligatoire.');
    if (trimmed.length > NAME_MAX) {
      throw new BadRequestException(`Le nom ne peut dépasser ${NAME_MAX} caractères.`);
    }
    return trimmed;
  }

  /** Valide un objectif hebdo fourni par le client (1 à 7, défaut 7). */
  private validateTarget(target?: number): number {
    if (target === undefined || target === null) return DEFAULT_WEEKLY_TARGET;
    if (!Number.isInteger(target) || target < 1 || target > 7) {
      throw new BadRequestException(
        "L'objectif hebdomadaire doit être un entier de 1 à 7.",
      );
    }
    return target;
  }

  /** Normalise les habitudes existantes sans objectif (rétrocompat). */
  private normalizeTarget(target?: number): number {
    return Number.isInteger(target) && target! >= 1 && target! <= 7
      ? (target as number)
      : DEFAULT_WEEKLY_TARGET;
  }

  private async assertNameUnique(name: string, exceptId: string | null): Promise<void> {
    const qb = this.habits
      .createQueryBuilder('h')
      .where('h.status = :status', { status: 'active' })
      .andWhere('LOWER(h.name) = LOWER(:name)', { name });
    if (exceptId) qb.andWhere('h.id != :exceptId', { exceptId });
    const dup = await qb.getOne();
    if (dup) {
      throw new BadRequestException('Une habitude porte déjà ce nom.');
    }
  }
}
