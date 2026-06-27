# Module Tableau de bord — Documentation technique

> Comment le tableau de bord fonctionne **côté code**. Pour l'usage fonctionnel,
> voir [`utilisation.md`](./utilisation.md).
>
> ⚠️ Ce document décrit **uniquement ce qui est implémenté** aujourd'hui.

---

## 1. Nature du module

Le tableau de bord n'a **ni entité ni service backend**. C'est une page frontend
unique, [`frontend/src/pages/DashboardPage.jsx`](../../frontend/src/pages/DashboardPage.jsx)
(+ `DashboardPage.css`), montée sur la route `/`. Elle **agrège** les API des
autres modules ; conformément à l'architecture, **aucun calcul métier** n'y est
fait — uniquement de l'agrégation d'affichage (la complétion d'habitudes reprend
la logique du module habitudes).

## 2. Données chargées

Au montage, un seul `Promise.all` (`weekFrom` = lundi courant, `weekTo` = +6 j) :

| Source | Appel | Usage |
|---|---|---|
| habitudes | `habitsApi.list(today)` | habitudes du jour |
| habitudes | `habitsApi.checksInRange(from, to)` | coches de la semaine (Set `habitId|date`) |
| entraînement | `trainingApi.events(weekFrom, weekTo)` | séances du jour et de la semaine |
| finances | `financesApi.overview(12, today)` | `netWorth`, `variation`, `kpis`, `netObjective`, `evolution` (12 mois) + `envelopes` décorées (dont `trend30`) |

## 3. Structure de la page

En-tête (salutation + date) avec un sélecteur **Aujourd'hui / Semaine** (`tab`).
Selon `tab`, `TodayView` ou `WeekView` est rendue ; les deux partagent le bloc
`EnvelopesPanel`.

- **Habitudes**
  - `TodayView` : liste `dtoday`, chaque habitude cochée ou non
    (`checks.has('habitId|today')`).
  - `WeekView` : grille `dwk` — 7 pastilles jour (`weekDates`), état par jour
    (`--on` coché / `--off` futur ou avant création / `--miss` passé non coché),
    compteur `count/weeklyTarget`, et un anneau `Ring` de complétion globale
    (`habitCompletion`).
- **Séance** (`dsessions`) : `events.filter(e.date === today)` pour le jour
  (sinon « repos ») ; toutes les séances triées par date pour la semaine.
- **Patrimoine global** (`PatrimoinePanel`, zone `dfin`) : `finances.netWorth`,
  chips `variation` (vs mois précédent), `kpis.oneYear`, progression
  `netObjective`, puis la courbe `NetWorthChart` sur `finances.evolution`
  (12 mois).
- **Enveloppes** (`EnvelopesPanel`, `denvs`) : chaque `finances.envelopes[i]`
  avec solde et tendance 30 j.

## 4. Tendance d'une enveloppe (`envTrend`)

S'appuie sur le champ **`trend30`** calculé côté backend (voir
[`docs/finances/technique.md`](../finances/technique.md), §5.1) : `{ amount, pct }`
= solde courant − solde ~30 j auparavant.

- Flèche : `↑` si `amount > 0`, `↓` si `< 0`, `→` si stable, `·` si `trend30`
  est `null` (historique insuffisant).
- Couleur (`t-up` / `t-down` / `t-flat`) : **favorabilité** selon la nature —
  pour un `passif`, une hausse du solde est défavorable (le sens est inversé).

## 5. Conventions respectées

- Couleurs des SVG (`Ring`) en **hex concret** (objet `COLORS`), jamais `var(--…)`.
- Helpers partagés réutilisés : `formatEur/formatSignedEur/formatSignedPct`
  (`components/finances/constants`), `formatDuration` (`utils/format`),
  `utils/date`.
- Thème sombre ; panneaux `.dpanel--*` colorés par module au survol.
