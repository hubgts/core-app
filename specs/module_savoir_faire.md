# Module Savoir-faire — Spécification détaillée

> **Document de spécification fonctionnelle & UX/UI** · Version 1.2 · 2026-06-16
> Module **Savoir-faire** de l'application **Progression** (module additionnel, hors cadrage MVP initial à 3 modules). Document autoporteur (le module est indépendant).
> Référence du périmètre global : [`mvp.md`](./mvp.md).
>
> **Note de cadrage v1.1** : ce module est une **bibliothèque personnelle de savoir-faire & procédés** au sens large — recettes de cuisine, fabrications maison (liquide vaisselle, lessive, cosmétique), ou plus généralement **tout plan d'action reproductible pour atteindre un résultat**. Le concept est volontairement **unifié** (`objectif + composants + étapes`) : la **catégorie** sert au tri/couleur/filtrage, elle **ne pilote pas** le formulaire (contraste assumé avec les modules Finances et Entraînement, où le `type` change la saisie). L'affichage de référence est un **board façon Google Keep** (masonry de cartes).
>
> **Changements v1.1** : le module se recentre sur le **stockage / l'organisation** (pense-bête, suivi divers) ; **suppression du compteur de réalisations** et de toute donnée alimentant la gamification (le **Mode Réalisation** reste, mais comme simple checklist d'exécution **éphémère** qui ne persiste rien). Les **catégories deviennent gérables par l'utilisateur** (référentiel par défaut amorcé, puis création/édition libres). **Suppression de la photo** (texte uniquement au MVP).
>
> **Changements v1.2** : la gestion des **catégories est centralisée dans la page Référentiel** (onglet « Catégories de savoir-faire », avec **sélecteur d'icône**), aux côtés des autres listes réutilisables de l'application. Conséquences : le board renvoie vers le Référentiel via « Gérer les catégories » (plus de modale dédiée), et **le formulaire de savoir-faire ne permet plus de créer une catégorie** (sélection parmi l'existant uniquement). Le modèle de données est inchangé (les catégories conservent icône / couleur / ordre / réassignation à la suppression).

---

## 1. Intention & Philosophie

Le module Savoir-faire matérialise le **savoir-faire reproductible**. Son but n'est ni de
planifier des repas, ni de suivre une performance, mais de **capturer une fois** un
procédé qui marche (« comment je fais mon liquide vaisselle », « ma pâte à pizza »,
« mon protocole de nettoyage de printemps ») pour le **retrouver et le refaire** sans
réfléchir. C'est avant tout un **pense-bête organisé**.

Un *Savoir-faire* répond toujours à la même question : **« Comment j'obtiens ce résultat ? »**
Elle se résume à trois blocs, quel que soit le domaine :

1. **Un objectif** — ce qu'on veut obtenir (un plat, 1 L de lessive, un meuble monté).
2. **Des composants** — ce qu'il faut (ingrédients, produits, matériel).
3. **Des étapes** — la marche à suivre, dans l'ordre.

Trois principes directeurs :

1. **Capturer vite, retrouver vite.** Créer un savoir-faire ne doit rien imposer
   d'autre qu'un **titre** ; tout le reste est optionnel et s'enrichit dans le temps.
   La recherche et les **labels** priment pour retrouver.
2. **La vue prime, façon mur de notes.** L'écran principal est un **board de cartes**
   (style Google Keep) : on « voit » sa bibliothèque d'un coup d'œil, on épingle ses
   essentielles, on **range par catégories qu'on définit soi-même**.
3. **Une savoir-faire sert aussi à exécuter.** L'écran de détail n'est pas qu'un texte à
   lire : un **Mode Réalisation** transforme composants et étapes en **cases à cocher**
   pour suivre l'exécution sans perdre sa place. Cet état est **éphémère** : le module
   **stocke** le savoir-faire, il ne tient pas de journal de ce qu'on a fait.

Contrairement aux modules Habitudes (suivi **binaire** quotidien), Entraînement
(**journal d'évènements**) ou Finances (**état patrimonial photographié**), Savoir-faire
est une **base de connaissance personnelle** : on y range, on y range, on y revient —
sans logique de progression ni de score.

---

## 2. Concepts & Vocabulaire

| Terme | Définition |
|---|---|
| **Savoir-faire** | Un procédé reproductible pour atteindre un résultat : `titre`, `objectif`, `composants`, `étapes`. Unité de base. Couvre cuisine, fabrication maison, bricolage, plan d'action… |
| **Catégorie** | Classifieur d'usage qui sert au **tri / filtre / couleur**. Une seule par savoir-faire. Liste **gérée par l'utilisateur dans la page Référentiel** : un **référentiel par défaut** est fourni (🍳 Cuisine · 🧼 Maison · 🧴 Soin · 🔧 Bricolage · 📋 Autre), puis on **crée / renomme / change l'icône / supprime** les siennes. **Ne change pas le formulaire.** |
| **Label (tag)** | Étiquette libre multiple (« vegan », « rapide », « écologique », « cadeau »…). Sert à la recherche et au filtrage transverse, au-delà de la catégorie. |
| **Composant** | Une ligne de « ce qu'il faut » : `{ quantité?, unité?, intitulé, note? }`. Ingrédient en cuisine, produit/ustensile ailleurs. La quantité est **optionnelle**. |
| **Étape** | Une instruction ordonnée de la marche à suivre. Texte libre, réordonnable. |
| **Rendement** | Ce que produit le savoir-faire : texte libre + **base numérique optionnelle** (ex. « 4 personnes », « 1 L »). La base numérique active la **mise à l'échelle**. |
| **Mise à l'échelle** | Recalcul proportionnel des quantités des composants selon un **multiplicateur** (×0,5 / ×2…) ou un rendement cible. Disponible si les composants sont chiffrés. |
| **Mode Réalisation** | Vue d'exécution d'un savoir-faire : composants et étapes deviennent **cochables**, l'écran reste allumé. État de cochage **éphémère** (non persisté, ne crée aucune donnée). |
| **Épingle (pin)** | Marque un savoir-faire comme prioritaire : elle remonte en tête du board. |
| **Couleur** | Couleur de fond de la carte (palette Keep). Repère visuel libre. |

---

## 3. Périmètre

### Dans le périmètre (MVP)
- **Créer / éditer / archiver / supprimer** un savoir-faire : `titre` (seul obligatoire), `objectif`/description, `catégorie`, `labels`, `composants`, `étapes`, `rendement`, `temps`, `couleur`.
- **Gérer ses catégories** (dans la page **Référentiel**) : référentiel par défaut amorcé ; **créer / renommer / changer l'icône / réordonner / supprimer** une catégorie.
- **Board façon Google Keep** : masonry de cartes, **épinglage**, couleur, aperçu (titre, catégorie, labels, n° d'étapes/composants).
- **Recherche plein-texte** (titre, composants, étapes, labels) + **filtres** par catégorie et par label.
- **Détail d'un savoir-faire** : composants, étapes ordonnées, rendement, temps, métadonnées.
- **Mode Réalisation** : composants/étapes cochables, progression visible, écran maintenu allumé ; état **éphémère**, remis à zéro à la sortie.
- **Mise à l'échelle** des quantités via multiplicateur (si composants chiffrés).
- **Réordonner** composants et étapes (drag & drop) à l'édition.
- **Duplication** d'un savoir-faire (point de départ pour une variante).
- **100 % texte**, saisie manuelle.

### Hors périmètre (renvoyé en V2 — voir §10)
- **Compteur / historique de réalisations** et toute donnée de **gamification** : volontairement écarté (module de stockage, pas de suivi).
- **Photo / illustration** (texte uniquement au MVP).
- **Dashboard** (agrégation multi-modules).
- **Liste de courses** agrégée (somme des composants de plusieurs savoir-faire).
- **Planification de repas / calendrier** (meal planning).
- **Import depuis une URL** (scraping) ; **OCR** d'une photo.
- **Partage / export** (PDF, lien public) ; collaboration multi-utilisateurs.
- **Conversion d'unités** automatique (g ↔ ml, °C ↔ °F) et **table nutritionnelle**.
- **Minuteurs** intégrés aux étapes ; **sous-procédés** (savoir-faire référencée comme composant).

---

## 4. Modèle de données

### 4.1 Socle — `Savoir-faire`
L'unité du module. Tous les champs hors `title` sont optionnels : un savoir-faire peut
n'être qu'un titre que l'on enrichit plus tard.

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `title` | string | **Obligatoire**, 1–120 car. Normalisé (trim). Non nécessairement unique (variantes autorisées). |
| `goal` | string \| null | Objectif / description courte du résultat visé. |
| `categoryId` | UUID \| null | FK → `Category` (§4.4). Null = « sans catégorie ». Sert au tri/filtre/couleur, **pas au formulaire**. |
| `labels` | string[] | Étiquettes libres normalisées (trim), dédoublonnées insensible à la casse. |
| `components` | `Component[]` | Liste ordonnée (§4.2). Peut être vide. |
| `steps` | `Step[]` | Liste ordonnée (§4.3). Peut être vide. |
| `yieldText` | string \| null | Rendement libre (« 4 personnes », « ~1 L », « 12 cookies »). |
| `yieldBase` | number \| null | Base numérique du rendement pour la mise à l'échelle (ex. `4`). Null si non chiffré. |
| `totalTimeMin` | int \| null | Temps total indicatif en minutes (optionnel). |
| `color` | string (token) \| null | Couleur de carte (palette §5). Null = couleur neutre par défaut. |
| `pinned` | bool | Épinglé. Défaut `false`. |
| `position` | int | Ordre manuel sur le board (au sein du bloc épinglé/non épinglé). |
| `status` | enum | `active` \| `archived`. Défaut `active`. |
| `createdAt` | datetime | Auto. |
| `updatedAt` | datetime | Auto (toute édition de contenu). |

### 4.2 `Component` (ligne de composant)
Embarqué dans le savoir-faire (ordre = `position`).

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré (stable pour le drag & drop). |
| `quantity` | number \| null | Quantité **optionnelle**. Sert à la mise à l'échelle. |
| `unit` | string \| null | Unité libre courte (`g`, `ml`, `c. à s.`, `pincée`…). |
| `label` | string | **Obligatoire** dans la ligne (intitulé : « farine », « bicarbonate », « vis 4×40 »). |
| `note` | string \| null | Précision optionnelle (« tamisée », « tiède »). |

> Une ligne **sans quantité** est valide (ex. « sel », « du vinaigre blanc »). On peut
> aussi grouper visuellement via des **lignes de section** (un `Component` à `label`
> seul utilisé comme titre, ex. « — Pour la pâte — ») : convention d'affichage, pas un
> type distinct au MVP.

### 4.3 `Step` (étape)
Embarquée dans le savoir-faire (ordre = `position`).

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `text` | string | **Obligatoire**, instruction libre (multi-ligne autorisé). |

### 4.4 `Category` (catégorie — gérée par l'utilisateur)
Liste de classement amorcée avec un **référentiel par défaut**, puis librement éditable.

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `name` | string | **Obligatoire**, 1–40 car., **unique** (insensible à la casse). |
| `icon` | string \| null | Emoji / nom d'icône (optionnel). |
| `color` | string (token) \| null | Couleur d'accent associée (optionnel). |
| `isDefault` | bool | `true` pour les entrées du référentiel amorcé (repère, non bloquant). |
| `position` | int | Ordre d'affichage dans les filtres et le sélecteur. |

**Référentiel par défaut (amorçage) :** 🍳 Cuisine · 🧼 Maison · 🧴 Soin · 🔧 Bricolage · 📋 Autre.
L'utilisateur peut **en créer, les renommer, changer l'icône, les réordonner et les
supprimer** (y compris celles par défaut). Voir RG-03/04.

---

## 5. Architecture des écrans (UX/UI)

> *Section force de proposition : référence Google Keep (mur de cartes), enrichie d'un
> écran de détail orienté lecture/exécution.*

### 5.0 Barre de contrôle (commune)

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Savoir-faire                                            [ + Savoir-faire ]   │
│                                                                        │
│   🔍 Rechercher…              [ Toutes ▾ ]  🍳 🧼 🧴 🔧 📋 …  ⊞ / ☰    │
│   Labels : ( vegan ) ( rapide ) ( écolo ) …                            │
└──────────────────────────────────────────────────────────────────────┘
```

- **Recherche plein-texte** (titre + composants + étapes + labels), filtrage instantané.
- **Filtre catégorie** (chips dynamiques issues des catégories de l'utilisateur, multi-sélection) + **filtre labels**. Un lien « Gérer les catégories » **renvoie vers la page Référentiel** (§5.5).
- **Bascule d'affichage** : `⊞ Grille` (masonry, défaut) / `☰ Liste` (compacte).
- **+ Savoir-faire** : ouvre la création (§5.4).
- Le filtre/recherche et le mode d'affichage sont **mémorisés** sur la session.

### 5.1 Board (écran d'atterrissage, style Google Keep)

Masonry de cartes de hauteur variable. Bloc **Épinglées** en haut, puis **Autres**.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📌 ÉPINGLÉES                                                              │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐                    │
│  │ 🧼 Liquide     │ │ 🍳 Pâte pizza │ │ 🧴 Baume      │                    │
│  │    vaisselle   │ │               │ │    lèvres     │                    │
│  │ ~1 L · 10 min  │ │ 4 pers · 2 h  │ │ 1 pot · 15min │                    │
│  │ 6 composants   │ │ • Farine…     │ │ ( cadeau )    │                    │
│  │ ( écolo )( DIY)│ │ • Eau tiède…  │ │               │                    │
│  │           📌 ⋮ │ │           📌 ⋮│ │           📌 ⋮│                    │
│  └───────────────┘ └───────────────┘ └───────────────┘                    │
│                                                                            │
│  AUTRES                                                                    │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌──────────────┐  │
│  │ 🍳 Cookies     │ │ 🧼 Lessive    │ │ 🔧 Montage    │ │ 📋 Ménage de │  │
│  │ 12 pièces      │ │    maison     │ │    étagère    │ │   printemps  │  │
│  │ • Beurre…      │ │ 3 L · 20 min  │ │ 7 étapes      │ │ 5 étapes     │  │
│  │ • Sucre…       │ │ ( écolo )     │ │               │ │ ( annuel )   │  │
│  │           📍 ⋮ │ │           📍 ⋮│ │           📍 ⋮│ │          📍 ⋮│  │
│  └───────────────┘ └───────────────┘ └───────────────┘ └──────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

**Anatomie d'une carte :**
- **Couleur de fond** = `color` de le savoir-faire (repère visuel libre).
- **Tête** : icône de catégorie + **titre**.
- **Méta condensée** : rendement · temps (si renseignés).
- **Aperçu** : soit les **premiers composants/étapes**, soit le **décompte** (« 6 composants », « 7 étapes ») selon ce qui est rempli.
- **Labels** sous forme de chips.
- **Actions au survol / appui long** : 📌 épingler, ⋮ menu (couleur, dupliquer, archiver, supprimer).
- **Clic** → détail (§5.2).

**Comportements :**
- **Drag & drop** des cartes pour l'ordre manuel (au sein de chaque bloc).
- **Épingler** déplace la carte dans le bloc « Épinglées » (animation).
- **État vide** (aucun savoir-faire) : illustration + « Capture ton premier savoir-faire : un plat, un produit maison, ou n'importe quel procédé à reproduire » + bouton **+ Savoir-faire**.
- **Aucun résultat** de recherche/filtre : message + bouton « Réinitialiser les filtres ».

### 5.2 Détail d'un savoir-faire (lecture)

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← 🧼 Liquide vaisselle maison        [▶ Réaliser] [Éditer] [⋮]        │
│  Maison · ( écolo )( DIY )                                            │
│  ~1 L · 10 min                                                        │
│                                                                        │
│  Objectif : Un liquide vaisselle efficace, économique et sans plastique.│
│                                                                        │
│  ── Composants ──                        Portions : [ −  ×1  + ]       │
│   • 1 L      eau                                                       │
│   • 30 g     savon de Marseille (en copeaux)                          │
│   • 1 c.à.s  bicarbonate de soude                                     │
│   • 1 c.à.s  vinaigre blanc                                           │
│   • 15 gtes  huile essentielle de citron   (optionnel, parfum)        │
│                                                                        │
│  ── Étapes ──                                                          │
│   1. Faire chauffer l'eau sans bouillir.                              │
│   2. Y dissoudre les copeaux de savon en remuant.                     │
│   3. Hors du feu, ajouter bicarbonate puis vinaigre (ça mousse).      │
│   4. Laisser tiédir, ajouter l'HE, mettre en flacon.                  │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

- **En-tête** : icône catégorie, titre, labels ; ligne méta (rendement · temps).
- **Action principale `▶ Réaliser`** : ouvre le **Mode Réalisation** (§5.3) — une simple checklist d'exécution, sans rien enregistrer.
- **Mise à l'échelle** (`Portions : − ×1 +`) visible si composants chiffrés et `yieldBase` renseigné ; recalcule les quantités affichées (lecture seule, §6.3).
- **Composants** puis **étapes** ordonnées. Les sections (`— Pour la pâte —`) s'affichent en sous-titres.
- **Menu ⋮** : Dupliquer · Changer la couleur · Archiver · Supprimer.

### 5.3 Mode Réalisation (exécution, éphémère)

But : **suivre** le savoir-faire sans perdre sa place. Composants et étapes deviennent
cochables ; l'écran **reste allumé** (wake lock) ; mise en page sobre, gros texte.
**Aucune donnée n'est enregistrée** : c'est une aide d'exécution.

```
┌──────────────────────────────────────────────────────────────────────┐
│  ✕  Réalisation · Liquide vaisselle              ×1   ▰▰▰▱▱  3/9       │
│                                                                        │
│  Composants                                                            │
│   ☑ 1 L      eau                                                       │
│   ☑ 30 g     savon de Marseille                                       │
│   ☐ 1 c.à.s  bicarbonate de soude                                     │
│   ☐ 1 c.à.s  vinaigre blanc                                           │
│   ☐ 15 gtes  HE de citron (optionnel)                                 │
│                                                                        │
│  Étapes                                                                │
│   ☑ 1. Faire chauffer l'eau sans bouillir.                            │
│   ☐ 2. Y dissoudre les copeaux de savon…   ◀ étape en cours           │
│   ☐ 3. Ajouter bicarbonate puis vinaigre.                             │
│   ☐ 4. Laisser tiédir, HE, mise en flacon.                            │
│                                                                        │
│                        [ ✓ Terminer ]                                 │
└──────────────────────────────────────────────────────────────────────┘
```

- **Cases à cocher** sur composants et étapes ; **barre de progression** globale (n/total).
- L'**étape en cours** (première non cochée) est mise en évidence.
- **Multiplicateur** repris du détail (les quantités cochées reflètent l'échelle choisie).
- **Écran maintenu allumé** pendant le mode (wake lock, avec repli silencieux si indisponible).
- **`✓ Terminer`** ou **`✕`** ferme le mode et **abandonne l'état coché** (éphémère, RG-08). Aucune trace conservée. Confirmation légère si des cases étaient cochées.

### 5.4 Création / édition (modale ou plein écran)

Déclenché par **+ Savoir-faire** (création) ou **Éditer** (édition). Un seul formulaire,
identique quelle que soit la catégorie.

Champs :
- **Titre** (obligatoire, max 120 car.) — focus auto.
- **Objectif** (texte court, optionnel).
- **Catégorie** (sélecteur listant les catégories existantes ; défaut « sans catégorie »). **La création de catégorie ne se fait pas ici** : un texte d'aide renvoie vers le Référentiel. + **Labels** (saisie avec autocomplétion sur les labels existants).
- **Rendement** : texte (« 4 personnes ») + base numérique optionnelle pour l'échelle.
- **Temps total** (minutes, optionnel).
- **Composants** : liste éditable ligne à ligne `quantité? · unité? · intitulé · note?`, **ajout rapide** (Entrée ajoute une ligne), **drag & drop** pour réordonner, suppression par ligne.
- **Étapes** : liste de zones de texte ordonnées, ajout rapide, drag & drop, suppression.
- **Couleur** (palette Keep, 8–10 teintes + neutre).
- (Édition) actions **Archiver** et **Supprimer**.

Boutons : **Annuler** / **Enregistrer**. Validation : titre non vide (seule contrainte
dure). Lignes de composant/étape **vides ignorées** à l'enregistrement (RG-02).

### 5.5 Gestion des catégories (page Référentiel)

La gestion des catégories est **centralisée dans la page Référentiel**, sous l'onglet
« Catégories de savoir-faire », aux côtés des autres listes réutilisables. On y accède via
le lien « Gérer les catégories » du board (qui ouvre directement cet onglet).

- Liste des catégories (icône + nom + nombre de savoir-faire), **réordonnables** (drag & drop).
- **Créer** : nom (unique) + **icône** (sélecteur d'émoji).
- **Renommer / changer l'icône** d'une catégorie existante (y compris celles par défaut).
- **Supprimer** une catégorie : les savoir-faire rattachés repassent **« sans catégorie »** (jamais supprimés) → confirmation rappelant le nombre de savoir-faire impactés (RG-04).

---

## 6. Règles de gestion détaillées

### 6.1 Savoir-faire & contenu
- **RG-01** — Une savoir-faire exige uniquement un **titre** non vide ; tout le reste est optionnel. Les titres **ne sont pas uniques** (variantes assumées).
- **RG-02** — À l'enregistrement, les lignes de composant **sans `label`** et les étapes **sans `text`** sont **supprimées** (saisie permissive). L'ordre est compacté.

### 6.2 Catégories (gérées par l'utilisateur)
- **RG-03** — Une savoir-faire a **au plus une** catégorie (`categoryId`), ou aucune. La catégorie ne sert qu'au **tri/filtre/couleur** ; la changer n'altère ni les composants ni les étapes.
- **RG-04** — Les catégories sont **librement créées / renommées / supprimées** par l'utilisateur. Le `name` est **unique** (insensible à la casse). **Supprimer** une catégorie ne supprime **aucun savoir-faire** : les savoir-faire concernés repassent **« sans catégorie »** (confirmation indiquant le nombre impacté).
- **RG-05** — Le **référentiel par défaut** (Cuisine, Maison, Soin, Bricolage, Autre) n'est qu'un **amorçage** : ces entrées sont éditables et supprimables comme les autres.

### 6.3 Board, recherche, filtres
- **RG-06** — Tri du board : **épinglées d'abord**, puis non épinglées ; au sein de chaque bloc, ordre **manuel** (`position`), à défaut par `updatedAt` décroissant.
- **RG-07** — La **recherche** porte sur `title`, `goal`, `components.label`, `steps.text`, `labels` (insensible casse/accents). Les **filtres** catégorie et labels se combinent en **ET** avec la recherche.
- **RG-08** — Les **labels** sont normalisés (trim) et dédoublonnés insensible à la casse au sein d'un savoir-faire ; la casse de la première occurrence est conservée. Épingler/désépingler **n'altère pas** `updatedAt`.

### 6.4 Mise à l'échelle
- **RG-09** — Disponible si le savoir-faire a au moins un composant **chiffré** (`quantity ≠ null`). Le facteur vient d'un **multiplicateur** (×0,5 / ×1 / ×2 / ×3…) ou d'un **rendement cible** rapporté à `yieldBase` (si renseigné).
- **RG-10** — Quantités affichées = `quantity × facteur`, **arrondies** à une précision lisible (≤ 2 décimales, décimales inutiles supprimées). Les composants **sans quantité** sont **inchangés**.
- **RG-11** — La mise à l'échelle est **purement d'affichage** (lecture seule) : elle ne modifie ni ne persiste les `Component`. Réinitialisée à ×1 à la réouverture.

### 6.5 Mode Réalisation (état éphémère)
- **RG-12** — L'état de cochage (composants/étapes) est **local et non persisté** : il vit le temps de la session du mode et est **perdu** à la sortie. Il ne crée **aucune** donnée.
- **RG-13** — Le **wake lock** est activé à l'entrée et **relâché** à la sortie ; son indisponibilité (navigateur/plateforme) est **silencieuse** (pas d'erreur bloquante).

### 6.6 Cycle de vie
- **RG-14 — Dupliquer** : crée une copie complète (composants, étapes, méta, catégorie) avec un titre suffixé « (copie) », **non épinglée**, placée dans « Autres ».
- **RG-15 — Archiver** : retire le savoir-faire du board courant **sans rien supprimer** (réversible) ; accessible via un filtre « Archivés ».
- **RG-16 — Supprimer** : suppression définitive de le savoir-faire → **confirmation explicite** (« Supprimer "{titre}" ? Action irréversible. »). L'archivage est à privilégier.

---

## 7. Micro-interactions & Feedback

- **Cochage (Mode Réalisation)** : bascule immédiate + barre de progression qui avance ; l'étape « en cours » se déplace automatiquement à la première non cochée.
- **Épingler** : la carte « décolle » vers le bloc Épinglées avec une transition douce ; icône 📌 ↔ 📍.
- **Changer la couleur** : application instantanée sur la carte et le détail (optimistic UI).
- **Mise à l'échelle** : `− / +` recalcule les quantités en direct ; badge du facteur (`×2`) visible ; bouton de réinitialisation à ×1.
- **Gestion des catégories dans le Référentiel** : créer / renommer / changer l'icône met à jour immédiatement les filtres et le sélecteur du formulaire de savoir-faire.
- **Ajout rapide** (édition) : Entrée valide la ligne courante et en crée une nouvelle (composants et étapes) ; le focus reste dans la liste.
- **Drag & drop** : poignée ⠿ au survol/mobile ; réordonnancement fluide, persistant (cartes, composants, étapes, catégories).
- **Recherche** : filtrage live (debounce), surlignage léger des termes trouvés (optionnel).
- **Confirmation de suppression** : savoir-faire (irréversible) ; catégorie (rappel du nombre de savoir-faire qui repasseront « sans catégorie »).

---

## 8. Accessibilité & Responsive

- **Board** : structure annoncée (« Épinglées », « Autres ») ; chaque carte est un élément focusable annonçant « {titre}, {catégorie}, {n} composants, {n} étapes{, épinglé} ».
- **Mode Réalisation** : cases à cocher = vrais `checkbox` accessibles (état annoncé) ; progression annoncée (« étape 3 sur 9 ») ; navigation et cochage **au clavier** (Espace/Entrée).
- **Couleur non porteuse seule** : la couleur de carte est décorative ; catégorie portée par **icône + libellé**, labels par **texte**.
- **Cibles tactiles** : cartes, cases à cocher et poignées de drag ≥ 40 px sur mobile ; ≥ 44 px pour les cases du Mode Réalisation (usage « mains occupées »).
- **Mobile** : board en **1–2 colonnes** masonry ; création/édition, gestion des catégories et Mode Réalisation en **plein écran** ; gros texte et fort contraste en réalisation ; clavier numérique pour les quantités.
- **Mode Réalisation** pensé pour la cuisine/atelier : peu d'interactions fines, grandes zones cliquables, écran qui ne s'éteint pas.

---

## 9. Cas limites & Questions ouvertes

**Cas limites traités :**
- **Savoir-faire « titre seul »** (ni composant ni étape) → valide ; la carte affiche le titre et la catégorie, sans aperçu de contenu.
- **Savoir-faire sans catégorie** → autorisée ; affichée sous un libellé neutre, filtrable via « Sans catégorie ».
- **Composants sans quantité** (« sel », « vinaigre blanc ») → affichés tels quels ; **exclus** de la mise à l'échelle (RG-10).
- **Mise à l'échelle indisponible** (aucun composant chiffré) → contrôle de portions **masqué** (RG-09).
- **Lignes vides** laissées à l'édition → ignorées à l'enregistrement (RG-02).
- **Sortie du Mode Réalisation** → cochage perdu, rien enregistré (RG-12) ; confirmation si des cases étaient cochées.
- **Suppression d'une catégorie utilisée** → savoir-faire conservés, repassés « sans catégorie » (RG-04).
- **Suppression vs archivage d'un savoir-faire** → l'archivage préserve le savoir-faire ; la suppression est irréversible (RG-15/16).
- **Wake lock indisponible** → repli silencieux, le mode reste utilisable (RG-13).
- **Recherche sans résultat** → message dédié + réinitialisation des filtres.

**Questions ouvertes à trancher avec le PO :**
1. **Catégorie unique** par savoir-faire (reco), ou plusieurs ? → *Reco : unique ; les labels couvrent le besoin de classement multiple.*
2. **Sections de composants** : convention (`— titre —`) au MVP, ou vrai type de ligne « section » ? → *Reco : convention au MVP, typer en V2 si besoin.*
3. **Mise à l'échelle** par multiplicateur seul, ou aussi par **rendement cible** ? → *Reco : multiplicateur au MVP ; rendement cible si `yieldBase` présent, sinon masqué.*
4. **Mode Réalisation** dans le MVP, ou plus tard ? → *Reco : le garder, c'est un vrai confort d'usage et il ne coûte aucune donnée (état éphémère).*

---

## 10. Backlog / Évolutions futures (V2+)

- **Photo / illustration** : miniature de carte, puis illustration par étape (utile au bricolage).
- **Liste de courses** : agrégation des composants de plusieurs savoir-faire (avec mise à l'échelle), regroupés par intitulé.
- **Planification** : associer des savoir-faire à des jours (meal planning / planning de tâches), vue calendrier.
- **Import** : depuis une URL (sites de recettes), OCR d'une photo, coller-analyser un texte.
- **Partage / export** : PDF imprimable, lien partageable, export Markdown.
- **Sous-savoir-faire** : référencer un savoir-faire comme composant d'une autre (la pâte d'une tarte).
- **Conversion d'unités** (g ↔ ml selon densité, °C ↔ °F) et **table nutritionnelle** (cuisine).
- **Minuteurs** intégrés aux étapes (« laisser reposer 30 min » → minuteur en un tap).
- **Compteur / journal de réalisations** (si le besoin de suivi réapparaît) : aujourd'hui hors périmètre par choix.

---

## 11. Critères d'acceptation (récapitulatif testable)

- [ ] Je peux **créer un savoir-faire** avec un **titre seul** ; je peux l'enrichir d'objectif, catégorie, labels, composants, étapes, rendement, temps et couleur.
- [ ] Je peux **gérer mes catégories** : un référentiel par défaut existe, et je peux **créer / renommer / changer l'icône / supprimer** des catégories ; supprimer une catégorie **ne supprime aucun savoir-faire** (elles repassent « sans catégorie »).
- [ ] Le **board** affiche les savoir-faire en **cartes masonry** façon Google Keep, avec **épinglage**, **couleur** et aperçu (catégorie, méta, labels, décompte/aperçu de contenu).
- [ ] La **recherche plein-texte** (titre, composants, étapes, labels) et les **filtres** par catégorie et label fonctionnent et se combinent.
- [ ] Le **détail** affiche composants et étapes **ordonnés** ; je peux **réordonner** composants et étapes en édition (drag & drop, ordre persistant).
- [ ] La **mise à l'échelle** recalcule les quantités chiffrées via un multiplicateur (composants sans quantité inchangés), en **lecture seule**.
- [ ] Le **Mode Réalisation** rend composants et étapes **cochables**, affiche la progression, maintient l'écran allumé, et **n'enregistre rien** (état éphémère).
- [ ] Je peux **dupliquer**, **archiver** (réversible) et **supprimer** (confirmation, irréversible) un savoir-faire.
- [ ] Une savoir-faire **sans contenu chiffré** masque le contrôle de portions ; les **lignes vides** sont ignorées à l'enregistrement.
- [ ] Le module **ne tient aucun compteur/historique de réalisations** et ne produit **aucune donnée de gamification**.
- [ ] L'ensemble est utilisable **au clavier** et **sur mobile** (board responsive, édition, gestion des catégories et Mode Réalisation en plein écran).
