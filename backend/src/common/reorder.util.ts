import { BadRequestException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

/**
 * Réordonne des entités à colonne `position` : chaque id reçoit comme
 * position son index dans `ids`. Pattern partagé par toutes les routes
 * `POST …/reorder` du projet.
 */
export async function applyReorder<
  T extends ObjectLiteral & { position: number },
>(repo: Repository<T>, ids: string[]): Promise<void> {
  if (!Array.isArray(ids)) {
    throw new BadRequestException('Le corps doit contenir un tableau "ids".');
  }
  // Double cast requis : QueryDeepPartialEntity<T> ne se laisse pas inférer
  // depuis un littéral quand T est générique (limite connue de TypeORM).
  const patch = (index: number) =>
    ({ position: index }) as unknown as QueryDeepPartialEntity<T>;
  await Promise.all(ids.map((id, index) => repo.update(id, patch(index))));
}
