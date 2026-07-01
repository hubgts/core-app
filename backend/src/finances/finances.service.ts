import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { applyReorder } from '../common/reorder.util';
import { In, Repository } from 'typeorm';
import {
  addDays,
  addMonthsYM,
  daysBetween,
  isValidDateStr,
  lastDayOfMonth,
  todayStr,
} from '../common/date.util';
import { round2 } from '../common/round.util';
import { EnvelopeEntity } from './entities/envelope.entity';
import { SnapshotEntity } from './entities/snapshot.entity';
import { FinancesSettingsEntity } from './entities/finances-settings.entity';
import {
  BulkSnapshotInput,
  ENVELOPE_TYPES,
  EnvelopeInput,
  EnvelopeType,
  natureOf,
  SettingsInput,
  SnapshotInput,
} from './types';

const NAME_MAX = 60;
const DEFAULT_COLORS: Record<EnvelopeType, string> = {
  especes: '#10B981',
  compte_courant: '#0EA5E9',
  epargne: '#8B5CF6',
  investissement: '#F59E0B',
  dette: '#EF4444',
};
/** Un relevé plus vieux que ce seuil (jours) est considéré « à actualiser » (#2). */
const STALE_AFTER_DAYS = 31;
/** Singleton des réglages Finances. */
const SETTINGS_ID = 'me';

type PaceStatus = 'on_track' | 'behind' | 'reached' | 'no_pace';

/**
 * Pente (€/jour) d'une série de relevés/points sur une fenêtre récente, par régression
 * linéaire simple (moindres carrés). `points` = [{ date, value }] (ordre indifférent).
 * Renvoie `null` si moins de 2 points exploitables sur la fenêtre.
 */
function slopePerDay(
  points: { date: string; value: number }[],
  ref: string,
  windowDays = 365,
): number | null {
  const since = addDays(ref, -windowDays);
  const pts = points
    .filter((p) => p.date >= since)
    .map((p) => ({ x: daysBetween(since, p.date), y: p.value }));
  if (pts.length < 2) return null;
  const n = pts.length;
  const sx = pts.reduce((s, p) => s + p.x, 0);
  const sy = pts.reduce((s, p) => s + p.y, 0);
  const sxx = pts.reduce((s, p) => s + p.x * p.x, 0);
  const sxy = pts.reduce((s, p) => s + p.x * p.y, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  return (n * sxy - sx * sy) / denom;
}

/**
 * Projection d'un objectif depuis une pente €/jour : date estimée d'atteinte (`eta`),
 * statut de rythme et apport mensuel requis pour tenir l'échéance (si « en retard »).
 */
function projectTarget(
  slope: number | null,
  current: number,
  target: number,
  targetDate: string | null,
  ref: string,
): {
  eta: string | null;
  paceStatus: PaceStatus;
  requiredMonthly: number | null;
} {
  if (current >= target) {
    return { eta: null, paceStatus: 'reached', requiredMonthly: null };
  }
  const remaining = target - current;
  if (slope == null || slope <= 0) {
    return { eta: null, paceStatus: 'no_pace', requiredMonthly: null };
  }
  const eta = addDays(ref, Math.ceil(remaining / slope));
  if (!targetDate) {
    return { eta, paceStatus: 'on_track', requiredMonthly: null };
  }
  if (eta <= targetDate) {
    return { eta, paceStatus: 'on_track', requiredMonthly: null };
  }
  const monthsLeft = Math.max(daysBetween(ref, targetDate) / 30, 0.1);
  return {
    eta,
    paceStatus: 'behind',
    requiredMonthly: round2(remaining / monthsLeft),
  };
}

@Injectable()
export class FinancesService {
  constructor(
    @InjectRepository(EnvelopeEntity)
    private readonly envelopes: Repository<EnvelopeEntity>,
    @InjectRepository(SnapshotEntity)
    private readonly snapshots: Repository<SnapshotEntity>,
    @InjectRepository(FinancesSettingsEntity)
    private readonly settings: Repository<FinancesSettingsEntity>,
  ) {}

  // ---------------------------------------------------------------------------
  // Lecture
  // ---------------------------------------------------------------------------

  /** Enveloppes (actives par défaut) décorées de leur solde courant et stats. */
  async listEnvelopes(includeArchived = false) {
    const where = includeArchived ? {} : { status: 'active' as const };
    const envelopes = await this.envelopes.find({
      where,
      order: { position: 'ASC' },
    });
    if (envelopes.length === 0) return [];

    const byEnvelope = await this.snapshotsByEnvelope(
      envelopes.map((e) => e.id),
    );
    return envelopes.map((e) => this.decorate(e, byEnvelope.get(e.id) ?? []));
  }

  /** Détail d'une enveloppe : stats + historique daté avec variation pas à pas. */
  async getEnvelope(id: string) {
    const envelope = await this.getOrThrow(id);
    const snaps = await this.snapshots.find({
      where: { envelopeId: id },
      order: { date: 'ASC', createdAt: 'ASC' },
    });
    // `decorate` attend les relevés du plus récent au plus ancien.
    const decorated = this.decorate(envelope, [...snaps].reverse());

    // Historique enrichi de la variation vs. relevé précédent.
    const history = snaps.map((s, i) => {
      const prev = i > 0 ? snaps[i - 1] : null;
      return {
        id: s.id,
        date: s.date,
        amount: round2(s.amount),
        gain: s.gain != null ? round2(s.gain) : null,
        note: s.note,
        variation: prev ? round2(s.amount - prev.amount) : null,
      };
    });

    // Stats propres à l'enveloppe : premier relevé et variation totale depuis l'origine.
    const first = snaps[0] ?? null;
    const firstSnapshotDate = first ? first.date : null;
    const totalChange =
      first && decorated.balance != null
        ? round2(decorated.balance - first.amount)
        : null;

    return { ...decorated, history, firstSnapshotDate, totalChange };
  }

  /**
   * Vue d'ensemble : patrimoine net, répartition, plus-values, et courbe
   * d'évolution mensuelle (report du dernier solde connu, RG-12).
   */
  async overview(
    monthsParam?: string,
    today?: string,
    projectionParam?: string,
  ) {
    const ref = isValidDateStr(today) ? (today as string) : todayStr();
    const months = this.clampMonths(monthsParam);

    const envelopes = await this.envelopes.find({
      where: { status: 'active' },
      order: { position: 'ASC' },
    });
    const byEnvelope = await this.snapshotsByEnvelope(
      envelopes.map((e) => e.id),
    );

    const decorated = envelopes.map((e) =>
      this.decorate(e, byEnvelope.get(e.id) ?? []),
    );

    let grossAssets = 0;
    let totalLiabilities = 0;
    let plusValueTotal = 0;
    let investedCapital = 0;
    const byType = new Map<EnvelopeType, number>();

    for (const e of decorated) {
      if (e.balance == null) continue;
      if (e.nature === 'passif') {
        totalLiabilities += e.balance;
      } else {
        grossAssets += e.balance;
        byType.set(e.type, (byType.get(e.type) ?? 0) + e.balance);
      }
      if (e.type === 'investissement' && e.gain != null) {
        plusValueTotal += e.gain;
        if (e.investedCapital != null) investedCapital += e.investedCapital;
      }
    }
    const netWorth = grossAssets - totalLiabilities;

    // Répartition des actifs par type (RG-14).
    const repartition = ENVELOPE_TYPES.filter((t) => natureOf(t) === 'actif')
      .map((type) => ({
        type,
        total: round2(byType.get(type) ?? 0),
        pct:
          grossAssets > 0
            ? round2(((byType.get(type) ?? 0) / grossAssets) * 100)
            : 0,
      }))
      .filter((r) => r.total > 0);

    // Répartition des actifs par enveloppe (part de chaque enveloppe dans le brut).
    const repartitionByEnvelope = decorated
      .filter((e) => e.nature === 'actif' && e.balance != null && e.balance > 0)
      .map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        color: e.color,
        icon: e.icon,
        total: round2(e.balance as number),
        pct:
          grossAssets > 0
            ? round2(((e.balance as number) / grossAssets) * 100)
            : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Structure pour le calcul du net à une date (report du dernier solde connu).
    const series = decorated.map((e) => ({
      nature: e.nature,
      snaps: (byEnvelope.get(e.id) ?? [])
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date)),
    }));
    const netAt = (date: string): number => {
      let sum = 0;
      for (const s of series) {
        const last = this.lastSnapshotUpTo(s.snaps, date);
        if (!last) continue;
        sum += s.nature === 'passif' ? -last.amount : last.amount;
      }
      return sum;
    };

    // Courbe mensuelle : fin de mois, sauf le mois courant (date du jour).
    const [y, m] = ref.split('-').map(Number);
    const evolution: { date: string; net: number }[] = [];
    for (let i = months - 1; i >= 0; i -= 1) {
      const { year, month } = addMonthsYM(y, m, -i);
      const date = i === 0 ? ref : lastDayOfMonth(year, month);
      evolution.push({ date, net: round2(netAt(date)) });
    }

    // Variation vs. fin du mois précédent (RG-13).
    const prevMonth = addMonthsYM(y, m, -1);
    const prevDate = lastDayOfMonth(prevMonth.year, prevMonth.month);
    const prevNet = netAt(prevDate);
    const variation = {
      fromDate: prevDate,
      amount: round2(netWorth - prevNet),
      pct:
        prevNet !== 0
          ? round2(((netWorth - prevNet) / Math.abs(prevNet)) * 100)
          : null,
    };

    // #7 — Composition : solde par type actif à chaque date de la courbe.
    const activeAssetTypes = ENVELOPE_TYPES.filter(
      (t) => natureOf(t) === 'actif',
    );
    const assetSeries = decorated
      .filter((e) => e.nature === 'actif')
      .map((e) => ({
        type: e.type,
        snaps: (byEnvelope.get(e.id) ?? [])
          .slice()
          .sort((a, b) => a.date.localeCompare(b.date)),
      }));
    const evolutionByType = evolution.map(({ date }) => {
      const point: Record<string, string | number> = { date };
      for (const type of activeAssetTypes) {
        let sum = 0;
        for (const s of assetSeries) {
          if (s.type !== type) continue;
          const last = this.lastSnapshotUpTo(s.snaps, date);
          if (last) sum += last.amount;
        }
        point[type] = round2(sum);
      }
      return point;
    });

    // #8 — KPIs temporels : YTD, 12 mois glissants, plus haut historique.
    const ytdNet = netAt(`${y - 1}-12-31`);
    const oneYearNet = netAt(addDays(ref, -365));
    let allTimeHigh: { amount: number; date: string } | null = null;
    let earliest: string | null = null;
    for (const s of series) {
      const f = s.snaps[0];
      if (f && (earliest == null || f.date < earliest)) earliest = f.date;
    }
    if (earliest) {
      const [ey, em] = earliest.split('-').map(Number);
      const span = (y - ey) * 12 + (m - em);
      for (let i = 0; i <= span; i += 1) {
        const { year, month } = addMonthsYM(ey, em, i);
        const date = i === span ? ref : lastDayOfMonth(year, month);
        const value = round2(netAt(date));
        if (!allTimeHigh || value > allTimeHigh.amount)
          allTimeHigh = { amount: value, date };
      }
    }
    const kpis = {
      ytd: { fromDate: `${y - 1}-12-31`, amount: round2(netWorth - ytdNet) },
      oneYear: {
        fromDate: addDays(ref, -365),
        amount: round2(netWorth - oneYearNet),
      },
      allTimeHigh,
    };

    // #11 — Projection : épargne moyenne mensuelle (pente de la série du net sur
    // ≤ 12 mois d'historique) prolongée dans le futur.
    const savingsBasePts: { date: string; value: number }[] = [];
    if (earliest) {
      const [ey, em] = earliest.split('-').map(Number);
      const spanFromEarliest = (y - ey) * 12 + (m - em);
      const baseCount = Math.min(12, spanFromEarliest);
      for (let i = baseCount; i >= 0; i -= 1) {
        const { year, month } = addMonthsYM(y, m, -i);
        const date = i === 0 ? ref : lastDayOfMonth(year, month);
        savingsBasePts.push({ date, value: round2(netAt(date)) });
      }
    }
    const savingsSlope = slopePerDay(savingsBasePts, ref, 1_000_000);
    const monthlySavings =
      savingsSlope != null ? round2(savingsSlope * (365 / 12)) : null;

    const projectionMonths = this.clampProjection(projectionParam);
    const projection: { date: string; net: number }[] = [];
    if (projectionMonths > 0 && monthlySavings != null) {
      for (let i = 1; i <= projectionMonths; i += 1) {
        const { year, month } = addMonthsYM(y, m, i);
        projection.push({
          date: lastDayOfMonth(year, month),
          net: round2(netWorth + monthlySavings * i),
        });
      }
    }

    // #10 — Objectif de patrimoine net global (réglages singleton).
    const cfg = await this.getSettings();
    let netObjective: {
      target: number;
      targetDate: string | null;
      progressPct: number;
      remaining: number;
      reached: boolean;
      eta: string | null;
      paceStatus: PaceStatus;
      requiredMonthly: number | null;
    } | null = null;
    if (cfg.netWorthTarget != null && cfg.netWorthTarget > 0) {
      const target = round2(cfg.netWorthTarget);
      const slope = slopePerDay(
        evolution.map((p) => ({ date: p.date, value: p.net })),
        ref,
      );
      const proj = projectTarget(
        slope,
        netWorth,
        target,
        cfg.netWorthTargetDate ?? null,
        ref,
      );
      netObjective = {
        target,
        targetDate: cfg.netWorthTargetDate ?? null,
        progressPct: target > 0 ? round2((netWorth / target) * 100) : 0,
        remaining: round2(Math.max(target - netWorth, 0)),
        reached: netWorth >= target,
        eta: proj.eta,
        paceStatus: proj.paceStatus,
        requiredMonthly: proj.requiredMonthly,
      };
    }

    return {
      netWorth: round2(netWorth),
      grossAssets: round2(grossAssets),
      totalLiabilities: round2(totalLiabilities),
      plusValueTotal: round2(plusValueTotal),
      investedCapital: round2(investedCapital),
      performancePct:
        investedCapital > 0
          ? round2((plusValueTotal / investedCapital) * 100)
          : null,
      variation,
      repartition,
      repartitionByEnvelope,
      evolution,
      evolutionByType,
      kpis,
      monthlySavings,
      projection,
      projectionMonths,
      netObjective,
      envelopes: decorated,
    };
  }

  // ---------------------------------------------------------------------------
  // CRUD enveloppes
  // ---------------------------------------------------------------------------

  async create(input: EnvelopeInput) {
    const name = this.validateName(input.name);
    const type = input.type as EnvelopeType;
    if (!ENVELOPE_TYPES.includes(type)) {
      throw new BadRequestException("Type d'enveloppe invalide.");
    }
    await this.assertNameUnique(name, null);

    const maxPos = await this.maxPosition();
    const envelope = await this.envelopes.save(
      this.envelopes.create({
        name,
        type,
        color: input.color || DEFAULT_COLORS[type],
        icon: (input.icon || '').slice(0, 8),
        position: maxPos + 1,
        status: 'active',
        archivedAt: null,
        targetAmount: this.validateTargetAmount(input.targetAmount),
        targetDate: this.validateTargetDate(input.targetDate),
      }),
    );

    // Premier relevé (solde initial daté, RG-03).
    const initialDate = isValidDateStr(input.initialDate)
      ? (input.initialDate as string)
      : todayStr();
    await this.setSnapshot(envelope.id, initialDate, {
      amount: input.initialAmount ?? 0,
      gain: type === 'investissement' ? (input.initialGain ?? null) : null,
    });

    return this.getEnvelope(envelope.id);
  }

  async update(id: string, input: EnvelopeInput) {
    const envelope = await this.getOrThrow(id);
    // Le type est immuable (RG-02) : seuls nom / couleur / icône changent.
    if (input.name !== undefined) {
      const name = this.validateName(input.name);
      await this.assertNameUnique(name, id);
      envelope.name = name;
    }
    if (input.color !== undefined) envelope.color = input.color;
    if (input.icon !== undefined) envelope.icon = input.icon.slice(0, 8);
    if (input.targetAmount !== undefined) {
      envelope.targetAmount = this.validateTargetAmount(input.targetAmount);
    }
    if (input.targetDate !== undefined) {
      envelope.targetDate = this.validateTargetDate(input.targetDate);
    }
    await this.envelopes.save(envelope);
    return this.getEnvelope(id);
  }

  async archive(id: string) {
    const envelope = await this.getOrThrow(id);
    envelope.status = 'archived';
    envelope.archivedAt = new Date();
    await this.envelopes.save(envelope);
    return this.getEnvelope(id);
  }

  async unarchive(id: string) {
    const envelope = await this.getOrThrow(id);
    envelope.status = 'active';
    envelope.archivedAt = null;
    await this.envelopes.save(envelope);
    return this.getEnvelope(id);
  }

  async remove(id: string): Promise<void> {
    await this.getOrThrow(id);
    // Les relevés sont supprimés en cascade (FK ON DELETE CASCADE, RG-16).
    await this.envelopes.delete(id);
  }

  async reorder(ids: string[]) {
    await applyReorder(this.envelopes, ids);
    return this.listEnvelopes();
  }

  // ---------------------------------------------------------------------------
  // Relevés (snapshots)
  // ---------------------------------------------------------------------------

  /** Crée ou écrase (upsert) le relevé d'une enveloppe à une date (RG-04/05). */
  async setSnapshot(envelopeId: string, date: string, input: SnapshotInput) {
    const envelope = await this.getOrThrow(envelopeId);
    if (!isValidDateStr(date)) {
      throw new BadRequestException('Date invalide (YYYY-MM-DD attendu).');
    }
    const amount = this.validateAmount(input.amount);
    const gain =
      envelope.type === 'investissement' ? this.validateGain(input.gain) : null;

    const existing = await this.snapshots.findOne({
      where: { envelopeId, date },
    });
    if (existing) {
      existing.amount = amount;
      existing.gain = gain;
      existing.note = this.normalizeNote(input.note);
      await this.snapshots.save(existing);
    } else {
      await this.snapshots.save(
        this.snapshots.create({
          envelopeId,
          date,
          amount,
          gain,
          note: this.normalizeNote(input.note),
        }),
      );
    }
    return this.getEnvelope(envelopeId);
  }

  async removeSnapshot(id: string) {
    const snap = await this.snapshots.findOne({ where: { id } });
    if (!snap) throw new NotFoundException('Relevé introuvable.');
    const envelopeId = snap.envelopeId;
    await this.snapshots.delete(id);
    return this.getEnvelope(envelopeId);
  }

  /**
   * Bilan du mois (#1) : applique un relevé à une même date pour plusieurs
   * enveloppes en une passe (upsert). Les items sans montant valide sont ignorés.
   * Renvoie la liste des enveloppes re-décorées.
   */
  async bulkSetSnapshots(input: BulkSnapshotInput) {
    const date = input.date;
    if (!isValidDateStr(date)) {
      throw new BadRequestException('Date invalide (YYYY-MM-DD attendu).');
    }
    const items = Array.isArray(input.items) ? input.items : [];
    for (const item of items) {
      if (!item || !item.envelopeId) continue;
      if (item.amount === undefined || item.amount === null) continue;
      await this.setSnapshot(item.envelopeId, date as string, {
        amount: item.amount,
        gain: item.gain ?? null,
        note: item.note ?? null,
      });
    }
    return this.listEnvelopes();
  }

  // ---------------------------------------------------------------------------
  // Réglages (singleton)
  // ---------------------------------------------------------------------------

  /** Réglages globaux du module (création paresseuse du singleton). */
  async getSettings(): Promise<FinancesSettingsEntity> {
    let cfg = await this.settings.findOne({ where: { id: SETTINGS_ID } });
    if (!cfg) {
      cfg = await this.settings.save(
        this.settings.create({
          id: SETTINGS_ID,
          netWorthTarget: null,
          netWorthTargetDate: null,
        }),
      );
    }
    return cfg;
  }

  async updateSettings(input: SettingsInput): Promise<FinancesSettingsEntity> {
    const cfg = await this.getSettings();
    if (input.netWorthTarget !== undefined) {
      cfg.netWorthTarget = this.validateTargetAmount(input.netWorthTarget);
    }
    if (input.netWorthTargetDate !== undefined) {
      cfg.netWorthTargetDate = this.validateTargetDate(
        input.netWorthTargetDate,
      );
    }
    return this.settings.save(cfg);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Relevés groupés par enveloppe, triés du plus récent au plus ancien. */
  private async snapshotsByEnvelope(
    ids: string[],
  ): Promise<Map<string, SnapshotEntity[]>> {
    const rows = ids.length
      ? await this.snapshots.find({
          where: { envelopeId: In(ids) },
          order: { date: 'DESC', createdAt: 'DESC' },
        })
      : [];
    const map = new Map<string, SnapshotEntity[]>();
    for (const s of rows) {
      const arr = map.get(s.envelopeId);
      if (arr) arr.push(s);
      else map.set(s.envelopeId, [s]);
    }
    return map;
  }

  /** Dernier relevé de date ≤ `date` (report du dernier solde connu). */
  private lastSnapshotUpTo(
    snapsAsc: SnapshotEntity[],
    date: string,
  ): SnapshotEntity | null {
    let found: SnapshotEntity | null = null;
    for (const s of snapsAsc) {
      if (s.date <= date) found = s;
      else break;
    }
    return found;
  }

  /** Décore une enveloppe de son solde courant et de ses stats dérivées. */
  private decorate(envelope: EnvelopeEntity, snapsDesc: SnapshotEntity[]) {
    const nature = natureOf(envelope.type);
    const last = snapsDesc[0] ?? null;
    const prev = snapsDesc[1] ?? null;
    const balance = last ? round2(last.amount) : null;

    let gain: number | null = null;
    let investedCapital: number | null = null;
    let performancePct: number | null = null;
    if (envelope.type === 'investissement' && last && last.gain != null) {
      gain = round2(last.gain);
      investedCapital = round2(last.amount - last.gain);
      performancePct =
        investedCapital > 0
          ? round2((last.gain / investedCapital) * 100)
          : null;
    }

    const ref = todayStr();

    // Fraîcheur du dernier relevé (#2).
    const daysSinceUpdate = last ? daysBetween(last.date, ref) : null;
    const stale = daysSinceUpdate != null && daysSinceUpdate > STALE_AFTER_DAYS;

    // Tendance sur ~30 jours : solde courant vs dernier relevé daté <= ref-30j
    // (report du dernier solde connu). `null` si pas assez d'historique.
    const ref30 = addDays(ref, -30);
    const snap30 = snapsDesc.find((s) => s.date <= ref30) ?? null;
    const balance30 = snap30 ? round2(snap30.amount) : null;
    let trend30: { amount: number; pct: number | null } | null = null;
    if (balance != null && balance30 != null) {
      const amount = round2(balance - balance30);
      trend30 = {
        amount,
        pct:
          balance30 !== 0 ? round2((amount / Math.abs(balance30)) * 100) : null,
      };
    }

    // Objectif : progression du solde vers la cible + projection (#6, calcul backend).
    let objective: {
      targetAmount: number;
      targetDate: string | null;
      progressPct: number;
      remaining: number;
      reached: boolean;
      eta: string | null;
      paceStatus: PaceStatus;
      requiredMonthly: number | null;
    } | null = null;
    if (envelope.targetAmount != null && envelope.targetAmount > 0) {
      const current = balance ?? 0;
      const target = round2(envelope.targetAmount);
      const slope = slopePerDay(
        snapsDesc.map((s) => ({ date: s.date, value: s.amount })),
        ref,
      );
      const proj = projectTarget(
        slope,
        current,
        target,
        envelope.targetDate ?? null,
        ref,
      );
      objective = {
        targetAmount: target,
        targetDate: envelope.targetDate ?? null,
        progressPct: round2((current / target) * 100),
        remaining: round2(Math.max(target - current, 0)),
        reached: current >= target,
        eta: proj.eta,
        paceStatus: proj.paceStatus,
        requiredMonthly: proj.requiredMonthly,
      };
    }

    return {
      id: envelope.id,
      name: envelope.name,
      type: envelope.type,
      nature,
      color: envelope.color,
      icon: envelope.icon,
      position: envelope.position,
      status: envelope.status,
      createdAt: envelope.createdAt,
      archivedAt: envelope.archivedAt,
      balance,
      lastSnapshotDate: last ? last.date : null,
      lastVariation: last && prev ? round2(last.amount - prev.amount) : null,
      trend30,
      daysSinceUpdate,
      stale,
      gain,
      investedCapital,
      performancePct,
      snapshotCount: snapsDesc.length,
      targetAmount: envelope.targetAmount ?? null,
      targetDate: envelope.targetDate ?? null,
      objective,
    };
  }

  private async maxPosition(): Promise<number> {
    const row = await this.envelopes
      .createQueryBuilder('e')
      .select('MAX(e.position)', 'max')
      .getRawOne<{ max: number | null }>();
    return row?.max ?? -1;
  }

  private async getOrThrow(id: string): Promise<EnvelopeEntity> {
    const envelope = await this.envelopes.findOne({ where: { id } });
    if (!envelope) throw new NotFoundException('Enveloppe introuvable.');
    return envelope;
  }

  private clampMonths(value?: string): number {
    const n = parseInt(value ?? '', 10);
    if (!Number.isFinite(n)) return 12;
    return Math.min(Math.max(n, 1), 60);
  }

  /** Horizon de projection en mois (0 = aucune), borné à 120. */
  private clampProjection(value?: string): number {
    const n = parseInt(value ?? '', 10);
    if (!Number.isFinite(n)) return 0;
    return Math.min(Math.max(n, 0), 120);
  }

  private validateName(name?: string): string {
    const trimmed = (name ?? '').trim();
    if (!trimmed) throw new BadRequestException('Le nom est obligatoire.');
    if (trimmed.length > NAME_MAX) {
      throw new BadRequestException(
        `Le nom ne peut dépasser ${NAME_MAX} caractères.`,
      );
    }
    return trimmed;
  }

  /** Montant ≥ 0 (la nature porte le signe dans le net, RG-06). */
  private validateAmount(value?: number): number {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException('Le montant doit être un nombre ≥ 0.');
    }
    return round2(amount);
  }

  /** Plus-value : nombre de signe libre (gain ou perte), optionnel (RG-08). */
  private validateGain(value?: number | null): number | null {
    if (value === null || value === undefined || value === ('' as unknown)) {
      return null;
    }
    const gain = Number(value);
    if (!Number.isFinite(gain)) {
      throw new BadRequestException('La plus-value doit être un nombre.');
    }
    return round2(gain);
  }

  /** Montant cible d'objectif : nombre ≥ 0, optionnel (null pour effacer). */
  private validateTargetAmount(value?: number | null): number | null {
    if (value === null || value === undefined || value === ('' as unknown)) {
      return null;
    }
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException("L'objectif doit être un nombre ≥ 0.");
    }
    return round2(amount);
  }

  /** Échéance d'objectif : date YYYY-MM-DD, optionnelle (null pour effacer). */
  private validateTargetDate(value?: string | null): string | null {
    if (value === null || value === undefined || value === '') return null;
    if (!isValidDateStr(value)) {
      throw new BadRequestException(
        "L'échéance est invalide (YYYY-MM-DD attendu).",
      );
    }
    return value;
  }

  private normalizeNote(note?: string | null): string | null {
    if (note === null || note === undefined) return null;
    const trimmed = String(note).trim();
    return trimmed ? trimmed.slice(0, 500) : null;
  }

  private async assertNameUnique(
    name: string,
    exceptId: string | null,
  ): Promise<void> {
    const qb = this.envelopes
      .createQueryBuilder('e')
      .where('e.status = :status', { status: 'active' })
      .andWhere('LOWER(e.name) = LOWER(:name)', { name });
    if (exceptId) qb.andWhere('e.id != :exceptId', { exceptId });
    const dup = await qb.getOne();
    if (dup) {
      throw new BadRequestException('Une enveloppe porte déjà ce nom.');
    }
  }
}
