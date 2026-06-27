# Module Finances — Guide d'utilisation

> Ce document décrit **comment utiliser** le module Finances tel qu'il est
> implémenté aujourd'hui. Pour le fonctionnement interne (code, API, calculs),
> voir [`technique.md`](./technique.md).

---

## 1. À quoi sert ce module ?

Le module Finances offre une **photographie macro du patrimoine** et mesure sa
**progression dans le temps**. Ce n'est **ni un budget, ni un suivi de dépenses** :
on **photographie des soldes** d'enveloppes (« mon épargne vacances est à 3 200 € »),
sans aucune transaction.

L'unité de travail est l'**enveloppe** : un poste concret du patrimoine, avec un
**type** qui adapte la saisie et les stats.

---

## 2. Vocabulaire

| Terme | Signification |
|---|---|
| **Enveloppe** | Un poste du patrimoine (compte courant, épargne, PEA…) avec son solde courant. |
| **Type** | Espèces, Compte courant, Épargne, Investissement, Dette. Détermine la nature et le formulaire. |
| **Nature** | `Actif` ou `Passif` — **dérivée du type** (Dette ⇒ Passif). Donne le signe dans le net. |
| **Relevé (snapshot)** | Point d'historique daté `{ date, montant }`. Mettre à jour le solde crée un relevé. |
| **Solde courant** | Montant du relevé **le plus récent** de l'enveloppe. |
| **Plus-value (PV)** | (Investissement) Gain/perte latent **compris dans la valeur**. |
| **Patrimoine net** | `Σ actifs − Σ passifs`. |
| **Répartition** | Part de chaque type / enveloppe dans le patrimoine brut (actifs). |
| **Objectif** | Montant cible **optionnel** fixé sur une enveloppe, avec une **échéance** (date) optionnelle. Affiché en barre de progression. |
| **Objectif net** | Objectif **global** de patrimoine net (montant + échéance), réglé sur la vue d'ensemble. |
| **Fraîcheur** | Ancienneté du dernier relevé d'une enveloppe ; au-delà de **31 j**, elle est « à actualiser ». |
| **Bilan du mois** | Saisie **groupée** du solde de toutes les enveloppes à une même date. |

---

## 3. Trois écrans

Le module est découpé en **trois sous-pages** (sous-menu *Finances* dans la barre
latérale) :

### 3.1 Vue d'ensemble — `/finances`
Le **suivi global**, en lecture :
- **Bandeau de tête** : le **patrimoine net** + sa **variation** (€ et %) depuis une
  référence, et un encart **plus-values latentes** (somme des PV d'investissement +
  performance globale).
- **Rappel** si des enveloppes sont **à actualiser** (lien vers le bilan).
- **KPIs temporels** : variation **depuis le 1ᵉʳ janvier**, **sur 12 mois**, et **plus
  haut historique** (montant + date).
- **Objectif de patrimoine net** : barre de progression vers la cible globale, avec
  estimation de rythme. Bouton **« Définir / Modifier »**.
- **Courbe** avec une bascule **Net** / **Composition** (aires empilées par type) et un
  sélecteur de période **3M / 6M / 12M / Tout**.
- **Projection de patrimoine** (mode Net) : un sélecteur d'horizon
  **Aucune / +1 an / +3 ans / +5 ans** prolonge la courbe par une **portion pointillée**
  estimée à partir de votre **épargne moyenne mensuelle** (calculée sur l'historique du
  net, jusqu'à 12 mois). La légende rappelle l'épargne moyenne et le patrimoine projeté.
- **Répartition des actifs** (donut) avec une bascule **Type** / **Enveloppe** :
  cliquer le donut (ou le lien **« Gérer mes enveloppes → »**) ouvre la page de gestion.
  C'est l'**accès principal aux enveloppes** depuis la vue d'ensemble.

### 3.2 Enveloppes — `/finances/enveloppes`
La **gestion détaillée** :
- Une **grille de cartes**, une par enveloppe, regroupées par type ; chaque carte montre
  le solde, l'indicateur (perf. / variation), la **fraîcheur**, la **barre d'objectif**
  (avec rythme) et un bouton **« + Solde »**.
- **Réordonner** : glisser-déposer les cartes au sein d'un type.
- **Archivées** : section repliable en bas, avec bouton **« Réactiver »**.
- **+ Enveloppe** ; **cliquer une carte** ouvre son **détail** (panneau latéral).

### 3.3 Bilan du mois — `/finances/bilan`
Saisie **groupée** : on choisit une **date**, on met à jour le solde de plusieurs
enveloppes d'un coup (champs pré-remplis avec le solde courant), puis **« Enregistrer le
bilan »**. Les enveloppes périmées sont signalées.

---

## 4. Créer et gérer une enveloppe

### Créer
1. Cliquer sur **+ Enveloppe**.
2. **Choisir le type** (Espèces / Compte courant / Épargne / Investissement / Dette).
   Le type est **immuable** après création.
3. Renseigner : **nom**, **solde initial** + **date** (crée le premier relevé),
   et — si **Investissement** — la **plus-value initiale** (optionnelle). Icône /
   couleur optionnelles.
4. **Objectif (optionnel)** : un **montant cible** et une **échéance** (date), tous
   deux facultatifs. Laisser vide = pas d'objectif.
5. **Enregistrer**.

### Modifier / archiver / supprimer
- **Éditer** (depuis le détail) : nom, icône, couleur, **objectif / échéance** (pas le
  type). Vider le montant cible **efface** l'objectif.
- **Archiver** : retire l'enveloppe des totaux et de la vue **sans effacer ses
  relevés** (réversible). Les archivées vivent dans la section **« Archivées »** de la
  page Enveloppes, d'où on peut les **réactiver**.
- **Supprimer** : efface l'enveloppe **et tous ses relevés**. **Irréversible**,
  confirmation demandée (préférer l'archivage).
- **Réordonner** : glisser-déposer les cartes au sein d'un type (l'ordre est mémorisé).

---

## 5. Le détail d'une enveloppe

Ouvre un **panneau latéral** :

- En-tête : nom, type · nature, **solde courant** + date + variation vs. relevé
  précédent. Pour l'investissement : **valeur, plus-value, capital, performance**.
- **Statistiques** : **variation totale** depuis le premier relevé (et sa date).
- **Objectif** (si défini) : barre de progression **solde / cible**, montant restant,
  échéance ; un objectif atteint est marqué ✓, une échéance dépassée non atteinte est
  signalée **« en retard »**.
- **Mettre à jour le solde** : saisir **montant** + **date** (+ **plus-value** pour
  l'investissement) ; re-saisir une **date existante écrase** ce relevé. Le bouton
  **« + Solde »** d'une carte ouvre directement ce formulaire.
- **Visualisation** : courbe du solde (cas général) ; **aire capital + plus-value**
  pour l'investissement.
- **Historique des relevés** avec variation pas à pas ; on peut **supprimer un
  relevé** (le solde courant retombe sur le précédent).

---

## 6. Objectifs

Chaque enveloppe peut porter un **objectif** : un **montant cible** (optionnel) et une
**échéance** (date, optionnelle). Les deux sont indépendants — on peut fixer une cible
sans date, ou l'inverse.

- La **progression** = `solde courant / montant cible` ; le **montant restant** et
  l'état **atteint** sont calculés automatiquement à chaque affichage (rien à entretenir).
- La barre apparaît sur la **carte** de l'enveloppe et dans son **détail** ; une
  mini-barre figure aussi dans le résumé de la vue d'ensemble.
- **Projection (rythme)** : à partir de la tendance de vos relevés, l'app estime la
  **date d'atteinte** (« à ce rythme : mars 2027 »). Si l'échéance ne sera pas tenue,
  elle affiche **« en retard »** et l'**apport mensuel** nécessaire pour la respecter.

### Objectif de patrimoine net (global)
Sur la **vue d'ensemble**, un **objectif global** (montant net + échéance, via
« Définir / Modifier ») affiche sa propre barre et la même estimation de rythme. Pour un
**fonds d'urgence**, créez simplement une enveloppe dédiée (ex. « Matelas de sécurité »)
avec son objectif.

> Les objectifs sont surtout pertinents pour les **actifs** (épargne, investissement).
> La cible reste libre pour tout type.

---

## 7. Bilan du mois & fraîcheur

- Le **bilan** (`/finances/bilan`) met à jour **tous les soldes en une passe** à une date
  donnée : pratique pour le rituel mensuel. Les champs sont pré-remplis avec le solde
  courant ; on ne modifie que ce qui change, les lignes vides sont ignorées.
- **Fraîcheur** : une enveloppe non mise à jour depuis plus de **31 jours** est marquée
  **« à actualiser »** (badge sur la carte + bandeau de rappel menant au bilan).

---

## 8. Investissement : valeur & plus-value

Pour une enveloppe d'investissement, le **montant** saisi est la **valeur de marché
(plus-values comprises)**. La **plus-value** se saisit **en plus** (signe libre :
gain ou perte). L'application en dérive :

- **Capital investi** = `valeur − plus-value` ;
- **Performance** = `plus-value / capital investi` (%).

> Exemple : valeur 64 000 €, plus-value +9 000 € ⇒ capital 55 000 €, perf. +16,4 %.

---

## 9. Évolution & répartition

- La **courbe du net** reporte, à chaque date, le **dernier solde connu** de chaque
  enveloppe (les relevés peuvent être à des dates différentes).
- La vue **Composition** empile, à chaque date, le solde par **type d'actif**.
- La **variation** se calcule par défaut depuis la **fin du mois précédent**.
- La **répartition** porte sur le **patrimoine brut** (actifs) ; les passifs sont à part.

---

## 10. Bon à savoir

- **Aucune connexion bancaire** : 100 % **saisie manuelle**, montants en euros
  (saisie permissive : `8200`, `8 200`, `8200,50`).
- **Aucune notion de transaction** : on suit le patrimoine à la maille de
  l'enveloppe, pas les mouvements.
- **Mono-utilisateur**, données stockées en PostgreSQL (voir [`technique.md`](./technique.md)).
- Le module est accessible via **Finances** (`/finances`), avec le sous-menu
  **Vue d'ensemble** / **Enveloppes** / **Bilan du mois**.

---

> Spécification fonctionnelle de référence :
> [`specs/module_finances.md`](../../specs/module_finances.md).
