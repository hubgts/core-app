// Génère data/foods.sql à partir de data/foods.json (aucune dépendance).
//   node data/gen-foods-sql.mjs
//
// Le SQL produit fait un INSERT ... ON CONFLICT (name_key) idempotent : crée
// l'aliment absent, met à jour seulement si une macro (ou l'unité) diffère,
// laisse le reste intact. Calcule name_key (nom normalisé) et kcal (4·G+4·P+9·L).
// À rejouer après toute modification de foods.json. Import : `make import-foods`.
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const dir = dirname(fileURLToPath(import.meta.url));
const foods = JSON.parse(fs.readFileSync(join(dir, 'foods.json'), 'utf8'));

const norm = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;
const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));
const esc = (s) => s.replace(/'/g, "''");

const rows = foods.map((f) => {
  const carbs = r2(clamp(f.carbs));
  const protein = r2(clamp(f.protein));
  const fat = r2(clamp(f.fat));
  const kcal = r1(4 * carbs + 4 * protein + 9 * fat);
  const unit = f.unit === 'ml' ? 'ml' : 'g';
  return `  (gen_random_uuid(), '${esc(f.name)}', '${esc(norm(f.name))}', '${unit}', ${carbs}, ${protein}, ${fat}, ${kcal})`;
});

const sql = `-- Import idempotent des aliments (macros pour 100 g/ml).
-- Généré depuis data/foods.json par data/gen-foods-sql.mjs — NE PAS éditer à la
-- main (régénérer : node data/gen-foods-sql.mjs).
--
-- Lancement : voir la cible « make import-foods » (local Docker ou prod native).
--
-- Règle rejouable : insère si absent ; met à jour SEULEMENT si une macro (ou
-- l'unité) diffère ; sinon ne touche pas la ligne. Rapprochement par name_key
-- (contrainte d'unicité uq_foods_name).

INSERT INTO foods (id, name, name_key, unit, carbs, protein, fat, kcal) VALUES
${rows.join(',\n')}
ON CONFLICT (name_key) DO UPDATE SET
  name    = EXCLUDED.name,
  unit    = EXCLUDED.unit,
  carbs   = EXCLUDED.carbs,
  protein = EXCLUDED.protein,
  fat     = EXCLUDED.fat,
  kcal    = EXCLUDED.kcal
WHERE
  foods.unit    IS DISTINCT FROM EXCLUDED.unit
  OR foods.carbs   IS DISTINCT FROM EXCLUDED.carbs
  OR foods.protein IS DISTINCT FROM EXCLUDED.protein
  OR foods.fat     IS DISTINCT FROM EXCLUDED.fat;
`;

fs.writeFileSync(join(dir, 'foods.sql'), sql);
console.log('Écrit data/foods.sql —', rows.length, 'aliments');
