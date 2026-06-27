import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferenceItemEntity } from './entities/reference-item.entity';
import {
  REFERENTIAL_KINDS,
  ReferenceItemInput,
  ReferentialKind,
} from './types';

@Injectable()
export class ReferentialService {
  constructor(
    @InjectRepository(ReferenceItemEntity)
    private readonly items: Repository<ReferenceItemEntity>,
  ) {}

  /** Liste les éléments d'un référentiel, filtrés par `q` (recherche libre). */
  async list(kind: string, q?: string) {
    const k = this.resolveKind(kind);
    const qb = this.items
      .createQueryBuilder('i')
      .where('i.kind = :kind', { kind: k })
      .orderBy('i.name', 'ASC')
      .limit(50);
    if (q && q.trim()) {
      qb.andWhere('i.name_key LIKE :q', { q: `%${this.normalizeKey(q)}%` });
    }
    const rows = await qb.getMany();
    return rows.map((r) => this.toResponse(r));
  }

  /** Crée un élément. Unicité (kind, nameKey) → 409 si déjà présent. */
  async create(kind: string, input: ReferenceItemInput) {
    const k = this.resolveKind(kind);
    const name = (input?.name ?? '').trim();
    if (!name) throw new BadRequestException('Le nom est obligatoire.');
    if (name.length > 80) {
      throw new BadRequestException('Le nom ne peut dépasser 80 caractères.');
    }
    const nameKey = this.normalizeKey(name);

    const existing = await this.items.findOne({ where: { kind: k, nameKey } });
    if (existing) {
      throw new ConflictException('Cet élément existe déjà dans le référentiel.');
    }

    const saved = await this.items.save(
      this.items.create({ kind: k, name, nameKey }),
    );
    return this.toResponse(saved);
  }

  async update(kind: string, id: string, input: ReferenceItemInput) {
    const k = this.resolveKind(kind);
    const item = await this.getOrThrow(k, id);
    const name = (input?.name ?? '').trim();
    if (!name) throw new BadRequestException('Le nom est obligatoire.');
    if (name.length > 80) {
      throw new BadRequestException('Le nom ne peut dépasser 80 caractères.');
    }
    const nameKey = this.normalizeKey(name);

    const clash = await this.items.findOne({ where: { kind: k, nameKey } });
    if (clash && clash.id !== id) {
      throw new ConflictException('Cet élément existe déjà dans le référentiel.');
    }

    item.name = name;
    item.nameKey = nameKey;
    return this.toResponse(await this.items.save(item));
  }

  async remove(kind: string, id: string): Promise<void> {
    const k = this.resolveKind(kind);
    await this.getOrThrow(k, id);
    await this.items.delete({ id, kind: k });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private toResponse(item: ReferenceItemEntity) {
    return { id: item.id, name: item.name, createdAt: item.createdAt };
  }

  private async getOrThrow(
    kind: ReferentialKind,
    id: string,
  ): Promise<ReferenceItemEntity> {
    const item = await this.items.findOne({ where: { id, kind } });
    if (!item) throw new NotFoundException('Élément introuvable.');
    return item;
  }

  private resolveKind(kind: string): ReferentialKind {
    if (!REFERENTIAL_KINDS.includes(kind as ReferentialKind)) {
      throw new BadRequestException('Référentiel inconnu.');
    }
    return kind as ReferentialKind;
  }

  /** Clé de consolidation : sans accents, espaces normalisés, minuscule. */
  private normalizeKey(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }
}
