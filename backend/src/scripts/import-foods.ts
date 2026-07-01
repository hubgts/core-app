/**
 * Import idempotent des aliments depuis `data/foods.json` vers la table `foods`.
 *
 * Règle (rejouable sans doublon) :
 *  - rapprochement par nom normalisé (`nameKey`, insensible casse/accents) ;
 *  - aliment absent  → créé ;
 *  - aliment présent → mis à jour **uniquement si une macro diffère** (unité ou
 *    glucides/protéines/lipides), `kcal` recalculé ; sinon laissé intact.
 *
 * Lancement (dans le conteneur backend) :
 *   npx ts-node src/scripts/import-foods.ts
 * ou via la cible Makefile :
 *   make import-foods
 */
import 'reflect-metadata';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { FoodEntity, FoodUnit } from '../alimentation/entities/food.entity';

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Clé d'unicité : sans accents, espaces normalisés, minuscule (idem service). */
function normalizeKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function computeKcal(carbs: number, protein: number, fat: number): number {
  return round1(4 * carbs + 4 * protein + 9 * fat);
}

function normalizeUnit(unit?: string): FoodUnit {
  return unit === 'ml' ? 'ml' : 'g';
}

function normalizeMacro(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return round2(Math.min(n, 100));
}

interface RawFood {
  name?: string;
  unit?: string;
  carbs?: number;
  protein?: number;
  fat?: number;
}

async function main() {
  // Chemin du JSON : argument CLI, sinon $FOODS_FILE, sinon data/foods.json.
  // En conteneur, le fichier est copié dans /tmp par la cible Makefile (le
  // dossier data/ de la racine n'est pas inclus dans l'image backend).
  const argPath = process.argv[2] || process.env.FOODS_FILE || 'data/foods.json';
  const file = resolve(process.cwd(), argPath);
  const raw: RawFood[] = JSON.parse(readFileSync(file, 'utf-8'));

  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER ?? 'progression',
    password: process.env.DB_PASSWORD ?? 'progression',
    database: process.env.DB_NAME ?? 'progression',
    entities: [FoodEntity],
    synchronize: false,
  });
  await ds.initialize();
  const repo = ds.getRepository(FoodEntity);

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const item of raw) {
    const name = (item.name ?? '').trim();
    if (!name) {
      skipped += 1;
      continue;
    }
    const nameKey = normalizeKey(name);
    const unit = normalizeUnit(item.unit);
    const carbs = normalizeMacro(item.carbs);
    const protein = normalizeMacro(item.protein);
    const fat = normalizeMacro(item.fat);
    const kcal = computeKcal(carbs, protein, fat);

    const existing = await repo.findOne({ where: { nameKey } });

    if (!existing) {
      await repo.save(
        repo.create({ name, nameKey, unit, carbs, protein, fat, kcal }),
      );
      created += 1;
      continue;
    }

    // Mise à jour seulement si une macro (ou l'unité) diffère.
    const differs =
      existing.unit !== unit ||
      Number(existing.carbs) !== carbs ||
      Number(existing.protein) !== protein ||
      Number(existing.fat) !== fat;

    if (!differs) {
      unchanged += 1;
      continue;
    }

    existing.unit = unit;
    existing.carbs = carbs;
    existing.protein = protein;
    existing.fat = fat;
    existing.kcal = kcal;
    await repo.save(existing);
    updated += 1;
  }

  await ds.destroy();

  console.log(
    `Import aliments terminé : ${created} créé(s), ${updated} mis à jour, ` +
      `${unchanged} inchangé(s)${skipped ? `, ${skipped} ignoré(s)` : ''}.`,
  );
}

main().catch((err) => {
  console.error('Échec de l’import des aliments :', err);
  process.exit(1);
});
