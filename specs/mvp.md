# Progression — Spécifications Fonctionnelles MVP

> **Document de cadrage produit** · Version 2.0 · 2026-06-13
> Application personnelle de *Life Tracking* — Mesurer et piloter sa progression globale.

---

## 1. Vision du MVP

**Progression** part d'un constat simple : on ne progresse durablement que sur ce que l'on mesure, et on abandonne d'autant plus vite qu'un outil devient une corvée.

L'application s'articule autour de **3 modules totalement indépendants**, chacun avec sa propre interface adaptée à son usage :

1. **🏋️ Physique** — un **calendrier** d'entraînements (un ou plusieurs événements par jour).
2. **✅ Habitudes** — un **mur de cases à cocher** mensuel (le mois en cours d'un coup d'œil).
3. **💰 Finances** — une **vue par enveloppes** du patrimoine (compte courant, épargne, PEA…).

Chaque module fonctionne et a de la valeur **seul**. Au-dessus d'eux, un **Dashboard** agrège les signaux clés des trois modules pour répondre à une question : *« Où en suis-je en ce moment ? »*.

Un **système de gamification** (points gagnés via les habitudes tenues, les streaks et les paliers atteints) est prévu comme couche transverse, mais **traité ultérieurement** — il n'est pas dans le périmètre de build du MVP. On se contente, au MVP, de produire **les données qui l'alimenteront** (streaks, paliers).

**Principe directeur anti-usine-à-gaz :** au MVP, on saisit vite, sans champ obligatoire superflu, et chaque module reste cantonné à son rôle.

---

## 2. Spécifications Fonctionnelles par Module

> ⚠️ **Indépendance des modules :** chaque module possède son propre modèle de données, sa propre interface et sa propre logique. Aucun ne dépend d'un autre pour fonctionner. Le Dashboard ne fait que **lire** les modules, il ne les couple pas entre eux.

---

### 🏋️ Module 1 — Physique (Calendrier d'entraînements)

**Description macro :** Une vue **calendrier** (mensuelle, avec accès au détail d'un jour) sur laquelle l'utilisateur crée un ou plusieurs **événements d'entraînement par jour**. Chaque événement a un **type** qui détermine son formulaire de saisie et les **statistiques** que l'on peut en tirer. Le MVP gère 4 types : **Musculation**, **Padel — Match**, **Padel — Tournoi**, et **Autre**.

**User Stories :**

- *En tant qu'utilisateur, je veux voir un calendrier mensuel de mes entraînements, afin de visualiser ma pratique et mes jours d'activité en un coup d'œil.*
- *En tant qu'utilisateur, je veux créer un ou plusieurs événements d'entraînement sur un jour donné, afin de logger toutes mes séances (même plusieurs dans la journée).*
- *En tant qu'utilisateur, je veux choisir le type d'événement (Musculation, Padel — Match, Padel — Tournoi, Autre), afin d'avoir un formulaire adapté et des stats pertinentes.*
- *En tant qu'utilisateur, je veux détailler mes exercices de musculation (nom, séries, reps, charge), afin d'en tirer des stats de progression (tonnage, charge max…).*
- *En tant qu'utilisateur, je veux enregistrer le résultat de mes matchs et tournois de padel, afin d'en tirer des statistiques (ratio victoires/défaites, etc.).*

**Règles de gestion / Critères d'acceptation :**

- Le calendrier affiche le **mois en cours** par défaut, avec navigation mois précédent / suivant.
- Un jour peut contenir **0, 1 ou plusieurs** événements ; les jours avec activité sont marqués visuellement (pastille colorée par type / nombre de séances).
- Tout événement partage un **socle commun** : `date`, `type`, `durée` (minutes, optionnelle), `ressenti` (1–5, optionnel).
- Créer un événement se fait en cliquant sur un jour ; modification et suppression possibles depuis le détail du jour.

**Détail des 4 types d'événement :**

| Type | Champs spécifiques | Stats visées |
|---|---|---|
| **💪 Musculation** | Liste d'`exercices`, chacun = `{ nom, séries[ { reps, charge } ] }` | Tonnage (Σ séries × reps × charge), charge max par exercice, volume dans le temps, records personnels (PR) |
| **🎾 Padel — Match** | `partenaire`, `adversaires`, `score` (sets), `résultat` (Victoire/Défaite) | Ratio V/D des matchs amicaux, nombre de matchs, séries de victoires |
| **🏆 Padel — Tournoi** | `nom_tournoi`, `partenaire`, `résultat`/`classement`, `nb_matchs`, `notes` | Ratio V/D en tournoi, nombre de tournois, meilleurs résultats |
| **📝 Autre** | `titre`, `description` | Volume d'activité, régularité globale |

**Règles spécifiques :**
- **Musculation** : un exercice contient un nom et une ou plusieurs séries ; chaque série porte `reps` (répétitions) et `charge` (kg). Le **tonnage** d'une séance = `Σ (reps × charge)` sur toutes les séries. La **charge max** est suivie par exercice (`nom`) pour tracer la progression dans le temps.
- Le `nom` d'exercice doit pouvoir être **réutilisé** d'une séance à l'autre (autocomplétion sur les exercices déjà saisis) afin que les stats de progression se consolident par exercice.
- **Padel — Match / Tournoi** : `résultat` ∈ { Victoire, Défaite } (et éventuellement Nul) ; le `score` est libre (ex : « 6-3 / 4-6 / 6-2 »). Les stats de padel séparent **matchs amicaux** et **tournois**.
- **Autre** : `titre` obligatoire, `description` libre ; pas de stat structurée, sert au suivi de régularité.
- La liste des types est **extensible** en V2 (course, vélo… avec leurs propres formulaires), sans remettre en cause le socle commun.
- **Donnée alimentant le Dashboard :** nombre de séances sur la semaine/mois en cours, et indicateurs par type (ex : tonnage du mois, ratio V/D padel).

---

### ✅ Module 2 — Habitudes (Mur de cases mensuel)

**Description macro :** Un **tableau mensuel** de type « habit tracker » : en lignes les habitudes, en colonnes les jours du mois en cours. L'utilisateur **coche une case** quand l'habitude est tenue un jour donné. C'est le cœur de la discipline : un mur visuel et satisfaisant qui matérialise la constance et la « chaîne à ne pas casser ».

**User Stories :**

- *En tant qu'utilisateur, je veux définir ma liste d'habitudes à suivre, afin de structurer ma discipline.*
- *En tant qu'utilisateur, je veux voir le mois en cours sous forme de grille (habitudes × jours), afin d'avoir une vision globale de ma régularité.*
- *En tant qu'utilisateur, je veux cocher / décocher une case (habitude × jour), afin d'enregistrer si j'ai tenu l'habitude ce jour-là.*
- *En tant qu'utilisateur, je veux voir mon streak (jours consécutifs) par habitude, afin d'être incité à ne pas casser la chaîne.*

**Règles de gestion / Critères d'acceptation :**
- L'affichage par défaut est la **grille du mois en cours** ; navigation mois précédent / suivant.
- Une **habitude** comporte : `nom`, `couleur/icône` (optionnel), `active` (booléen).
- Le suivi est **binaire** par cellule (habitude × jour) : coché / non coché.
- L'utilisateur peut cocher **n'importe quel jour passé du mois affiché** (correction d'oublis), mais **pas un jour futur**.
- Le **streak** d'une habitude = nombre de jours consécutifs cochés jusqu'à aujourd'hui ; rompu dès qu'un jour est manqué.
- Désactiver une habitude la retire de la grille courante **sans effacer l'historique**.
- **Donnée alimentant le Dashboard :** taux de complétion du mois, streak en cours par habitude, paliers atteints (ex : 7, 30, 100 jours) — ces paliers serviront de base au futur système de points.

---

### 💰 Module 3 — Finances (Vue par enveloppes)

**Description macro :** Une **vue globale par enveloppes** du patrimoine. Chaque enveloppe représente un poste (compte courant, bloc d'épargne, PEA, etc.) avec son solde courant. L'application affiche le **total patrimonial** et son évolution dans le temps via des relevés. Suivi **macro** : on photographie les soldes, on ne suit ni les transactions ni le budget détaillé.

**User Stories :**

- *En tant qu'utilisateur, je veux créer mes enveloppes (compte courant, épargne, PEA…), afin de structurer ma vue patrimoniale.*
- *En tant qu'utilisateur, je veux mettre à jour le solde de chaque enveloppe, afin de refléter ma situation à date.*
- *En tant qu'utilisateur, je veux voir mon patrimoine total et sa répartition par enveloppe, afin d'avoir une vue globale immédiate.*
- *En tant qu'utilisateur, je veux visualiser l'évolution de mon patrimoine dans le temps, afin de mesurer ma progression financière.*

**Règles de gestion / Critères d'acceptation :**
- Une **enveloppe** comporte : `nom`, `catégorie` (Compte courant, Épargne, Investissement/PEA, Immobilier, Dette/Crédit…), `nature` (Actif / Passif), `solde_courant`.
- Le **patrimoine net** = `Σ soldes des actifs − Σ soldes des passifs`.
- Une **mise à jour de solde** crée un point d'historique daté (snapshot), pour tracer l'évolution.
- L'évolution affichée = variation absolue et en % vs. relevé précédent (ou vs. début de mois).
- Affichage de la **répartition** (part de chaque enveloppe dans le total) sous forme visuelle (barres / camembert).
- Montants en euros ; la nature (actif/passif) gère le signe dans le calcul du net.
- Aucune connexion bancaire au MVP : **100 % saisie manuelle**.
- **Donnée alimentant le Dashboard :** patrimoine net actuel et variation depuis le dernier relevé.

---

### 📊 Le Dashboard (agrégateur, en lecture seule)

**Description macro :** Écran d'accueil qui **lit** les 3 modules et présente l'essentiel sans les coupler. Objectif : un coup d'œil = mon état du moment.

**Contenu MVP :**
- **Physique** : nombre de séances cette semaine / ce mois.
- **Habitudes** : taux de complétion du mois + meilleur streak en cours.
- **Finances** : patrimoine net + variation depuis le dernier relevé.
- Accès rapide vers chaque module.

> Le Dashboard est volontairement simple au MVP. C'est lui qui accueillera plus tard le **score global** et la couche de gamification.

---

## 3. Pistes d'Évolutions Futures (Backlog / V2+)

### 🎮 Gamification (prévue, traitée plus tard)
- **Système de points** : chaque habitude tenue, chaque **streak** maintenu et chaque **palier** atteint (entraînements, jours d'habitude, jalons de patrimoine) rapporte des points.
- **Niveaux & paliers** par module et score global agrégé sur le Dashboard.
- **Badges / jalons** : « 30 jours d'affilée », « 100 séances », « +10% de patrimoine ».
- *Note : le MVP produit déjà les données nécessaires (streaks, paliers) pour brancher cette couche sans refonte.*

### 🤖 Intelligence & Insights
- Bilan hebdomadaire automatique généré par IA (synthèse en langage naturel).
- Détection de corrélations entre modules (sport ↔ habitudes ↔ humeur).
- Suggestions d'objectifs réalistes basées sur l'historique.

### 🔌 Automatisations & Intégrations
- **Finances** : agrégation bancaire (Powens / Bridge / Plaid) pour des soldes automatiques.
- **Physique** : import depuis Strava, Apple Health, Google Fit.
- Rappels intelligents / notifications aux moments habituels de saisie.

### 🚀 Expérience & Suivi avancé
- **Physique** : modèles de séances réutilisables, graphiques de progression par exercice, alertes de nouveau record (PR), nouveaux types d'activité (course, vélo…) avec stats dédiées.
- **Habitudes** : fréquences flexibles (3×/semaine), habitudes non binaires (quantité / durée).
- **Finances** : objectifs d'épargne par enveloppe, projections.
- Export de données (CSV/PDF), bilan annuel « Wrapped ».

---

### Annexe — Recommandations de cadrage technique (non engageantes)
- **3 modules découplés** : chacun son modèle de données et son écran ; le Dashboard consomme une vue agrégée en lecture seule. Cela permet de développer, tester et faire évoluer chaque module isolément.
- **MVP mono-utilisateur, local-first** : pas d'authentification complexe au départ.
- **Anticiper la gamification sans la coder** : exposer dès le MVP les événements « palier atteint » / « streak » dans les données, pour brancher le moteur de points plus tard.
- **Priorité de build suggérée** : 1) Habitudes (le plus simple et le plus engageant au quotidien), 2) Physique (calendrier), 3) Finances (enveloppes), 4) Dashboard (une fois les modules alimentés).
