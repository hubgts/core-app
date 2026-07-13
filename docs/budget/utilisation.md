# Module Budget — Guide d'utilisation

> Comment utiliser le module **Budget**, tel qu'implémenté. Pour le fonctionnement
> interne, voir [`technique.md`](./technique.md).
> Spécification de référence : [`specs/module_budget.md`](../../specs/module_budget.md).

Le menu **Budget** (sidebar) a trois onglets :
- **Vue d'ensemble** (`/budget`) — le **cash-flow** du mois (entrées vs sorties, taux
  d'épargne, report de trésorerie), cf. §6 ;
- **Plan & dépenses** (`/budget/plan`) — le plan, les catégories et la saisie des
  transactions, décrits ci-dessous.
- **Import** (`/budget/import`) — importe un relevé bancaire et en extrait les
  transactions vers Plan & dépenses (cf. §7).

---

## 1. À quoi ça sert ?

Le Budget répond à : **« est-ce que je dépense comme prévu ce mois-ci ? »**. On définit
une **répartition cible** (le classique **50/30/20** par exemple), puis on saisit ses
**transactions** au fil du mois ; un **camembert** et des barres montrent en direct si le
plan est respecté.

C'est **indépendant** du patrimoine (enveloppes) : ici on suit des **flux mensuels**
(revenus, dépenses), pas des soldes.

---

## 2. Vocabulaire

| Terme | Signification |
|---|---|
| **Plan (du mois)** | Les catégories retenues **pour un mois** et leur **% cible** (somme ≈ 100 %). Le % est **propre au mois**. |
| **Catégorie** | Un poste libre **partagé entre les mois** (ex. Besoins, Plaisirs, Épargne) : nom, couleur, icône, type dépense/épargne. |
| **Revenu du mois** | Somme des **entrées** du mois (salaire + primes). Base des cibles en €. |
| **Transaction** | Un mouvement daté : **dépense** (rattachée à une catégorie) ou **revenu**. |
| **Cible (€)** | `% cible × revenu du mois`. |
| **Réel (€)** | Total des dépenses d'une catégorie sur le mois. |
| **Reste à allouer** | `revenu − total dépensé`. |

---

## 3. Marche à suivre

1. **Définir le plan** (première visite) : bouton **« Utiliser le modèle 50/30/20 »**
   (modifiable) ou **« Créer un plan personnalisé »**. Dans **Gérer le plan** (propre au
   **mois affiché**), tu **coches les catégories du mois** et fixes leur **%**, tu édites
   le catalogue (nom, type, couleur, icône — **partagé entre les mois**), tu **réordonnes**
   (glisser-déposer), et un indicateur t'aide à atteindre **100 %**.
   Un **nouveau mois reprend automatiquement le dernier plan** ; le modifier crée le plan
   propre à ce mois (une note « Plan repris de … » l'indique).
2. **Renseigner le revenu** du mois : **« + Revenu »** (tu peux en saisir plusieurs :
   salaire, prime…). Les cibles s'affichent alors **en euros**.
3. **Saisir tes dépenses** : **« + Dépense »**, en choisissant la **catégorie**.
   L'**épargne se saisit comme une dépense** affectée à la catégorie Épargne.
4. **Suivre** : le **camembert** et les barres **plan vs réel** se mettent à jour à
   chaque saisie ; le **reste à allouer** aussi.

---

## 4. L'écran du mois

- **Sélecteur de mois** (◀ ▶) en haut ; par défaut le mois courant.
- **Bandeau** : revenu du mois · dépensé/alloué · **reste à allouer** (rouge si négatif).
- **Répartition du mois** (camembert des dépenses par catégorie).
- **Plan vs réel** : par catégorie, une barre du **% réel du revenu** avec un **marqueur
  de la cible** (ex. réel 42 % · cible 50 %).
- **Par catégorie** : cartes `réel € / cible €`, barre de progression et **état**
  (*Dans la cible* / *Dépassement* ; pour l'épargne : *Objectif atteint* / *Sous
  l'objectif*).
- **Transactions** : liste datée (revenus + dépenses), modifiable / supprimable.

---

## 6. Onglet « Vue d'ensemble » (cash-flow)

Une lecture **trésorerie** du mois, complémentaire du plan :

- **Bandeau flux** : **Entrées** · **Sorties** · **Solde du mois** (`entrées − sorties`,
  vert si positif).
- **Taux d'épargne** : part du revenu **versée en épargne** (`Σ versements épargne ÷
  revenu`), avec le montant épargné et une jauge. L'épargne = les **sorties** affectées à
  une catégorie de type *épargne*.
- **Report de trésorerie** : `report du mois précédent` (solde cumulé de **tous** les mois
  antérieurs) **+ solde du mois** = **solde de fin de mois**.
- **Entrées vs sorties** : histogramme des **6 derniers mois** (mois courant mis en avant).
- **Répartition des sorties** : camembert des dépenses du mois par catégorie.

La saisie des revenus/dépenses se fait dans l'onglet **Plan & dépenses** (bouton en haut
de la vue d'ensemble pour y aller).

---

## 7. Bon à savoir

- **Saisie manuelle**, euros (`8200`, `8 200`, `8200,50`). Une dépense a un montant > 0.
- Le **revenu de référence** (dans *Gérer le plan*) sert à proposer rapidement le revenu
  d'un nouveau mois (« Ajouter votre revenu de référence comme revenu du mois »).
- **Archiver** une catégorie la retire de la saisie sans perdre ses transactions ;
  **supprimer** n'est possible que si **aucune** transaction ne l'utilise.
- Le plan est **propre à chaque mois** : tu peux passer 50/30/20 → 60/20/20 pour un mois
  donné. Un mois non encore défini **hérite** du dernier plan jusqu'à ce que tu l'édites.
- Aucun impact sur le **patrimoine** : un versement d'épargne ici **ne crée pas** de
  relevé d'enveloppe.

---

## 7bis. Onglet « Import » (relevé bancaire)

L'onglet **Import** (`/budget/import`) évite la ressaisie : dépose un export bancaire,
vérifie les transactions détectées, puis valide pour les ajouter à **Plan & dépenses**.

**Marche à suivre**
1. **Déposer** le fichier (clic ou glisser-déposer). Format supporté aujourd'hui :
   **Société Générale CSV** (export « Tableau », séparateur point-virgule).
2. Un **écran de vérification dédié** s'ouvre (plein écran, pensé pour la saisie de masse) :
   les opérations sont **regroupées par marchand** (repliées). Chaque groupe montre le nom
   du commerçant, le nombre d'opérations et le total.
3. **Catégorisation par groupe** : choisis **une catégorie sur la ligne du marchand** → elle
   s'applique à **toutes ses opérations** d'un coup. C'est la manière la plus rapide de
   traiter des centaines de lignes.
4. Besoin d'ajuster une ligne précise ? **Déplie** le groupe (clic) : liste compacte avec
   date, montant, **libellé complet au survol**, et une catégorie/`ignorer` par ligne.
5. Des **filtres** (À traiter / Tout / En erreur / Doublons) trient les groupes ; les
   marchands **à catégoriser remontent en premier**.
6. Le bouton **Valider** reste **désactivé** tant qu'une dépense à importer n'a pas de
   catégorie. Une opération (ou un groupe entier) peut être **ignorée** (✕) puis
   **réintégrée** (↩).
7. **Valider** ajoute les transactions au mois correspondant à **leur date** (un import
   peut couvrir plusieurs mois).

**Statuts** (historique) :
- **À vérifier** : clic → rouvre l'écran de vérification **là où tu t'étais arrêté** (la
  progression est **auto-sauvegardée**).
- **Validé** : clic → **résumé en lecture seule** (totaux dépenses/revenus, répartition par
  catégorie, nombre de transactions par mois). Pas de retour à l'édition.
- **En erreur** : clic → **détail des erreurs** (fichier non reconnu, lignes illisibles…).

**Anti-doublon** : réimporter le même fichier (ou un fichier qui chevauche un précédent)
**ne crée pas de doublons** — les lignes déjà importées sont détectées et ignorées.

---

> Référence fonctionnelle : [`specs/module_budget.md`](../../specs/module_budget.md).
