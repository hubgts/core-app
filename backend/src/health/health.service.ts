import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  addDays,
  daysBetween,
  isValidDateStr,
  todayStr,
} from '../common/date.util';
import { round1 } from '../common/round.util';
import { BodyMeasurementEntity } from './entities/body-measurement.entity';
import { MeasurementValueEntity } from './entities/measurement-value.entity';
import { HealthProfileEntity, Sex } from './entities/health-profile.entity';
import { HealthGoalEntity } from './entities/health-goal.entity';
import {
  GoalDto,
  GoalInput,
  HealthKpis,
  HealthOverview,
  KNOWN_METRICS,
  MeasurementDto,
  MeasurementInput,
  ProfileInput,
  SeriesPoint,
} from './types';
import {
  computeTrend,
  DatedValue,
  projectEta,
  slopePerDay,
  TrendPoint,
  trendAt,
} from './trend.util';

const PROFILE_ID = 'me';
const NOTE_MAX = 200;
const WEIGHT_MIN = 20;
const WEIGHT_MAX = 500;
const CM_MAX = 400;

const num = (v: unknown): number => Number(v);

@Injectable()
export class HealthService {
  constructor(
    @InjectRepository(BodyMeasurementEntity)
    private readonly measurements: Repository<BodyMeasurementEntity>,
    @InjectRepository(MeasurementValueEntity)
    private readonly values: Repository<MeasurementValueEntity>,
    @InjectRepository(HealthProfileEntity)
    private readonly profiles: Repository<HealthProfileEntity>,
    @InjectRepository(HealthGoalEntity)
    private readonly goals: Repository<HealthGoalEntity>,
  ) {}

  // ---------------------------------------------------------------------------
  // Lecture — vue d'ensemble (tout ce dont la page a besoin)
  // ---------------------------------------------------------------------------

  async overview(today?: string): Promise<HealthOverview> {
    const ref = isValidDateStr(today) ? (today as string) : todayStr();
    const profile = await this.getProfile();
    const rows = await this.measurements.find({ order: { date: 'ASC' } });

    // Mensurations rattachées, groupées par mesure.
    const valueRows = rows.length
      ? await this.values.find({
          where: { measurementId: In(rows.map((r) => r.id)) },
        })
      : [];
    const valuesByMeasure = new Map<string, Record<string, number>>();
    for (const v of valueRows) {
      const m = valuesByMeasure.get(v.measurementId) ?? {};
      m[v.metricKey] = round1(num(v.valueCm));
      valuesByMeasure.set(v.measurementId, m);
    }

    const measurements: MeasurementDto[] = rows.map((r) => ({
      id: r.id,
      date: r.date,
      weightKg: r.weightKg == null ? null : round1(num(r.weightKg)),
      note: r.note,
      values: valuesByMeasure.get(r.id) ?? {},
    }));

    // Séries (poids + chaque métrique suivie), avec tendance lissée.
    const series: Record<string, SeriesPoint[]> = {};
    const weightPoints: DatedValue[] = measurements
      .filter((m) => m.weightKg != null)
      .map((m) => ({ date: m.date, value: m.weightKg as number }));
    const weightTrend = computeTrend(weightPoints);
    series.weight = weightTrend;

    const trackedMetrics = profile.metrics.length ? profile.metrics : [];
    for (const key of trackedMetrics) {
      const pts: DatedValue[] = measurements
        .filter((m) => m.values[key] != null)
        .map((m) => ({ date: m.date, value: m.values[key] }));
      series[key] = computeTrend(pts);
    }

    const goal = await this.computeGoal(weightTrend, ref);
    const kpis = this.computeKpis(weightTrend, profile.heightCm, ref);

    // Dernière valeur + Δ vs avant-dernière, par métrique de mensuration.
    const metricSummary: HealthOverview['metricSummary'] = {};
    for (const key of trackedMetrics) {
      const pts = series[key];
      const last = pts.length ? pts[pts.length - 1] : null;
      const prev = pts.length > 1 ? pts[pts.length - 2] : null;
      metricSummary[key] = {
        last: last ? last.value : null,
        lastDate: last ? last.date : null,
        delta: last && prev ? round1(last.value - prev.value) : null,
      };
    }

    return {
      profile: {
        heightCm:
          profile.heightCm == null ? null : round1(num(profile.heightCm)),
        sex: profile.sex,
        metrics: profile.metrics,
      },
      measurements,
      series,
      goal,
      kpis,
      metricSummary,
    };
  }

  // ---------------------------------------------------------------------------
  // Mesures (upsert par date)
  // ---------------------------------------------------------------------------

  /** Crée ou écrase (upsert) la mesure du jour `date` (RG-01). */
  async setMeasurement(
    date: string,
    input: MeasurementInput,
    today?: string,
  ): Promise<HealthOverview> {
    if (!isValidDateStr(date)) {
      throw new BadRequestException('Date invalide (YYYY-MM-DD attendu).');
    }
    const ref = isValidDateStr(today) ? (today as string) : todayStr();
    if (date > ref) {
      throw new BadRequestException(
        'Une mesure ne peut pas être dans le futur.',
      );
    }

    const weightKg = this.validateWeight(input.weightKg);
    const cleanValues = this.validateValues(input.values);
    // RG-02 : au moins une valeur (poids ou une mensuration).
    if (weightKg == null && cleanValues.length === 0) {
      throw new BadRequestException(
        'Renseignez au moins le poids ou une mensuration.',
      );
    }

    let measure = await this.measurements.findOne({ where: { date } });
    if (!measure) {
      measure = this.measurements.create({ date });
    }
    measure.weightKg = weightKg;
    measure.note = this.normalizeNote(input.note);
    measure = await this.measurements.save(measure);

    // Remplace l'ensemble des mensurations de ce jour (les champs vidés
    // disparaissent ; les autres jours ne sont pas touchés).
    await this.values.delete({ measurementId: measure.id });
    if (cleanValues.length > 0) {
      await this.values.save(
        cleanValues.map((v) =>
          this.values.create({
            measurementId: measure.id,
            metricKey: v.key,
            valueCm: v.value,
          }),
        ),
      );
    }

    return this.overview(ref);
  }

  async removeMeasurement(id: string, today?: string): Promise<HealthOverview> {
    const measure = await this.measurements.findOne({ where: { id } });
    if (!measure) throw new NotFoundException('Mesure introuvable.');
    await this.measurements.delete(id); // mensurations en cascade
    return this.overview(today);
  }

  // ---------------------------------------------------------------------------
  // Profil
  // ---------------------------------------------------------------------------

  async updateProfile(
    input: ProfileInput,
    today?: string,
  ): Promise<HealthOverview> {
    const profile = await this.getProfile();
    if (input.heightCm !== undefined) {
      profile.heightCm = this.validateHeight(input.heightCm);
    }
    if (input.sex !== undefined) {
      profile.sex = this.validateSex(input.sex);
    }
    if (input.metrics !== undefined) {
      profile.metrics = this.validateMetrics(input.metrics);
    }
    await this.profiles.save(profile);
    return this.overview(today);
  }

  // ---------------------------------------------------------------------------
  // Objectif (au plus un actif)
  // ---------------------------------------------------------------------------

  async setGoal(input: GoalInput, today?: string): Promise<HealthOverview> {
    const target = num(input.targetWeightKg);
    if (
      !Number.isFinite(target) ||
      target < WEIGHT_MIN ||
      target > WEIGHT_MAX
    ) {
      throw new BadRequestException('Poids cible invalide.');
    }
    const ref = isValidDateStr(today) ? (today as string) : todayStr();

    let targetDate: string | null = null;
    if (input.targetDate) {
      if (!isValidDateStr(input.targetDate)) {
        throw new BadRequestException('Date cible invalide.');
      }
      if (input.targetDate <= ref) {
        throw new BadRequestException("L'échéance doit être dans le futur.");
      }
      targetDate = input.targetDate;
    }

    // `startedAt` : valeur fournie, sinon 1ʳᵉ mesure de poids, sinon aujourd'hui.
    let startedAt = ref;
    if (input.startedAt && isValidDateStr(input.startedAt)) {
      startedAt = input.startedAt;
    } else {
      const first = await this.measurements.findOne({
        where: {},
        order: { date: 'ASC' },
      });
      if (first) startedAt = first.date;
    }

    // Un seul actif : archive les précédents (RG-07).
    await this.goals.update({ status: 'active' }, { status: 'archived' });
    await this.goals.save(
      this.goals.create({
        targetWeightKg: round1(target),
        targetDate,
        startedAt,
        status: 'active',
      }),
    );
    return this.overview(ref);
  }

  async clearGoal(today?: string): Promise<HealthOverview> {
    await this.goals.update({ status: 'active' }, { status: 'archived' });
    return this.overview(today);
  }

  // ---------------------------------------------------------------------------
  // Calculs dérivés
  // ---------------------------------------------------------------------------

  private computeKpis(
    weightTrend: TrendPoint[],
    heightCm: number | null,
    ref: string,
  ): HealthKpis {
    if (weightTrend.length === 0) {
      return {
        currentWeightKg: null,
        lastRawWeightKg: null,
        delta7Kg: null,
        delta30Kg: null,
        deltaTotalKg: null,
        bmi: null,
        bmiLabel: null,
      };
    }
    const last = weightTrend[weightTrend.length - 1];
    const current = last.trend; // RG-03 : la tendance, pas le brut.
    const at7 = trendAt(weightTrend, addDays(last.date, -7));
    const at30 = trendAt(weightTrend, addDays(last.date, -30));
    const first = weightTrend[0];

    let bmi: number | null = null;
    let bmiLabel: string | null = null;
    const h = heightCm != null ? num(heightCm) : null;
    if (h && h > 0) {
      const m = h / 100;
      bmi = Math.round((current / (m * m)) * 10) / 10;
      bmiLabel = this.bmiLabel(bmi);
    }

    return {
      currentWeightKg: current,
      lastRawWeightKg: last.value,
      delta7Kg: at7 != null ? round1(current - at7) : null,
      delta30Kg: at30 != null ? round1(current - at30) : null,
      deltaTotalKg:
        weightTrend.length > 1 ? round1(current - first.trend) : null,
      bmi,
      bmiLabel,
    };
  }

  private async computeGoal(
    weightTrend: TrendPoint[],
    ref: string,
  ): Promise<GoalDto | null> {
    const goal = await this.goals.findOne({ where: { status: 'active' } });
    if (!goal) return null;

    const target = round1(num(goal.targetWeightKg));
    const current =
      weightTrend.length > 0 ? weightTrend[weightTrend.length - 1].trend : null;
    const startWeight = trendAt(weightTrend, goal.startedAt);
    const direction: 'loss' | 'gain' =
      startWeight != null && target < startWeight ? 'loss' : 'gain';

    let progress: number | null = null;
    let remainingKg: number | null = null;
    if (current != null && startWeight != null && startWeight !== target) {
      progress = Math.max(
        0,
        Math.min(1, (startWeight - current) / (startWeight - target)),
      );
      remainingKg = round1(Math.abs(target - current));
    }

    const slopeDay = slopePerDay(weightTrend, goal.startedAt);
    const weeklyRateKg = slopeDay != null ? round1(slopeDay * 7) : null;

    // Statut « atteint » : la tendance a franchi la cible dans le bon sens.
    const reached =
      current != null &&
      startWeight != null &&
      ((direction === 'loss' && current <= target) ||
        (direction === 'gain' && current >= target));

    let eta: string | null = null;
    let paceStatus: GoalDto['paceStatus'] = 'no_pace';
    let requiredWeeklyKg: number | null = null;

    if (reached) {
      paceStatus = 'reached';
      progress = 1;
      remainingKg = 0;
    } else if (current != null) {
      eta = projectEta(current, target, slopeDay, ref);
      if (eta == null) {
        paceStatus = 'no_pace';
      } else if (goal.targetDate) {
        if (eta <= goal.targetDate) {
          paceStatus = 'on_track';
        } else {
          paceStatus = 'behind';
          const weeksLeft = Math.max(
            daysBetween(ref, goal.targetDate) / 7,
            0.1,
          );
          requiredWeeklyKg = round1(Math.abs(target - current) / weeksLeft);
        }
      } else {
        paceStatus = 'on_track';
      }
    }

    // Persiste le passage en `reached` (feedback côté client, RG-07).
    if (reached && goal.status !== 'reached') {
      goal.status = 'reached';
      await this.goals.save(goal);
    }

    return {
      id: goal.id,
      targetWeightKg: target,
      targetDate: goal.targetDate,
      startedAt: goal.startedAt,
      status: goal.status,
      direction,
      startWeightKg: startWeight,
      progress,
      weeklyRateKg,
      remainingKg,
      eta,
      paceStatus,
      requiredWeeklyKg,
    };
  }

  private bmiLabel(bmi: number): string {
    // Libellés neutres, purement informatifs (jamais bloquants, RG-06).
    if (bmi < 18.5) return 'maigreur';
    if (bmi < 25) return 'corpulence normale';
    if (bmi < 30) return 'surpoids';
    return 'obésité';
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async getProfile(): Promise<HealthProfileEntity> {
    let profile = await this.profiles.findOne({ where: { id: PROFILE_ID } });
    if (!profile) {
      profile = await this.profiles.save(
        this.profiles.create({
          id: PROFILE_ID,
          heightCm: null,
          sex: null,
          // Défaut musculation : torse, biceps, cuisse, épaules.
          metrics: ['shoulders', 'chest', 'arm', 'thigh'],
        }),
      );
    }
    return profile;
  }

  private validateWeight(value?: number | null): number | null {
    if (value === null || value === undefined || (value as unknown) === '') {
      return null;
    }
    const w = num(value);
    if (!Number.isFinite(w) || w < WEIGHT_MIN || w > WEIGHT_MAX) {
      throw new BadRequestException(
        `Le poids doit être compris entre ${WEIGHT_MIN} et ${WEIGHT_MAX} kg.`,
      );
    }
    return round1(w);
  }

  private validateValues(
    values?: Record<string, number | null>,
  ): { key: string; value: number }[] {
    if (!values) return [];
    const out: { key: string; value: number }[] = [];
    for (const [key, raw] of Object.entries(values)) {
      if (raw === null || raw === undefined || (raw as unknown) === '')
        continue;
      if (!(KNOWN_METRICS as readonly string[]).includes(key)) {
        throw new BadRequestException(`Mensuration inconnue : ${key}.`);
      }
      const v = num(raw);
      if (!Number.isFinite(v) || v <= 0 || v > CM_MAX) {
        throw new BadRequestException(`Valeur invalide pour ${key} (cm).`);
      }
      out.push({ key, value: round1(v) });
    }
    return out;
  }

  private validateHeight(value?: number | null): number | null {
    if (value === null || value === undefined || (value as unknown) === '') {
      return null;
    }
    const h = num(value);
    if (!Number.isFinite(h) || h < 80 || h > 260) {
      throw new BadRequestException('Taille invalide (80–260 cm).');
    }
    return round1(h);
  }

  private validateSex(value?: Sex | null): Sex | null {
    if (value === null || value === undefined || (value as unknown) === '') {
      return null;
    }
    if (value !== 'f' && value !== 'm') {
      throw new BadRequestException('Sexe invalide.');
    }
    return value;
  }

  private validateMetrics(metrics: string[]): string[] {
    if (!Array.isArray(metrics)) {
      throw new BadRequestException('metrics doit être un tableau.');
    }
    const seen = new Set<string>();
    for (const m of metrics) {
      if (!(KNOWN_METRICS as readonly string[]).includes(m)) {
        throw new BadRequestException(`Mensuration inconnue : ${m}.`);
      }
      seen.add(m);
    }
    // Conserve l'ordre canonique des métriques connues.
    return KNOWN_METRICS.filter((m) => seen.has(m));
  }

  private normalizeNote(note?: string | null): string | null {
    if (note === null || note === undefined) return null;
    const trimmed = String(note).trim();
    return trimmed ? trimmed.slice(0, NOTE_MAX) : null;
  }
}
