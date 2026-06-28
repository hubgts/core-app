import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { round2, round3 } from '../common/round.util';
import { isValidDateStr, todayStr } from './date.util';
import { BankrollEntity } from './entities/bankroll.entity';
import { BetEntity } from './entities/bet.entity';
import { SelectionEntity } from './entities/selection.entity';
import { computeStats } from './stats';
import {
  BankrollInput,
  BET_STATUSES,
  BetInput,
  BetStatus,
  SELECTION_STATUSES,
  SelectionInput,
  SelectionStatus,
  SettleBetInput,
  betPayout,
  betProfit,
  combineOdds,
  deriveBetStatus,
} from './types';

const NAME_MAX = 60;

@Injectable()
export class BettingService {
  constructor(
    @InjectRepository(BankrollEntity)
    private readonly bankrolls: Repository<BankrollEntity>,
    @InjectRepository(BetEntity)
    private readonly bets: Repository<BetEntity>,
    @InjectRepository(SelectionEntity)
    private readonly selections: Repository<SelectionEntity>,
  ) {}

  // ---------------------------------------------------------------------------
  // Lecture
  // ---------------------------------------------------------------------------

  /** Bankrolls (actives par défaut), chacune décorée d'un résumé de stats. */
  async listBankrolls(includeArchived = false) {
    const where = includeArchived ? {} : { status: 'active' as const };
    const rows = await this.bankrolls.find({
      where,
      order: { position: 'ASC' },
    });
    if (rows.length === 0) return [];

    const ids = rows.map((b) => b.id);
    const allBets = await this.bets.find({ where: { bankrollId: In(ids) } });
    const betsBy = groupBy(allBets, (b) => b.bankrollId);

    return rows.map((b) => {
      const stats = computeStats(b, betsBy.get(b.id) ?? []);
      return { ...this.baseBankroll(b), stats };
    });
  }

  /** Détail d'une bankroll : stats complètes + liste des paris décorés. */
  async getBankroll(id: string) {
    const bankroll = await this.getBankrollOrThrow(id);
    const bets = await this.bets.find({
      where: { bankrollId: id },
      relations: { selections: true },
      order: { placedAt: 'DESC', createdAt: 'DESC' },
    });
    const stats = computeStats(bankroll, bets);
    return {
      ...this.baseBankroll(bankroll),
      stats,
      bets: bets.map((b) => this.decorateBet(b)),
    };
  }

  // ---------------------------------------------------------------------------
  // CRUD bankroll
  // ---------------------------------------------------------------------------

  async createBankroll(input: BankrollInput) {
    const name = this.validateName(input.name);
    await this.assertNameUnique(name, null);
    const startingCapital = this.validatePositive(
      input.startingCapital,
      'Le capital de départ',
    );
    const maxPos = await this.maxPosition();
    const saved = await this.bankrolls.save(
      this.bankrolls.create({
        name,
        startingCapital,
        bookmaker: (input.bookmaker ?? '').trim(),
        color: input.color || '#4F46E5',
        icon: (input.icon || '').slice(0, 8),
        position: maxPos + 1,
        status: 'active',
        archivedAt: null,
      }),
    );
    return this.getBankroll(saved.id);
  }

  async updateBankroll(id: string, input: BankrollInput) {
    const bankroll = await this.getBankrollOrThrow(id);
    // Le capital de départ est immuable (RG-01) : on le corrige par mouvement.
    if (input.name !== undefined) {
      const name = this.validateName(input.name);
      await this.assertNameUnique(name, id);
      bankroll.name = name;
    }
    if (input.bookmaker !== undefined)
      bankroll.bookmaker = (input.bookmaker ?? '').trim();
    if (input.color !== undefined) bankroll.color = input.color;
    if (input.icon !== undefined)
      bankroll.icon = (input.icon ?? '').slice(0, 8);
    await this.bankrolls.save(bankroll);
    return this.getBankroll(id);
  }

  async archiveBankroll(id: string) {
    const bankroll = await this.getBankrollOrThrow(id);
    bankroll.status = 'archived';
    bankroll.archivedAt = new Date();
    await this.bankrolls.save(bankroll);
    return this.getBankroll(id);
  }

  async unarchiveBankroll(id: string) {
    const bankroll = await this.getBankrollOrThrow(id);
    bankroll.status = 'active';
    bankroll.archivedAt = null;
    await this.bankrolls.save(bankroll);
    return this.getBankroll(id);
  }

  async removeBankroll(id: string): Promise<void> {
    await this.getBankrollOrThrow(id);
    // Paris, sélections et mouvements partent en cascade (FK ON DELETE CASCADE).
    await this.bankrolls.delete(id);
  }

  // ---------------------------------------------------------------------------
  // CRUD paris
  // ---------------------------------------------------------------------------

  async createBet(bankrollId: string, input: BetInput) {
    await this.getBankrollOrThrow(bankrollId);
    const type = input.type === 'combine' ? 'combine' : 'simple';
    const stake = this.validatePositive(input.stake, 'La mise');
    const selections = this.validateSelections(input.selections, type);

    const status = this.normalizeBetStatus(input.status) ?? 'pending';
    const odds =
      type === 'combine' ? round3(combineOdds(selections)) : selections[0].odds;

    const placedAt = isValidDateStr(input.placedAt)
      ? input.placedAt!
      : todayStr();
    const settledAt = this.resolveSettledAt(status, input.settledAt, placedAt);

    const bet = await this.bets.save(
      this.bets.create({
        bankrollId,
        type,
        stake,
        odds,
        status,
        commission: this.validateNonNeg(input.commission, 'La commission', 0),
        cashoutAmount:
          status === 'cashout'
            ? this.validateNonNeg(input.cashoutAmount, 'Le cash out', 0)
            : null,
        closingOdds: this.validateOptionalOdds(input.closingOdds),
        placedAt,
        settledAt,
        note: this.normalizeNote(input.note),
        selections: selections.map((s, i) =>
          this.selections.create({ ...s, position: i }),
        ),
      }),
    );
    return this.getBankroll(bankrollId);
  }

  async updateBet(betId: string, input: BetInput) {
    const bet = await this.getBetOrThrow(betId);

    if (input.stake !== undefined)
      bet.stake = this.validatePositive(input.stake, 'La mise');
    if (input.commission !== undefined) {
      bet.commission = this.validateNonNeg(
        input.commission,
        'La commission',
        0,
      );
    }
    if (input.closingOdds !== undefined) {
      bet.closingOdds = this.validateOptionalOdds(input.closingOdds);
    }
    if (input.placedAt !== undefined && isValidDateStr(input.placedAt)) {
      bet.placedAt = input.placedAt;
    }
    if (input.note !== undefined) bet.note = this.normalizeNote(input.note);

    // Remplacement éventuel des sélections (recalcule la cote du combiné).
    if (input.selections !== undefined) {
      const next = this.validateSelections(input.selections, bet.type);
      await this.selections.delete({ betId });
      bet.selections = next.map((s, i) =>
        this.selections.create({ ...s, betId, position: i }),
      );
      bet.odds =
        bet.type === 'combine' ? round3(combineOdds(next)) : next[0].odds;
    }

    if (input.status !== undefined) {
      const status = this.normalizeBetStatus(input.status);
      if (!status) throw new BadRequestException('Statut de pari invalide.');
      this.applyStatus(bet, status, input.cashoutAmount, input.settledAt);
    }

    await this.bets.save(bet);
    return this.getBankroll(bet.bankrollId);
  }

  /** Règlement express d'un ticket (gagné / perdu / remboursé / annulé / cash out). */
  async settleBet(betId: string, input: SettleBetInput) {
    const bet = await this.getBetOrThrow(betId);
    const status = this.normalizeBetStatus(input.status);
    if (!status) throw new BadRequestException('Statut de pari invalide.');
    if (input.commission !== undefined) {
      bet.commission = this.validateNonNeg(
        input.commission,
        'La commission',
        0,
      );
    }
    this.applyStatus(bet, status, input.cashoutAmount, input.settledAt);
    await this.bets.save(bet);
    return this.getBankroll(bet.bankrollId);
  }

  /** Règle une sélection d'un combiné : recalcule cote + statut dérivé (RG-08/09). */
  async settleSelection(selectionId: string, status: SelectionStatus) {
    if (!SELECTION_STATUSES.includes(status)) {
      throw new BadRequestException('Statut de sélection invalide.');
    }
    const selection = await this.selections.findOne({
      where: { id: selectionId },
    });
    if (!selection) throw new NotFoundException('Sélection introuvable.');
    selection.status = status;
    await this.selections.save(selection);

    const bet = await this.getBetOrThrow(selection.betId);
    const all = await this.selections.find({ where: { betId: bet.id } });
    bet.odds = bet.type === 'combine' ? round3(combineOdds(all)) : all[0].odds;
    const derived = deriveBetStatus(all);
    bet.status = derived;
    bet.settledAt =
      derived === 'pending' ? null : (bet.settledAt ?? todayStr());
    if (derived !== 'cashout') bet.cashoutAmount = null;
    await this.bets.save(bet);
    return this.getBankroll(bet.bankrollId);
  }

  async removeBet(betId: string) {
    const bet = await this.getBetOrThrow(betId);
    const bankrollId = bet.bankrollId;
    await this.bets.delete(betId); // sélections en cascade
    return this.getBankroll(bankrollId);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private baseBankroll(b: BankrollEntity) {
    return {
      id: b.id,
      name: b.name,
      startingCapital: round2(b.startingCapital),
      bookmaker: b.bookmaker,
      color: b.color,
      icon: b.icon,
      position: b.position,
      status: b.status,
      createdAt: b.createdAt,
      archivedAt: b.archivedAt,
    };
  }

  private decorateBet(b: BetEntity) {
    const view = {
      status: b.status,
      stake: b.stake,
      odds: b.odds,
      commission: b.commission,
      cashoutAmount: b.cashoutAmount,
    };
    return {
      id: b.id,
      bankrollId: b.bankrollId,
      type: b.type,
      stake: round2(b.stake),
      odds: round3(b.odds),
      status: b.status,
      commission: round2(b.commission),
      cashoutAmount: b.cashoutAmount != null ? round2(b.cashoutAmount) : null,
      closingOdds: b.closingOdds != null ? round3(b.closingOdds) : null,
      placedAt: b.placedAt,
      settledAt: b.settledAt,
      note: b.note,
      payout: round2(betPayout(view)),
      profit: round2(betProfit(view)),
      selections: (b.selections ?? [])
        .slice()
        .sort((a, c) => a.position - c.position)
        .map((s) => ({
          id: s.id,
          sport: s.sport,
          event: s.event,
          market: s.market,
          pick: s.pick,
          odds: round3(s.odds),
          status: s.status,
        })),
    };
  }

  /** Applique un statut au ticket en gérant cashout / settledAt. */
  private applyStatus(
    bet: BetEntity,
    status: BetStatus,
    cashoutAmount: number | null | undefined,
    settledAt: string | null | undefined,
  ) {
    bet.status = status;
    if (status === 'cashout') {
      bet.cashoutAmount = this.validateNonNeg(cashoutAmount, 'Le cash out', 0);
    } else {
      bet.cashoutAmount = null;
    }
    bet.settledAt = this.resolveSettledAt(status, settledAt, bet.placedAt);
  }

  private resolveSettledAt(
    status: BetStatus,
    settledAt: string | null | undefined,
    placedAt: string,
  ): string | null {
    if (status === 'pending') return null;
    if (isValidDateStr(settledAt)) return settledAt as string;
    return todayStr() >= placedAt ? todayStr() : placedAt;
  }

  private validateSelections(
    input: SelectionInput[] | undefined,
    type: 'simple' | 'combine',
  ) {
    const list = Array.isArray(input) ? input : [];
    if (type === 'simple' && list.length !== 1) {
      throw new BadRequestException(
        'Un pari simple a exactement une sélection.',
      );
    }
    if (type === 'combine' && list.length < 2) {
      throw new BadRequestException('Un combiné a au moins deux sélections.');
    }
    return list.map((s) => {
      const sport = (s.sport ?? '').trim();
      if (!sport)
        throw new BadRequestException('Chaque sélection doit avoir un sport.');
      const odds = Number(s.odds);
      if (!Number.isFinite(odds) || odds < 1) {
        throw new BadRequestException('La cote doit être ≥ 1.');
      }
      const status: SelectionStatus = SELECTION_STATUSES.includes(
        s.status as SelectionStatus,
      )
        ? (s.status as SelectionStatus)
        : 'pending';
      return {
        sport: sport.slice(0, 80),
        event: trimOrNull(s.event, 160),
        market: trimOrNull(s.market, 120),
        pick: trimOrNull(s.pick, 120),
        odds: round3(odds),
        status,
      };
    });
  }

  private normalizeBetStatus(status: string | undefined): BetStatus | null {
    if (!status) return null;
    return BET_STATUSES.includes(status as BetStatus)
      ? (status as BetStatus)
      : null;
  }

  private async maxPosition(): Promise<number> {
    const row = await this.bankrolls
      .createQueryBuilder('b')
      .select('MAX(b.position)', 'max')
      .getRawOne<{ max: number | null }>();
    return row?.max ?? -1;
  }

  private async getBankrollOrThrow(id: string): Promise<BankrollEntity> {
    const b = await this.bankrolls.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Bankroll introuvable.');
    return b;
  }

  private async getBetOrThrow(id: string): Promise<BetEntity> {
    const b = await this.bets.findOne({
      where: { id },
      relations: { selections: true },
    });
    if (!b) throw new NotFoundException('Pari introuvable.');
    return b;
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

  private validatePositive(value: number | undefined, label: string): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      throw new BadRequestException(`${label} doit être un nombre > 0.`);
    }
    return round2(n);
  }

  private validateNonNeg(
    value: number | null | undefined,
    label: string,
    fallback: number,
  ): number {
    if (value === null || value === undefined || (value as unknown) === '') {
      return fallback;
    }
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      throw new BadRequestException(`${label} doit être un nombre ≥ 0.`);
    }
    return round2(n);
  }

  private validateOptionalOdds(
    value: number | null | undefined,
  ): number | null {
    if (value === null || value === undefined || (value as unknown) === '')
      return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1) {
      throw new BadRequestException('La cote de clôture doit être ≥ 1.');
    }
    return round3(n);
  }

  private normalizeNote(note?: string | null): string | null {
    return trimOrNull(note, 500);
  }

  private async assertNameUnique(
    name: string,
    exceptId: string | null,
  ): Promise<void> {
    const qb = this.bankrolls
      .createQueryBuilder('b')
      .where('b.status = :status', { status: 'active' })
      .andWhere('LOWER(b.name) = LOWER(:name)', { name });
    if (exceptId) qb.andWhere('b.id != :exceptId', { exceptId });
    if (await qb.getOne()) {
      throw new BadRequestException('Une bankroll porte déjà ce nom.');
    }
  }
}

function trimOrNull(v: string | null | undefined, max: number): string | null {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t ? t.slice(0, max) : null;
}

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const arr = map.get(k);
    if (arr) arr.push(r);
    else map.set(k, [r]);
  }
  return map;
}
