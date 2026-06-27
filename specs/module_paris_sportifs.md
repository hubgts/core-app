# Module Paris Sportifs — Spécification détaillée

> **Document de spécification fonctionnelle & UX/UI** · Version 0.1 (brouillon de cadrage) · 2026-06-16
> Module **Paris Sportifs** de l'application **Progression**. Document autoporteur (le module est indépendant).
> Référence du périmètre global : [`mvp.md`](./mvp.md). S'aligne sur les conventions des modules existants
> ([`module_finances.md`](./module_finances.md), [`module_entrainement.md`](./module_entrainement.md)) :
> backend NestJS (un module par domaine), front React/Vite, **catégories gérées dans le Référentiel**.
>
> **Statut** : résumé de cadrage avant développement. À valider avant d'écrire le code.

---

## 1. Intention & Philosophie

Le module Paris Sportifs permet de **gérer ses paris** et de **suivre la progression d'une bankroll**
dans le temps, comme on suivrait la performance d'un portefeuille (parallèle assumé avec le module Finances,
mais ici l'unité est le **pari**, pas le solde photographié).

L'unité de travail est le **pari (ticket)** : **simple** (une sélection) ou **combiné** (plusieurs
sélections dont les cotes se multiplient). Chaque pari est **rattaché à une bankroll**.

La **bankroll** est un **conteneur de paris** doté d'un **capital de départ**. Elle matérialise une
stratégie / une période de jeu et porte **toutes les statistiques** : nombre de paris, bénéfice, ROI,
progression (ROC), TWR, TRI, taux de réussite, drawdown, séries, etc.

Trois principes directeurs :

1. **Le pari est la maille.** On saisit des tickets (mise, cote, statut). Le solde de la bankroll
   se **dérive** des paris réglés et des mouvements de caisse — on ne saisit jamais un solde à la main.
2. **Le statut pilote l'argent.** Chaque pari a un statut (en cours, gagné, perdu, remboursé, annulé,
   éventuellement cash out) qui détermine de façon **déterministe** le retour, le bénéfice et l'impact
   sur le capital (§4.4 et §6).
3. **La bankroll raconte une progression.** À partir des paris réglés (triés par date de règlement),
   on reconstitue une **courbe de capital** et on en dérive performance et risque (progression, TWR,
   TRI, drawdown, séries).

---

## 2. Concepts & Vocabulaire

| Terme | Définition |
|---|---|
| **Bankroll** | Conteneur de paris doté d'un **capital de départ**. Porte les stats et la courbe de progression. Unité de suivi. |
| **Capital de départ** | Mise de fond initiale de la bankroll (à la création). Base de la **Progression (ROC)**. |
| **Mouvement de caisse** | **Dépôt** (recharge) ou **retrait** daté sur la bankroll, hors résultat des paris. Modifie le capital sans être un pari. |
| **Pari / Ticket** | Une mise engagée sur un ou plusieurs résultats. **Simple** (1 sélection) ou **Combiné** (≥ 2 sélections). |
| **Sélection (leg)** | Une prédiction élémentaire d'un pari : sport, évènement, marché, choix, **cote**, statut. Un simple = 1 sélection ; un combiné = N. |
| **Mise (stake)** | Montant engagé sur le ticket (€). |
| **Cote (odds)** | Multiplicateur décimal. Combiné : **produit des cotes des sélections** (sélections remboursées ramenées à 1,00). |
| **Retour (payout)** | Montant rendu au règlement : `mise × cote` si gagné, `mise` si remboursé, `0` si perdu, `cashout` si cash out. |
| **Bénéfice (profit)** | `Retour − mise − commission`. Gagné ⇒ `mise × (cote − 1) − commission` ; perdu ⇒ `−mise` ; remboursé/annulé ⇒ `0`. |
| **Statut** | État de règlement d'un pari : **en cours**, **gagné**, **perdu**, **remboursé**, **annulé** (+ **cash out** optionnel). §4.4. |
| **Capital actuel** | `Capital de départ + Σ dépôts − Σ retraits + Σ bénéfices (paris réglés)`. |
| **ROI / Yield** | `Bénéfice / Mises jouées` (%). Rendement par euro misé. |
| **Progression (ROC)** | `Bénéfice / Capital de départ` (%). Croissance de la bankroll. |
| **TWR** | *Time-Weighted Return* : rendement enchaîné par sous-périodes, **neutralise** l'effet des dépôts/retraits. |
| **TRI** | *Taux de Rentabilité Interne* (IRR, pondéré par l'argent et le temps) sur les flux datés (mises, gains, mouvements, capital final). |
| **Drawdown (max)** | Plus forte baisse pic-à-creux de la courbe de capital (€ et %). Mesure de risque. |
| **CLV** | *Closing Line Value* : écart entre la cote prise et la **cote de clôture**, indicateur de qualité de la prise de position (optionnel). |

---

## 3. Périmètre

### Dans le périmètre (MVP)
- **Créer / éditer / archiver** une **bankroll** (`nom`, `capital de départ`, devise €).
- **Ajouter des paris** à une bankroll : **simple** ou **combiné** (N sélections, cote = produit).
- Chaque sélection porte un **sport** (MMA, Football au MVP) + évènement, marché, choix, cote.
- **Régler un pari** via son statut : **en cours / gagné / perdu / remboursé / annulé** (cash out en option, §10).
- **Mouvements de caisse** sur la bankroll : **dépôt / retrait** datés.
- **Statistiques par bankroll** (§5) : Paris, Bénéfice, ROI, Progression (ROC), TWR, TRI, Réussite %,
  Drawdown, Capital de départ/actuel, comptes par statut, mises jouées / en cours, dépôts/retraits,
  séries max, mise moyenne/max, cote moyenne, plus grosse cote gagnée, plus gros bénéfice / plus grosse perte,
  commissions, CLV (si renseigné).
- **Courbe de progression** du capital de la bankroll dans le temps.
- **Sports configurables dans le Référentiel** (nouveau `kind`), sur le modèle des exercices.
- **100 % saisie manuelle**, montants en euros.

### Hors périmètre (renvoyé en V2 — voir §10)
- **Dashboard** multi-modules (agrégation transverse).
- **Système / staking automatique** (Kelly, flat, paliers), conseils de mise.
- **Paris « système »** (full cover : trixie, yankee…), handicaps asiatiques demi-gains/demi-pertes.
- **Import bookmaker / scraping de cotes**, cotes de clôture automatiques.
- **Multi-devises**.
- **Gamification** (points sur jalons, régularité) — données produites, moteur plus tard.

---

## 4. Modèle de données

> Conventions : entités TypeORM, IDs UUID, `synchronize` actif (MVP), nommage aligné sur les modules
> existants (`status`, `position`, `created_at`, `archived_at`…).

### 4.1 `Bankroll`
Le conteneur. Son **capital actuel n'est pas stocké** : il est dérivé (§4.5).

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `name` | string | Obligatoire, 1–60 car. (trim). |
| `startingCapital` | number | Capital de départ, € ≥ 0. **Immuable** après création (corriger via mouvement de caisse). |
| `bookmaker` | string \| null | Optionnel (libre ou référentiel, §4.6). |
| `color` / `icon` | string | Optionnel (affichage). |
| `position` | int | Ordre d'affichage. |
| `status` | enum | `active` \| `archived`. |
| `createdAt` | datetime | Auto. |
| `archivedAt` | datetime \| null | Renseigné à l'archivage. |

### 4.2 `CashMovement` (mouvement de caisse)
Dépôt ou retrait sur la bankroll, indépendant des paris.

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `bankrollId` | UUID | FK → `Bankroll`. |
| `type` | enum | `deposit` \| `withdrawal`. |
| `amount` | number | € > 0 (le `type` porte le signe). |
| `date` | date (YYYY-MM-DD) | Date du mouvement. |
| `note` | string \| null | Optionnel. |
| `createdAt` | datetime | Auto. |

### 4.3 `Bet` (ticket)
Le pari. Pour un **simple**, exactement **une** sélection ; pour un **combiné**, **≥ 2**.

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `bankrollId` | UUID | FK → `Bankroll`. |
| `type` | enum | `simple` \| `combine`. |
| `stake` | number | Mise, € > 0. |
| `odds` | number | Cote totale décimale ≥ 1. **Dérivable** du produit des sélections (combiné), figée au règlement. |
| `status` | enum | `pending` \| `won` \| `lost` \| `void` \| `cancelled` (+ `cashout` option). §4.4. |
| `cashoutAmount` | number \| null | Retour si `cashout`. |
| `commission` | number | Défaut 0 (€, ex. exchange/cash out). |
| `closingOdds` | number \| null | Cote de clôture, pour le CLV (optionnel). |
| `placedAt` | date | Date de prise du pari. Défaut aujourd'hui. |
| `settledAt` | date \| null | Date de règlement (sert à ordonner la courbe). |
| `note` | string \| null | Optionnel. |
| `createdAt` | datetime | Auto. |

### 4.4 `Selection` (sélection / leg)

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `betId` | UUID | FK → `Bet`. |
| `sport` | string | Référentiel `sport` (MMA, Football…). Obligatoire. |
| `event` | string \| null | Libellé de l'évènement (« PSG – OM », « Jones vs Aspinall »). |
| `market` | string \| null | Marché (« 1N2 », « Vainqueur », « Over 2.5 »). |
| `pick` | string \| null | Choix joué (« PSG », « Over 2.5 »). |
| `odds` | number | Cote de la sélection, ≥ 1. |
| `status` | enum | `pending` \| `won` \| `lost` \| `void`. Pilote le statut du combiné (§6.3). |
| `position` | int | Ordre dans le ticket. |

### 4.4 bis — Statuts & impact financier

| Statut | Retour (payout) | Bénéfice | Dans « Mises jouées » | Dans Réussite % | Compté dans « Paris » |
|---|---|---|---|---|---|
| **En cours** (`pending`) | — (latent) | 0 (non réglé) | non (→ *Mises en cours*) | non | oui |
| **Gagné** (`won`) | `mise × cote` | `mise × (cote − 1) − commission` | oui | oui (succès) | oui |
| **Perdu** (`lost`) | 0 | `−mise` | oui | oui (échec) | oui |
| **Remboursé** (`void`) | `mise` | 0 | **non** | non | oui (→ *Paris remboursés*) |
| **Annulé** (`cancelled`) | `mise` | 0 | **non** | non | **non** (comme s'il n'existait pas) |
| **Cash out** (`cashout`) | `cashoutAmount` | `cashout − mise − commission` | oui | oui si bénéfice ≥ 0, sinon échec | oui |

> **Remboursé vs Annulé** : *remboursé* = le pari a eu lieu mais l'issue est nulle (match reporté,
> sélection void) → la mise est rendue, il reste **comptabilisé** comme pari. *Annulé* = saisie erronée /
> pari rétracté → **exclu de toutes les stats** comme s'il n'avait jamais existé.

### 4.5 Grandeurs dérivées (calculées, non stockées)

| Grandeur | Formule |
|---|---|
| **Bénéfice (pari)** | selon statut (§4.4 bis). |
| **Bénéfice (bankroll)** | `Σ bénéfices des paris réglés` (won/lost/void/cashout ; exclut pending & cancelled). |
| **Mises jouées (turnover)** | `Σ mises` des paris à action (won/lost/cashout). Exclut void, cancelled, pending. |
| **Mises en cours** | `Σ mises` des paris `pending`. |
| **Capital actuel** | `Capital de départ + Σ dépôts − Σ retraits + Bénéfice (bankroll)`. |
| **Courbe de capital** | `Capital de départ` puis cumul chronologique (par `settledAt`/date de mouvement) des bénéfices et mouvements. |

### 4.6 Référentiel — nouveaux `kind`
Ajouter au référentiel existant (`backend/src/referential/types.ts`) le `kind` **`sport`**
(valeurs MVP : *MMA*, *Football*), géré comme les exercices (CRUD, unicité insensible casse/accents).
**Optionnel** : `kind` **`bookmaker`** si l'on veut une liste de bookmakers réutilisable.

---

## 5. Statistiques par bankroll (formules)

> Toutes les stats se calculent **par bankroll**, sur les paris **non annulés**. « Réglés » = won/lost/void/cashout.

| Stat | Formule / définition | Vérif. exemple (9 paris, 7G/2P, capital 10 €) |
|---|---|---|
| **Paris** | nb de tickets non annulés (inclut en cours) | 9 |
| **Paris gagnants / perdants / remboursés / en cours** | comptes par statut | 7 / 2 / 0 / 0 |
| **Réussite %** | `gagnants / (gagnants + perdants)` × 100 | 7/9 = **77,78 %** |
| **Mises jouées** | `Σ mises` (won/lost/cashout) | **57,00 €** |
| **Mises en cours** | `Σ mises` (pending) | 0,00 € |
| **Bénéfice** | `Σ bénéfices réglés − commissions` | **55,89 €** |
| **ROI (Yield)** | `Bénéfice / Mises jouées` × 100 | 55,89/57 = **98,05 %** |
| **Capital de départ** | `bankroll.startingCapital` | 10,00 € |
| **Dépôt / Retrait** | `Σ deposits` / `Σ withdrawals` | 0 / 0 |
| **Capital actuel** | `départ + dépôts − retraits + bénéfice` | 10 + 55,89 = **65,89 €** |
| **Progression (ROC)** | `Bénéfice / Capital de départ` × 100 | 55,89/10 = **558,90 %** |
| **TWR** | rendement enchaîné par sous-périodes (neutralise dépôts/retraits) ; sans flux = `capital actuel / départ − 1` | 65,89/10 − 1 = **558,90 %** |
| **TRI** | IRR sur flux datés (mises sorties, gains entrées, mouvements, capital final), annualisé | **1000,00 %** |
| **Drawdown (max)** | plus forte baisse pic-à-creux de la courbe de capital (€ ; % en option) | 10,00 € |
| **Série victoires max** | plus longue suite de `won` consécutifs (chronologique) | 7 |
| **Série défaites max** | plus longue suite de `lost` consécutifs (affichée négative) | −2 |
| **Mise moyenne** | `Mises jouées / nb paris à action` | 57/9 = **6,33 €** |
| **Mise max** | `max(mise)` | 10,00 € |
| **Cote moyenne** | moyenne des cotes des tickets (réglés) | 2,974 |
| **Plus grosse cote gagnée** | `max(cote)` parmi les `won` | 8,000 |
| **Plus gros bénéfice** | `max(bénéfice)` sur un pari | 14,00 € |
| **Plus grosse perte** | `min(bénéfice)` sur un pari (le plus négatif) | −5,00 € |
| **Commissions** | `Σ commission` | 0,00 € |
| **CLV** | moyenne de `(cote prise / cote clôture − 1)` sur les paris renseignés (sinon masqué + aide) | — |

---

## 6. Règles de gestion détaillées

### 6.1 Bankroll
- **RG-01** — Nom obligatoire, **capital de départ** ≥ 0 saisi à la création, **immuable** ensuite.
- **RG-02** — Le capital se corrige via des **mouvements de caisse** (dépôt/retrait), pas en éditant le capital de départ.
- **RG-03** — **Archiver** une bankroll la sort de la vue courante **sans supprimer** paris ni historique ; **supprimer** est destructif (cascade paris + sélections + mouvements) → confirmation explicite.

### 6.2 Pari (création & règlement)
- **RG-04** — Un pari est rattaché à **une** bankroll, a une **mise > 0** et au moins une sélection.
- **RG-05** — **Simple** : 1 sélection, `cote = cote de la sélection`. **Combiné** : ≥ 2 sélections, `cote = Π cotes` (sélections `void` ramenées à **1,00**).
- **RG-06** — À la création, statut par défaut **en cours**. Le règlement fixe le statut et la `settledAt`.
- **RG-07** — Le **bénéfice** et le **retour** découlent du statut (§4.4 bis), jamais saisis à la main (sauf `cashoutAmount` pour le cash out).

### 6.3 Combiné — propagation des sélections
- **RG-08** — Statut d'un combiné dérivé des sélections : **perdu** dès qu'**une** sélection est `lost` ;
  **gagné** quand **toutes** sont `won`/`void` ; **en cours** sinon.
- **RG-09** — Une sélection `void` est **neutralisée** (cote → 1,00) et la cote totale du combiné est **recalculée**.
- **RG-10** — Possibilité de régler le statut **au niveau ticket** directement (raccourci) ; pour un combiné, le détail des sélections reste la source la plus fine.

### 6.4 Mises, capital & stats
- **RG-11** — *Mises jouées* exclut **remboursés** et **annulés** ; *Mises en cours* = somme des mises **en cours**.
- **RG-12** — *Capital actuel* = `départ + dépôts − retraits + bénéfice réglé`. Les mises **en cours** sont **immobilisées** (affichées à part) mais **non perdues**.
- **RG-13** — *Réussite %* = `gagnants / (gagnants + perdants)` : remboursés, annulés et en cours **hors dénominateur**.
- **RG-14** — Les courbes (capital, drawdown, séries, TWR, TRI) s'ordonnent par **date de règlement** (`settledAt`) ; les mouvements de caisse s'intercalent à leur date.
- **RG-15** — **Annulé** = exclu de **toutes** les stats et de la courbe ; **remboursé** = compté en *Paris* et *Paris remboursés*, bénéfice 0.

### 6.5 Formats & saisie
- **RG-16** — Montants en **euros**, 2 décimales ; cotes décimales à **3 décimales** (ex. 2,974). Saisie permissive (`8`, `8,00`, `8.0`).
- **RG-17** — `placedAt` ≤ aujourd'hui recommandé ; `settledAt` ≥ `placedAt`. Date future → **avertissement non bloquant**.
- **RG-18** — Le **sport** d'une sélection provient du référentiel `sport` ; ajout à la volée possible (comme les exercices).

---

## 7. Architecture des écrans (UX/UI)

> Section force de proposition. Logique en trois niveaux : **liste des bankrolls → détail bankroll
> (stats + courbe + liste des paris) → fiche pari**. Réutilise les patterns existants (cartes, drawer,
> modale de formulaire, styles `.modal*` de `index.css`).

### 7.1 Liste des bankrolls (atterrissage)
```
┌──────────────────────────────────────────────────────────────┐
│  Paris sportifs                              [ + Bankroll ]    │
│                                                                │
│  ┌── Bankroll « MMA 2026 » ──────────────────────────────┐    │
│  │  Capital 65,89 €   ▲ +558,90 %      ROI 98,05 %        │    │
│  │  9 paris · 77,78 % réussite      ╭───────────╮ courbe  │    │
│  └────────────────────────────────────────────────────────┘    │
│  ┌── Bankroll « Foot value » ─────────────────────────────┐    │
│  │  …                                                      │    │
│  └────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```
- Une **carte par bankroll** : capital actuel, progression, ROI, nb paris, réussite, mini-courbe.
- **+ Bankroll** → modale (nom, capital de départ, bookmaker/couleur optionnels).

### 7.2 Détail d'une bankroll
```
┌──────────────────────────────────────────────────────────────┐
│  ← MMA 2026                       [+ Pari] [Dépôt/Retrait] [···]│
│                                                                │
│  Capital actuel 65,89 €   Progression +558,90 %   ROI 98,05 % │
│  ┌─────────── Courbe du capital ───────────────╮  Bénéfice    │
│  │                              ╭────────        │  +55,89 €    │
│  │            ╭────────────────╯                 │  Drawdown    │
│  │  ─────────╯                                   │  10,00 €     │
│  └───────────────────────────────────────────────╯            │
│                                                                │
│  ── Statistiques ──            ── Paris ──        [Tous ▾]     │
│  Paris 9   Réussite 77,78 %    ✅ Jones vainqueur  10€ @8,00   │
│  TWR 558,90 %  TRI 1000 %      ❌ Combiné x3       5€  @4,20   │
│  Mise moy. 6,33 € · max 10 €   ⏳ Over 2.5         6€  @1,90   │
│  Cote moy. 2,974 · max 8,000   …                              │
└──────────────────────────────────────────────────────────────┘
```
- **Bandeau** : capital actuel, progression, ROI, bénéfice.
- **Courbe de capital** (période réglable) + **panneau stats** complet (§5), groupé : *Performance*
  (Bénéfice, ROI, Progression, TWR, TRI), *Activité* (paris, mises, dépôts/retraits), *Risque*
  (drawdown, séries), *Distribution* (mise moy/max, cote moy/max, + gros gain/perte), *Avancé* (CLV, commissions).
- **Liste des paris** (filtrable par statut/sport), chaque ligne : icône statut, sélection(s), mise @ cote, bénéfice.
- Actions : **+ Pari**, **Dépôt/Retrait**, éditer/archiver la bankroll.

### 7.3 Création / édition d'un pari
**Étape 1 — Type** : tuiles **Simple** / **Combiné**.
**Étape 2 — Sélections** :
- *Simple* : sport, évènement, marché, choix, **cote**.
- *Combiné* : liste de sélections (ajout/suppression) ; **cote totale = produit** affichée en direct.
**Étape 3 — Ticket** : **mise**, date, (bookmaker, commission, cote de clôture en repli « avancé »).
**Statut** : en cours par défaut, réglable ici ou plus tard.

### 7.4 Régler un pari (express)
Depuis la liste : sélecteur de statut rapide **Gagné / Perdu / Remboursé / Annulé** (+ Cash out → saisir le montant).
Pour un combiné : régler **sélection par sélection**, le statut du ticket se déduit (RG-08/09). Recalcul live (optimistic UI).

---

## 8. Micro-interactions & Feedback
- **Cote totale** d'un combiné recalculée en direct à chaque ajout/édition de sélection (et après un void → ×1,00).
- **Règlement express** : bénéfice, capital, ROI et progression recalculés immédiatement (optimistic UI ; rollback + toast si échec).
- **Mises en cours** mises en évidence (capital « immobilisé » distinct du capital disponible).
- **Couleur non porteuse seule** : statut signalé par **icône + libellé** (✅ ❌ ↩️ ⛔ ⏳), gain/perte par signe.
- **Jalons** (donnée future gamification) : franchissement d'un palier de progression / bankroll doublée → évènement persistant + toast.

---

## 9. Cas limites & Questions ouvertes

**Cas limites traités :**
- Bankroll **sans pari** → stats à 0, capital = capital de départ.
- **Tous les paris en cours** → bénéfice 0, mises en cours = somme des mises, ROI masqué.
- **Capital de départ = 0** mais dépôts présents → progression (ROC) masquée (division par 0), TWR/TRI calculés sur les flux.
- **Combiné partiellement void** → cotes neutralisées à 1,00, cote totale recalculée.
- **Pari annulé** → disparaît de toutes les stats ; **remboursé** → reste compté, bénéfice 0.
- **Drawdown** sur bankroll toujours gagnante → 0.
- **Cash out** à perte → bénéfice négatif, compté en échec.

**Questions ouvertes à trancher avec le PO :**
1. **Cash out** dans le MVP ou en V2 ? → *Reco : statut prévu dans le modèle, UI minimale au MVP.*
2. **TRI/IRR** : annualisé ou brut sur la période ? quelle convention de dates (placedAt vs settledAt) ? → *Reco : annualisé, flux à settledAt.*
3. **Drawdown** en € seul (exemple) ou aussi en % du pic ? → *Reco : € au MVP, % en complément.*
4. **CLV** au MVP (saisie cote de clôture manuelle) ou backlog ? → *Reco : champ optionnel, stat masquée si non renseignée.*
5. **Sport au niveau sélection** (combiné multi-sports) confirmé, ou aussi un sport « principal » au ticket pour le filtre ? → *Reco : sport par sélection, filtre ticket = « contient ».*
6. **Référentiel bookmaker** (kind dédié) ou champ texte libre ? → *Reco : texte libre au MVP.*

---

## 10. Backlog / Évolutions futures (V2+)
- **Staking** (flat, % bankroll, Kelly) et recommandations de mise.
- **Paris système** (full cover), **handicaps asiatiques** (demi-gain / demi-perte).
- **Import bookmaker** / récupération automatique des **cotes de clôture** (CLV automatisé).
- **Dashboard** multi-modules (intégration avec Finances : la bankroll comme « enveloppe »).
- **Filtres & analyses** : ROI par sport / marché / bookmaker / cote.
- **Gamification** : points sur jalons (bankroll doublée, série record), régularité.
- **Export** CSV / bilan annuel.

---

## 11. Critères d'acceptation (récapitulatif testable)
- [ ] Je peux **créer une bankroll** (nom, capital de départ) puis **y ajouter des paris**.
- [ ] Je peux créer un pari **simple** et un **combiné** ; la **cote du combiné = produit** des sélections.
- [ ] Chaque sélection a un **sport** issu du **Référentiel** (MMA, Football au MVP).
- [ ] Je peux marquer un pari **gagné / perdu / remboursé / annulé** ; le **bénéfice et le capital** se recalculent selon les règles (§4.4 bis).
- [ ] **Remboursé** est compté comme pari (bénéfice 0) ; **annulé** est exclu de toutes les stats.
- [ ] La bankroll affiche : **Paris, Bénéfice, ROI, Progression (ROC), TWR, TRI, Réussite %, Drawdown,
      capital départ/actuel, comptes par statut, mises jouées/en cours, dépôts/retraits, séries max,
      mise moy/max, cote moy/max, plus grosse cote gagnée, plus gros bénéfice/perte, commissions, CLV**.
- [ ] Sur l'exemple (9 paris, 7G/2P, capital 10 €) : Bénéfice **55,89 €**, ROI **98,05 %**,
      Progression **558,90 %**, Réussite **77,78 %**, capital actuel **65,89 €**, mise moy **6,33 €**.
- [ ] Une **courbe de capital** retrace la progression dans le temps.
- [ ] Les **mouvements de caisse** (dépôt/retrait) modifient le capital sans être des paris.
- [ ] **Archiver** préserve l'historique ; **supprimer** demande confirmation et cascade.
</content>
</invoke>
