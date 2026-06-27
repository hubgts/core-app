# Module Finances — Spécification détaillée

> **Document de spécification fonctionnelle & UX/UI** · Version 1.1 · 2026-06-15
> Module **Finances** de l'application **Progression** (Module 3 du cadrage). Document autoporteur (le module est indépendant).
> Référence du périmètre global : [`mvp.md`](./mvp.md).
>
> **Changements v1.1** : le module est piloté par un **type d'enveloppe** (Espèces, Compte courant, Épargne, Investissement, Dette) qui détermine le formulaire et les stats — sur le même principe que le `type` d'évènement du module Entraînement. L'**Investissement** invite à renseigner, en plus du solde, la **plus-value** à chaque relevé. Le **solde (valeur) inclut déjà les plus-values** ; la PV n'est isolée que pour tracer la **performance** dans le temps. Affichage enrichi (courbe d'évolution, aire capital/plus-value, répartition). **Aucune notion de transaction** : on suit le **patrimoine global**, pas le détail des mouvements (le budget/dépenses fera l'objet d'un module séparé plus tard). *(Un PEA n'est pas un type : c'est simplement un nom d'enveloppe de type Investissement.)*

---

## 1. Intention & Philosophie

Le module Finances matérialise le **patrimoine dans le temps**. Son but n'est **ni
de faire du budget**, ni de suivre les dépenses au quotidien, mais d'offrir une
**photographie macro du patrimoine** et de **mesurer sa progression** relevé après
relevé.

L'unité de travail est l'**enveloppe** : un poste concret du patrimoine. On en crée
autant qu'on veut, chacune avec son **type** :

- 💵 **Espèces** — liquide.
- 💳 **Compte courant** — le compte du quotidien.
- 🐷 **Épargne** — un livret ou un pot dédié (ex. « Vacances », « Matelas de sécurité »).
- 📈 **Investissement** — un portefeuille (PEA, assurance-vie, CTO…), suivi en **valeur ET en plus-value**. Le solde renseigné est la **valeur de marché** (plus-values comprises).
- 🏦 **Dette / Crédit** — un passif (crédit immo, prêt) qui se **soustrait** du net.

Trois principes directeurs :

1. **Saisie macro, pas micro.** On photographie des **soldes** d'enveloppes (« mon
   épargne vacances est à 3 200 € »). **Aucune transaction**, aucune catégorie de
   dépense, aucun budget. La maille est l'enveloppe, jamais l'opération.
2. **La vue d'ensemble prime.** L'écran principal répond d'un coup d'œil à
   « combien je pèse, comment c'est réparti, et comment ça évolue ».
3. **L'historique nourrit la progression.** Chaque mise à jour de solde crée un
   **relevé daté** (snapshot). L'application en dérive l'**évolution** (courbe du
   net, variation €/%) et, pour l'investissement, la **performance** (plus-value
   dans le temps) — sans saisie supplémentaire.

Contrairement au module Habitudes (suivi **binaire** quotidien) ou Entraînement
(**journal d'évènements**), les Finances sont un **état patrimonial photographié
périodiquement** : peu de saisies, mais structurantes.

---

## 2. Concepts & Vocabulaire

| Terme | Définition |
|---|---|
| **Enveloppe** | Un poste concret du patrimoine (compte courant, épargne vacances, PEA…) avec son solde courant. Unité de base. |
| **Type d'enveloppe** | Détermine le formulaire de relevé et les stats. MVP : **Espèces**, **Compte courant**, **Épargne**, **Investissement**, **Dette**. |
| **Nature** | `Actif` ou `Passif`. **Dérivée du type** (Dette ⇒ Passif ; tous les autres ⇒ Actif). Gère le **signe** dans le net. |
| **Solde courant** | Dernière valeur connue de l'enveloppe (= montant du relevé le plus récent). |
| **Relevé / Snapshot** | Point d'historique **daté** d'une enveloppe : au minimum `{ date, montant }`. Une mise à jour de solde crée un relevé. |
| **Valeur (solde)** | (Investissement) Valeur de marché du portefeuille, **plus-values incluses**. C'est le `montant` du relevé. |
| **Plus-value (PV)** | (Investissement) Gain/perte latent contenu dans la valeur : `valeur − capital investi`. Saisie au relevé, peut être négative. |
| **Capital investi** | (Investissement) Argent réellement placé = `valeur − plus-value`. Dérivé. |
| **Performance** | (Investissement) `plus-value / capital investi` (%), à une date. |
| **Patrimoine net** | `Σ soldes des actifs − Σ soldes des passifs`, à une date donnée. |
| **Patrimoine brut** | `Σ soldes des actifs` (sans déduire les passifs). |
| **Répartition** | Part de chaque enveloppe (ou type) dans le patrimoine brut. |
| **Évolution** | Variation du patrimoine net (€ et %) entre deux dates de référence. |

---

## 3. Périmètre

### Dans le périmètre (MVP)
- **Créer / éditer / archiver** des enveloppes (`nom`, `type`, solde initial daté).
- **Mettre à jour le solde** d'une enveloppe → crée un **relevé daté** (snapshot).
- **Investissement** : saisir à chaque relevé la **valeur** (solde, PV incluses) ET la **plus-value** → suivi de la performance dans le temps.
- **Vue d'ensemble** : patrimoine net en tête, **courbe d'évolution**, **répartition** visuelle, liste des enveloppes **groupées par type**.
- **Détail par enveloppe** : historique des relevés + courbe ; pour l'investissement, **aire valeur / plus-value** et performance.
- **100 % saisie manuelle**, montants en euros.

### Hors périmètre (renvoyé en V2 — voir §10)
- **Dashboard** (agrégation multi-modules) — explicitement hors de ce lot.
- **Transactions / budget / dépenses** — *fera l'objet d'un module séparé*, pas ici.
- **Agrégation bancaire** automatique (Powens / Bridge / Plaid).
- **Objectifs d'épargne** par enveloppe, projections, simulations.
- **Multi-devises** ; valorisation automatique d'un portefeuille à partir des positions (cours temps réel).

---

## 4. Modèle de données

### 4.1 Socle — `Envelope`
Le poste patrimonial. Son `solde courant` n'est **pas** stocké en dur : il est
**dérivé du dernier `Snapshot`** (§6.2). Seul le solde **initial** est porté à la
création (matérialisé comme un premier relevé).

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `name` | string | Obligatoire, 1–60 car. Normalisé (trim). |
| `type` | enum | `especes` \| `compte_courant` \| `epargne` \| `investissement` \| `dette`. **Immuable après création** (changer de type = nouvelle enveloppe). |
| `nature` | enum (dérivé) | `passif` si `type = dette`, sinon `actif`. Non saisi. |
| `icon` / `color` | string \| null | Optionnel (affichage). |
| `archived` | bool | Défaut `false`. Une enveloppe archivée sort de la vue courante **sans effacer l'historique** (§6.4). |
| `createdAt` | datetime | Auto. |
| `updatedAt` | datetime | Auto. |

Le **contenu d'un relevé** dépend du `type` : socle commun (§4.2) pour tous, plus
le champ **plus-value** pour l'Investissement (§4.3).

### 4.2 Relevé socle — `Snapshot`
Point d'historique daté. **Source de vérité du solde.** Commun à **tous** les types.

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `envelopeId` | UUID | FK → `Envelope`. |
| `date` | date (YYYY-MM-DD) | Date du relevé. Date locale, sans heure. |
| `amount` | number | **Valeur / solde** en € à cette date. **≥ 0** (la nature porte le signe ; un passif se saisit en valeur positive). |
| `note` | string \| null | Commentaire libre optionnel (« après virement prime »). |
| `createdAt` | datetime | Auto. |

**Règles :**
- Le **solde courant** d'une enveloppe = `amount` du Snapshot de **date la plus récente** (à `date` égale, le plus récent `createdAt`).
- **Un seul relevé par enveloppe et par date** : re-saisir sur une date existante **écrase** ce relevé (upsert), il n'empile pas un doublon (§6.2).

### 4.3 Spécifique `investissement` (portefeuille)
Un relevé d'investissement porte, **en plus** du socle, la plus-value latente. Le
`amount` du socle reste la **valeur de marché (plus-values incluses)** ; `gain`
n'isole la PV que pour tracer **capital investi** et **performance** dans le temps.

| Champ | Type | Règles |
|---|---|---|
| `gain` | number \| null | **Plus-value latente** en € **comprise dans `amount`** (gain si > 0, perte si < 0). Optionnel mais mis en avant. |

**Dérivés (non stockés) :**
- **Capital investi** = `amount − gain`.
- **Performance** = `gain / (amount − gain)` (%), masquée si capital investi ≤ 0.

> *Exemple : valeur `amount = 64 000 €`, plus-value `gain = +9 000 €` ⇒ capital
> investi = 55 000 €, performance = +16,4 %.*

### 4.4 Grandeurs dérivées (calculées, non stockées)

| Grandeur | Formule |
|---|---|
| **Solde courant** | `amount` du dernier Snapshot (par date). |
| **Patrimoine brut** | `Σ soldes courants` des enveloppes de nature `actif` (non archivées). |
| **Total passifs** | `Σ soldes courants` des enveloppes de nature `passif` (non archivées). |
| **Patrimoine net** | `Patrimoine brut − Total passifs`. |
| **Patrimoine net à une date D** | Σ actifs − Σ passifs, en prenant pour chaque enveloppe son **dernier relevé ≤ D** (report du dernier solde connu, §6.3). |
| **Plus-value totale** | `Σ gain` des derniers relevés des enveloppes `investissement`. |
| **Répartition** | Part d'une enveloppe / d'un type = `solde courant / Patrimoine brut`. |
| **Variation du net** | `net(D) − net(D')` (€) et `/ net(D')` (%), entre deux dates de référence. |

---

## 5. Architecture des écrans (UX/UI)

> *Section force de proposition : l'objectif est un suivi patrimonial lisible —
> un chiffre clé en tête, une tendance, une répartition, puis le détail.*

### 5.1 Vue d'ensemble (écran d'atterrissage)

```
┌────────────────────────────────────────────────────────────────────┐
│  ← Finances                                        [ + Enveloppe ]   │
│                                                                      │
│   Patrimoine net                          Plus-values latentes       │
│   142 350 €   ▲ +2 150 € (+1,5 %)         +9 000 €  (+16,4 %)        │
│   depuis le 31 mai                        sur investissements        │
│                                                                      │
│   ┌─────────────── Évolution du patrimoine net ──────────────┐      │
│   │                                              ╭─────        │      │
│   │                         ╭───────────────────╯             │      │
│   │      ╭─────────────────╯                                  │      │
│   │  [ 3M · 6M · 12M · Tout ]                                 │      │
│   └───────────────────────────────────────────────────────────┘     │
│                                                                      │
│   Répartition (actifs)         Mes enveloppes                        │
│   ╭───────────╮                💵 Espèces            300 €    0,2 %  │
│   │ ◗ Invest. │  45 %          💳 Compte courant   3 200 €    2,2 %  │
│   │ ◖ Épargne │  31 %          🐷 Épargne vacances 3 200 €    2,2 %  │
│   │ ◗ Immo    │  22 %          🐷 Matelas sécurité 9 500 €    6,7 %  │
│   ╰───────────╯                📈 PEA             64 000 € ↑ 45 %    │
│                                ── Passifs ──                         │
│                                🏦 Crédit immo    −58 650 €           │
└────────────────────────────────────────────────────────────────────┘
```

- **Bandeau de tête** : **patrimoine net** + variation (€ et %) depuis une référence réglable ; à côté, un encart **plus-values latentes** (somme des PV d'investissement + performance globale).
- **Courbe d'évolution** du patrimoine net (période réglable : 3 / 6 / 12 mois / tout).
- **Répartition** (donut ou barres) des **actifs** par **type** (et drill par enveloppe).
- **Liste des enveloppes**, **groupées par type**, avec solde courant et part (%). Pour les enveloppes d'investissement, un indicateur de **performance** (↑/↓ %). Les **passifs** sont regroupés à part (signe négatif).
- **Clic sur une enveloppe** → détail (§5.3). Bouton **+ Enveloppe** (§5.2).

### 5.2 Création / édition d'une enveloppe

**Étape 1 — Choix du type** (à la création ; type immuable ensuite) : tuiles
💵 Espèces · 💳 Compte courant · 🐷 Épargne · 📈 Investissement · 🏦 Dette.

**Étape 2 — Formulaire court** :
- **Nom** (obligatoire) — ex. « Épargne vacances », « PEA Bourse » (nom libre ; un PEA est une enveloppe de type Investissement).
- **Solde initial** + **date** (défaut aujourd'hui) → crée le **premier relevé**.
- *(Si type = Investissement)* **Plus-value** initiale (optionnelle).
- Icône / couleur (optionnel).

Boutons : **Annuler** / **Enregistrer**. Validations en §6.

### 5.3 Détail d'une enveloppe + mise à jour de solde

**Cas général (Espèces / Compte courant / Épargne / Dette) :**
```
┌──────────────────────────────────────────────┐
│  🐷 Épargne vacances        [Éditer] [···]     │
│  Épargne · Actif                               │
│                                                │
│  Solde courant     3 200 €                     │
│  au 12 juin 2026   ▲ +200 € depuis le relevé   │
│   [ + Mettre à jour le solde ]                 │
│                                                │
│  ── Historique ──        ╭── courbe du solde ──╮│
│   12 juin  3 200 € ▲+200 │      ╭──────────────││
│   31 mai   3 000 € ▲+500 │  ╭──╯                ││
│   30 avr.  2 500 € ▲+250 │ ─╯                   ││
└──────────────────────────────────────────────┘
```

**Cas Investissement — valeur (PV incluses) + plus-value :**
```
┌──────────────────────────────────────────────┐
│  📈 PEA Bourse              [Éditer] [···]     │
│  Investissement · Actif                        │
│                                                │
│  Valeur     64 000 €     Plus-value  +9 000 €  │
│  Capital    55 000 €     Perf.        +16,4 %  │
│   [ + Mettre à jour ]                          │
│                                                │
│  ── Valeur & plus-value dans le temps ──       │
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░  ← aire empilée          │
│   ▓ capital investi   ░ plus-value latente     │
│                                                │
│  ── Historique des relevés ──                  │
│   12 juin  64 000 €  PV +9 000 €  (+16,4 %)    │
│   31 mai   62 200 €  PV +7 700 €  (+14,1 %)    │
└──────────────────────────────────────────────┘
```

- **En-tête** : icône, nom, type · nature, **solde/valeur courant** + date + variation vs. relevé précédent. Pour l'investissement : **valeur, plus-value, capital, performance**.
- **Action principale : « Mettre à jour le solde »** → `montant` + `date` (défaut aujourd'hui) + note ; *(investissement)* champ **plus-value** en plus ⇒ crée/écrase un relevé (§6.2).
- **Visualisation** : courbe du solde (cas général) ; **aire empilée capital + plus-value** pour l'investissement (on voit la part « effort d'épargne » vs « performance marché »).
- **Historique des relevés** + actions secondaires : **Éditer**, **Archiver**, **Supprimer un relevé**, **Supprimer l'enveloppe** (confirmation, cascade).

### 5.4 Mise à jour de solde — saisie express
Inline/modale minimale : **montant** (clavier numérique), **date** pré-remplie à
aujourd'hui, **note** optionnelle, **+ plus-value** pour l'investissement. Pensée
pour une saisie de quelques secondes lors d'un « point patrimoine » mensuel.

> **Mode « Faire le point » (confort)** : parcourir les enveloppes une à une pour
> saisir le solde du jour de chacune en série. *(Reco MVP : optionnel, voir §9.)*

---

## 6. Règles de gestion détaillées

### 6.1 Enveloppes & types
- **RG-01** — Une enveloppe a un **nom obligatoire** et un **type** parmi les 5 du MVP. La **nature** (actif/passif) en est dérivée (Dette ⇒ Passif, sinon Actif).
- **RG-02** — Le **type est choisi à la création et immuable** ; pour le corriger, archiver/supprimer et recréer.
- **RG-03** — Une enveloppe est créée avec un **solde initial daté** → matérialisé par un **premier relevé** (§6.2). Défaut : 0 à aujourd'hui.

### 6.2 Relevés (snapshots) & solde courant
- **RG-04** — Mettre à jour le solde **crée un relevé** `{ date, montant }`. Le **solde courant** est toujours le relevé de **date la plus récente**.
- **RG-05** — **Un seul relevé par enveloppe et par date** : saisir un montant sur une date déjà présente **écrase** (upsert) le relevé existant.
- **RG-06** — Le `montant` se saisit en **valeur positive** ; la `nature` détermine son signe dans le net (un passif est **soustrait**).
- **RG-07** — Supprimer un relevé **recalcule** le solde courant (retombe sur le précédent). Supprimer le dernier relevé restant ramène l'enveloppe à « sans solde » (exclue des totaux jusqu'à nouveau relevé).

### 6.3 Investissement & plus-value
- **RG-08** — Un relevé d'investissement peut porter une **plus-value** (`gain`, €, **signe libre** : gain ou perte). Si absente, la performance n'est pas calculée pour ce relevé.
- **RG-09** — **Capital investi** = `montant − plus-value` ; **performance** = `plus-value / capital investi` (masquée si capital ≤ 0).
- **RG-10** — La **plus-value latente totale** du patrimoine = `Σ gain` des derniers relevés des enveloppes d'investissement.

### 6.4 Calcul du patrimoine & évolution
- **RG-11** — **Patrimoine net** = `Σ soldes actifs − Σ soldes passifs`, enveloppes **non archivées**.
- **RG-12** — Pour le **net à une date D** (courbe), chaque enveloppe contribue avec son **dernier relevé de date ≤ D** (**report du dernier solde connu** ; sans relevé avant D, elle ne contribue pas).
- **RG-13** — La **variation** = `net(maintenant) − net(référence)` en € et en %. Référence par défaut = **fin du mois précédent** (réglable : relevé précédent / début d'année). % masqué si la référence vaut 0.
- **RG-14** — La **répartition** se calcule sur le **patrimoine brut** (actifs uniquement) ; les passifs sont présentés à part.

### 6.5 Archivage, suppression & formats
- **RG-15** — **Archiver** retire l'enveloppe des totaux et de la vue courante **sans supprimer ses relevés** (réactivation possible).
- **RG-16** — **Supprimer** une enveloppe est **destructif** (cascade sur tous ses relevés) → **confirmation explicite** ; l'archivage est à privilégier.
- **RG-17** — Montants en **euros**, 2 décimales max, séparateurs localisés (FR). Saisie permissive (`8200`, `8 200`, `8200,50`).
- **RG-18** — Date de relevé passée ou aujourd'hui ; future autorisée mais **déconseillée** (deviendrait « solde courant » à tort) → **avertissement non bloquant**.

---

## 7. Micro-interactions & Feedback

- **Mise à jour de solde** : variation (▲/▼ + montant + %) affichée immédiatement vs. relevé précédent ; net, répartition et plus-value totale recalculés en direct (optimistic UI ; rollback + toast en cas d'échec).
- **Saisie express** : clavier numérique, date pré-remplie à aujourd'hui, validation à l'Entrée ; champ plus-value qui apparaît uniquement pour l'investissement.
- **Référence d'évolution** : bascule rapide (fin de mois précédent / relevé précédent / début d'année) qui met à jour variation et courbe.
- **Répartition interactive** : survol/clic d'un segment met en évidence l'enveloppe/type dans la liste.
- **Aire valeur/plus-value** (investissement) : distinction visuelle nette entre **capital investi** et **performance marché**.
- **Confirmation de suppression** (rappel du nombre de relevés perdus + proposition d'archiver).
- **Jalons de patrimoine** (donnée pour le futur moteur de points) : franchissement d'un palier net (ex. 100 000 €, +10 %) → évènement `milestone_reached { type, value, date }` persistant + toast non bloquant.

---

## 8. Accessibilité & Responsive

- **Clavier** : navigation dans la liste des enveloppes (flèches), Entrée pour ouvrir / saisir un solde ; formulaires entièrement utilisables au clavier.
- **Lecteurs d'écran** : le bandeau annonce « Patrimoine net {montant}, variation {±montant} ({±%}) depuis {référence} » ; chaque enveloppe annonce « {nom}, {type}, solde {montant}, {part} % » (+ performance pour l'investissement).
- **Couleur non porteuse seule** : actif/passif, hausse/baisse, gain/perte signalés par **icône + signe**, pas uniquement par la couleur.
- **Cibles tactiles** : lignes d'enveloppe et boutons ≥ 40 px sur mobile.
- **Mobile** : vue d'ensemble en colonne unique (net → courbe → répartition → liste) ; détail et saisie en plein écran ; **claviers numériques** pour les montants.

---

## 9. Cas limites & Questions ouvertes

**Cas limites traités :**
- Enveloppe **sans aucun relevé** → exclue des totaux jusqu'à première saisie.
- **Référence d'évolution à 0** (patrimoine de départ nul) → variation en € affichée, **% masqué** (RG-13).
- Relevés d'enveloppes à des **dates différentes** → la courbe reporte le **dernier solde connu** par enveloppe (RG-12).
- **Plus-value négative** (perte latente) → autorisée, performance négative affichée.
- **Patrimoine net négatif** (passifs > actifs) → affiché tel quel, pas d'erreur.
- Re-saisie d'un solde sur une **date existante** → upsert (écrase), pas de doublon (RG-05).
- **Archivage vs suppression** → l'archivage préserve l'historique et la cohérence des courbes passées.
- Relevé à **date future** → avertissement non bloquant (RG-18).

**Questions ouvertes à trancher avec le PO :**
1. **Plus-value : saisie directe ou dérivée du capital ?** Option A : on saisit `valeur` + `plus-value` (reco, le plus simple à lire sur une appli broker). Option B : on saisit `valeur` + `capital investi` et la PV se déduit. → *Reco : A.*
2. **Référence de variation par défaut** : fin du mois précédent (reco) ou dernier relevé précédent ?
3. **Granularité de la courbe** : points = relevés réels, ou ré-échantillonnage **mensuel** (fin de mois) pour lisser ? → *Reco : agrégation mensuelle.*
4. **Mode « Faire le point »** (saisie groupée guidée) dans le MVP, ou backlog ?
5. **Types personnalisables** par l'utilisateur, ou liste figée des 5 au MVP ? → *Reco : figée au MVP.*

---

## 10. Backlog / Évolutions futures (V2+)

- **Module Dépenses / Budget** (transactions, catégories, suivi du reste-à-vivre) — **module séparé**, descente sous la maille « solde ».
- **Dashboard** (agrégation multi-modules) — lot séparé.
- **Agrégation bancaire** automatique (Powens / Bridge / Plaid) → soldes sans saisie.
- **Investissement avancé** : positions/lignes du portefeuille, valorisation au cours du marché, dividendes, versements programmés (DCA), TRI/IRR.
- **Objectifs d'épargne** par enveloppe + **projections** (atteinte d'un palier à rythme constant).
- **Multi-devises** et conversion.
- ~~**Gamification** (sur les données déjà produites) : points sur jalons de patrimoine et régularité des relevés.~~ → **✅ Implémenté** (v1) : barème **figé**, sans personnalisation, **calculé à la volée** (non persisté). Voir [`docs/finances/technique.md`](../docs/finances/technique.md) §5.4. Niveaux ⇒ évolution future.
- **Export** (CSV / PDF), bilan annuel « Wrapped » patrimonial.

---

## 11. Critères d'acceptation (récapitulatif testable)

- [ ] Je peux **créer une enveloppe** en choisissant un **type** parmi 5 (Espèces, Compte courant, Épargne, Investissement, Dette), avec un solde initial daté ; le type n'est plus modifiable après création.
- [ ] La **nature** (actif/passif) est dérivée du type (Dette ⇒ Passif) et porte le bon signe dans le net.
- [ ] Je peux **mettre à jour le solde** d'une enveloppe ; cela crée un **relevé daté**, et le **solde courant** reflète le relevé le plus récent.
- [ ] Pour une enveloppe **Investissement**, je saisis **valeur + plus-value** ; l'appli affiche **capital investi** et **performance**, et trace **valeur & plus-value dans le temps**.
- [ ] Saisir un solde sur une **date déjà existante écrase** le relevé (pas de doublon).
- [ ] La vue d'ensemble affiche le **patrimoine net** (= Σ actifs − Σ passifs), sa **variation** (€/%) depuis une référence réglable, et la **plus-value latente totale**.
- [ ] La **répartition** des actifs (par type / enveloppe) est affichée visuellement et somme à 100 %.
- [ ] La **courbe d'évolution** du patrimoine net reporte, à chaque date, le dernier solde connu de chaque enveloppe.
- [ ] Le **détail d'une enveloppe** liste ses relevés et trace une courbe (aire valeur/plus-value pour l'investissement).
- [ ] **Archiver** retire l'enveloppe des totaux sans effacer l'historique ; **supprimer** demande confirmation et cascade sur les relevés.
- [ ] Le module **ne contient aucune notion de transaction** ; il suit le patrimoine à la maille de l'enveloppe.
- [x] Le franchissement d'un **palier de patrimoine** rapporte des **points** (gamification). *Choix d'implémentation : pas d'évènement persistant — les points sont **dérivés à la volée** du net et des relevés (jalons + régularité), barème figé. Voir `docs/finances/technique.md` §5.4.*
