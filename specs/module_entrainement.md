# Module Entraînement — Spécification détaillée

> **Document de spécification fonctionnelle & UX/UI** · Version 1.1 · 2026-06-14
> Module **Physique** de l'application **Progression** (Module 1 du cadrage). Document autoporteur (le module est indépendant).
> Référence du périmètre global : [`mvp_v1.md`](./mvp_v1.md).
>
> **Changements v1.1** : périmètre ramené à **3 types** (Musculation, Cardio, Autre — le Padel passe au backlog) ; ajout d'une séance **directement au clic sur un jour** ; **détail d'un évènement en off-canvas** ; **calendrier en 4 vues** (Jour / Semaine / Mois / Année) ; **horaire optionnel** (sans horaire = évènement « journée ») ; **Dashboard retiré** du périmètre (on se concentre sur le module).

---

## 1. Intention & Philosophie

Le module Entraînement matérialise la **pratique physique dans le temps**. Son but
n'est pas de programmer des séances ni de coacher, mais de **logger vite ce qu'on
a fait** et d'en **tirer une progression mesurable**.

Trois principes directeurs :

1. **Saisie rapide.** Logger une séance prend quelques secondes. Le type choisi
   ouvre **un formulaire adapté** : aucun champ inutile, presque tout est optionnel
   sauf l'essentiel.
2. **Le calendrier prime.** L'écran principal est un **calendrier** (consultable au
   jour, à la semaine, au mois ou à l'année) : on « sent » sa pratique d'un coup
   d'œil (jours actifs, type et nombre de séances).
3. **La donnée brute nourrit la stat.** On saisit des faits simples (exercices,
   séries, durées) ; l'application en dérive les **statistiques de progression**
   (tonnage, records, volume) sans saisie supplémentaire.

Contrairement au module Habitudes (suivi **binaire** d'une routine), l'Entraînement
est un **journal d'événements riches** : plusieurs séances par jour, chacune avec
son contenu propre.

---

## 2. Concepts & Vocabulaire

| Terme | Définition |
|---|---|
| **Séance / Événement** | Une activité physique loggée pour un jour donné. Un jour peut en contenir plusieurs. |
| **Type d'événement** | Détermine le formulaire de saisie et les stats. MVP : **Musculation**, **Cardio**, **Autre**. |
| **Socle commun** | Champs partagés par tous les types : `date`, `type`, `horaire`, `durée`, `ressenti`. |
| **Horaire** | Heure de début **optionnelle**. Si renseignée, l'évènement est **horodaté** ; sinon, c'est un **évènement « journée »** (réalisé dans la journée, sans heure précise). |
| **Durée** | Temps de la séance en minutes (optionnel). Pour le Cardio, c'est le **temps global**. |
| **Ressenti** | Note subjective de la séance, de 1 à 5 (optionnelle). |
| **Exercice** | (Musculation) Un mouvement nommé (ex. « Développé couché ») contenant une ou plusieurs séries. |
| **Série (set)** | (Musculation) Une exécution : `reps` (répétitions) × `charge` (kg). |
| **Tonnage** | (Musculation) Volume de travail d'une séance = `Σ (reps × charge)` sur toutes les séries. |
| **Charge max** | (Musculation) Charge la plus lourde levée pour un exercice donné, suivie dans le temps. |
| **Record perso (PR)** | (Musculation) Nouvelle charge max atteinte pour un exercice → jalon de progression. |
| **Zone (cardio)** | Zone de **fréquence cardiaque** de la séance, de **Z1 à Z5** (pourcentage de la FC max). Barème détaillé en §4.3. |

---

## 3. Périmètre

### Dans le périmètre (MVP)
- **Calendrier** consultable en **4 vues** : **Jour**, **Semaine**, **Mois**, **Année** ; navigation période précédente / suivante + retour à la période courante.
- **Ajout direct au clic sur un jour** (ou un créneau horaire en vue Jour/Semaine).
- **Détail d'un évènement** au clic, affiché dans un **panneau off-canvas** (consultation + édition + suppression).
- Créer une séance en choisissant **un des 3 types**, avec **formulaire adapté**.
- **Socle commun** : date, **horaire optionnel**, durée (min, optionnelle), ressenti (1–5, optionnel).
- **Musculation** : liste d'exercices, chacun avec ses séries (reps × charge) ; **réutilisation du nom d'exercice** (autocomplétion) pour consolider les stats.
- **Cardio** : zone d'intensité, temps global, description.
- **Autre** : titre + description libre.
- **Vue Statistiques** par type (indicateurs clés ; volet secondaire, voir §5.6).
- Calcul et affichage : tonnage, charge max & PR par exercice (Musculation) ; volume et temps (Cardio / tous types).

### Hors périmètre (renvoyé en V2 — voir §10)
- **Dashboard** (agrégation multi-modules) — explicitement hors de ce lot.
- Nouveaux types d'activité, dont **Padel (match / tournoi)**, course, vélo… avec stats dédiées.
- Modèles de séances réutilisables / programmation à l'avance.
- Imports automatiques (Strava, Apple Health, Google Fit).
- 1RM estimé, RPE, supersets, temps de repos, tempo.
- Graphiques avancés / comparaisons multi-périodes poussées.

---

## 4. Modèle de données

### 4.1 Socle — `TrainingEvent`
Tronc commun à **tous** les types.

| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `date` | date (YYYY-MM-DD) | Jour de la séance. Date locale, sans heure. |
| `type` | enum | `musculation` \| `cardio` \| `autre`. **Immuable après création** (changer de type = nouvelle séance). |
| `startTime` | string (HH:MM) \| null | Horaire de début **optionnel**. `null` → évènement « journée » (§6.2). |
| `durationMin` | int \| null | Durée en minutes (optionnelle, ≥ 0). Pour le Cardio : **temps global**. |
| `feeling` | int \| null | Ressenti 1–5 (optionnel). |
| `createdAt` | datetime | Auto. |
| `updatedAt` | datetime | Auto (mis à jour à chaque édition). |

Le **contenu spécifique** dépend du `type` (§4.2 à §4.4).

### 4.2 Type `musculation`
Relationnel (les exercices sont requêtés **par nom, à travers les séances**, pour
les stats de progression).

**`Exercise`**
| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `eventId` | UUID | FK → `TrainingEvent`. |
| `name` | string | Obligatoire, 1–60 car. **Normalisé** (trim ; comparaison insensible à la casse pour la consolidation). |
| `position` | int | Ordre dans la séance. |

**`ExerciseSet`**
| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `exerciseId` | UUID | FK → `Exercise`. |
| `reps` | int | ≥ 1. |
| `weight` | number | Charge en kg, ≥ 0 (0 autorisé = poids du corps). |
| `position` | int | Ordre de la série. |

### 4.3 Type `cardio`
| Champ | Type | Règles |
|---|---|---|
| `zone` | enum \| null | Zone de fréquence cardiaque : `Z1` \| `Z2` \| `Z3` \| `Z4` \| `Z5` (voir barème ci-dessous). Optionnelle. |
| `description` | string \| null | Texte libre (parcours, sensations…). |

**Barème des zones de fréquence cardiaque** (référence : 5 zones basées sur un % de
la FC max ; sert à libeller le sélecteur du formulaire) :

| Zone | % FC max | Effort | Objectif |
|---|---|---|---|
| **Z1** | 50–60 % | Très léger | Échauffement / récupération active |
| **Z2** | 60–70 % | Léger, soutenable | Endurance fondamentale, utilisation des graisses |
| **Z3** | 70–80 % | Modéré | Capacité aérobie, endurance |
| **Z4** | 80–90 % | Soutenu | Seuil anaérobie, vitesse |
| **Z5** | 90–100 % | Maximal | Puissance, intervalles courts (VO2max) |

> Le **temps global** du cardio utilise `durationMin` du socle (champ mis en avant
> dans le formulaire cardio). Une séance porte **une zone dominante** (Z1–Z5) ; le
> découpage d'une séance en plusieurs zones est renvoyé au backlog (§10).

### 4.4 Type `autre`
| Champ | Type | Règles |
|---|---|---|
| `title` | string | Obligatoire, 1–60 car. |
| `description` | string \| null | Texte libre. |

> **Note de conception (persistance).** Le socle `TrainingEvent` et la
> Musculation (`Exercise` / `ExerciseSet`) sont **relationnels** car les stats
> croisent les exercices entre séances. Les champs de Cardio et « Autre » sont des
> **détails plats propres à une séance** : leur stockage exact (colonnes typées ou
> objet `details`) est un choix d'implémentation (doc technique), sans impact
> fonctionnel.

---

## 5. Architecture des écrans (UX/UI)

### 5.0 Barre de contrôle (commune aux vues calendrier)

- **Sélecteur de vue** (segmented control) : `Jour` · `Semaine` · `Mois` · `Année`.
- **Navigateur de période** : flèches `◄ ►` + libellé contextuel (« 14 juin 2026 »,
  « Sem. 24 — juin 2026 », « Juin 2026 », « 2026ﾠ») + bouton **Aujourd'hui**.
- Bouton global **+ Séance** (crée une séance, date pré-remplie selon le contexte).
- Accès à la **vue Statistiques** (§5.6).

La vue et la période sélectionnées sont **mémorisées** (au moins le temps de la session).

### 5.1 Vue Mois (écran d'atterrissage)

```
┌────────────────────────────────────────────────────────────────────┐
│  ← Entraînement                                      [ + Séance ]    │
│   ◄  Juin 2026  ►        [ Jour · Semaine · Mois · Année ]  [Stats]  │
│                                                   [ Aujourd'hui ]    │
│   Lun     Mar     Mer     Jeu     Ven     Sam     Dim                │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐                         │
│  │  1  │  2  │  3  │  4  │  5  │  6  │  7  │                         │
│  │💪Mu.│     │🏃Ca.│     │💪 + │     │     │   "+" = plusieurs       │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                         │
│  │  8  │  9  │ 10  │ 11  │ 12  │ 13  │ 14◀ │  ← jour courant         │
│  │     │💪Mu.│     │🏃Ca.│     │     │💪Mu.│                         │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┘   ...                   │
│                                                                      │
│  Ce mois : 9 séances · 6h45 · Muscu 5 · Cardio 4                     │
└────────────────────────────────────────────────────────────────────┘
```

- Grille calendaire (lundi → dimanche), **jour courant surligné**, jours hors mois atténués.
- Chaque jour actif affiche des **chips d'évènement** compactes : icône de type +
  libellé court (et heure si horodaté). Au-delà de 2–3 chips, un **« +N »** renvoie
  au détail du jour.
- **Clic sur la zone vide d'un jour** → création d'une séance à cette date (§5.5).
- **Clic sur une chip** → ouvre le **détail de l'évènement** en off-canvas (§5.4).
- **Pied de calendrier** : KPIs du mois (nb de séances, durée totale, répartition par type).

### 5.2 Vues Semaine & Jour (horaires)

Vues à **timeline horaire** (axe vertical des heures), pensées pour situer les
séances horodatées dans la journée.

- **Bandeau « journée »** en haut : les évènements **sans horaire** y apparaissent
  sous forme de **chips compactes** — ils signalent « fait dans la journée » **sans
  occuper toute la colonne** ni la timeline.
- **Évènements horodatés** : positionnés à leur `startTime`, hauteur indicative
  selon `durationMin` (hauteur minimale si durée absente). Chevauchements gérés
  côte à côte.
- **Vue Semaine** : 7 colonnes (jours). **Vue Jour** : une seule colonne + la liste
  détaillée des séances du jour dessous.
- **Clic sur un créneau** → création avec date **et** horaire pré-remplis.
- **Clic sur un bloc / une chip** → détail off-canvas.

### 5.3 Vue Année (densité)

Vue condensée d'ensemble : **12 mini-mois**. Chaque jour est coloré selon son
**activité** (présence / nombre de séances → intensité, façon heatmap), avec une
teinte ou un point.

- Objectif : repérer les périodes denses / creuses sur l'année.
- **Clic sur un jour** → bascule en **vue Jour** sur ce jour ; clic sur un libellé
  de mois → **vue Mois**.

### 5.4 Détail d'un évènement — panneau off-canvas

**Choix d'UX retenu : un panneau latéral (off-canvas / drawer) glissant depuis la
droite.** Justification :
- Le calendrier **reste visible** derrière → on garde le contexte, on peut enchaîner.
- Assez de place pour un **contenu riche** (liste d'exercices et séries en muscu),
  contrairement à une petite modale.
- Ouverture/fermeture légères, adaptées à une consultation rapide ; sur **mobile**,
  le panneau passe en **plein écran** (équivaut à une vue dédiée).

Contenu :
- En-tête : icône de type, date, **horaire** (ou badge « Journée » si sans horaire),
  durée, ressenti.
- **Corps selon le type** :
  - 💪 *Musculation* : exercices → séries (`reps × charge`), **tonnage** de la séance.
  - 🏃 *Cardio* : zone, temps global, description.
  - 📝 *Autre* : titre, description.
- Actions : **Éditer**, **Supprimer** (avec confirmation), **Fermer**.

### 5.5 Création / édition d'une séance

**Étape 1 — Choix du type** (à la création uniquement ; type immuable ensuite) :
3 tuiles (💪 Musculation / 🏃 Cardio / 📝 Autre).

**Étape 2 — Formulaire adapté.** Socle commun en tête (date, **horaire optionnel**,
durée, ressenti), puis les champs du type :

- **💪 Musculation** : liste d'**exercices** ; pour chacun, **nom** (autocomplété
  depuis l'historique) et **séries** `reps × charge (kg)` (ajout/suppression rapides ;
  « + série » duplique la dernière). **Tonnage** calculé en direct.
- **🏃 Cardio** : **zone** (sélecteur **Z1–Z5**, avec le % de FC max et l'objectif en
  aide), **temps global** (durée), **description**.
- **📝 Autre** : **titre** (obligatoire), **description**.

**Horaire** : un interrupteur « Préciser un horaire » ; désactivé → évènement
« journée ». Le formulaire est pré-rempli selon le point d'entrée (jour cliqué,
créneau horaire, ou bouton global).

Boutons : **Annuler** / **Enregistrer**. Validations en §6.

### 5.6 Vue Statistiques (volet secondaire)

Accès via le bouton `Stats`. Période par défaut = mois courant (bascule mois /
année / tout).

- **Vue d'ensemble** : nb de séances, durée totale, ressenti moyen, répartition par type.
- **💪 Musculation** : **tonnage dans le temps**, **charge max par exercice** +
  historique d'un exercice, **PR récents**.
- **🏃 Cardio** : volume (nb de séances, temps total), **répartition du temps par zone Z1–Z5**.
- **📝 Autre** : volume et régularité.

> Volet **secondaire** au MVP : quelques indicateurs justes et lisibles, pas une
> profusion de graphiques. Les visualisations avancées sont en backlog (§10).

---

## 6. Règles de gestion détaillées

### 6.1 Séances & jours
- **RG-01** — Un jour peut contenir **0, 1 ou plusieurs** séances, de types identiques ou différents.
- **RG-02** — La saisie est **permissive sur la date** : on peut logger une séance sur n'importe quel jour (passé, aujourd'hui ; futur autorisé pour planifier, mais l'usage premier est le journal). La date par défaut découle du point d'entrée (jour/créneau cliqué, sinon aujourd'hui).
- **RG-03** — Le **type est choisi à la création et immuable** : pour corriger un type, on supprime et on recrée.
- **RG-04** — `startTime`, `durationMin` et `feeling` sont **optionnels** ; `feeling`, s'il est fourni, est un entier 1–5.
- **RG-05** — La **suppression** d'une séance supprime en cascade son contenu (exercices/séries). Action destructive → **confirmation explicite**.

### 6.2 Horaire & affichage (évènement « journée » vs horodaté)
- **RG-06** — Si `startTime` est `null`, l'évènement est de type **« journée »** : il s'affiche en **chip compacte** dans le bandeau « journée » (vues Jour/Semaine) ou en chip inline (vue Mois), **sans occuper la timeline** ni toute la cellule.
- **RG-07** — Si `startTime` est renseigné, l'évènement est **horodaté** : positionné à son heure dans les vues Jour/Semaine ; sa hauteur reflète `durationMin` (hauteur minimale lisible si la durée est absente).
- **RG-08** — En **vue Mois**, horodatés et « journée » s'affichent tous deux en chips ; les horodatés sont **triés par heure** puis les « journée » ; l'heure est préfixée pour les horodatés.

### 6.3 Musculation
- **RG-09** — Un exercice a un **nom obligatoire** et **au moins une série** ; une série a `reps ≥ 1` et `weight ≥ 0`.
- **RG-10** — **Tonnage d'une séance** = `Σ (reps × weight)` sur toutes les séries de tous les exercices.
- **RG-11** — La **consolidation par exercice** se fait sur le **nom normalisé** (trim + insensible à la casse). « Développé couché » et « developpe couche » sont le même exercice pour les stats. *(La casse saisie est conservée pour l'affichage.)*
- **RG-12** — **Charge max d'un exercice** (sur une période) = `max(weight)` parmi ses séries sur la période.
- **RG-13** — **Record perso (PR)** : à l'enregistrement, si la charge max d'un exercice **dépasse** son précédent maximum historique, un évènement `pr_reached { exerciseName, weight, date }` est émis/loggé (feedback §7, persistant pour le futur moteur de points).

### 6.4 Cardio
- **RG-14** — Aucun champ cardio n'est strictement obligatoire au-delà du socle, mais le formulaire **met en avant** zone + temps global. La `zone`, si renseignée, vaut **une valeur parmi Z1–Z5** (zone de FC, voir barème §4.3).

### 6.5 Autre
- **RG-15** — `title` obligatoire ; `description` libre. Pas de stat structurée : contribue au **volume global** de séances.

### 6.6 Statistiques & période
- **RG-16** — Les stats se calculent sur la **période sélectionnée** (défaut : mois courant).
- **RG-17** — Une séance **sans durée** compte dans le nombre de séances mais pas dans la **durée totale**.

---

## 7. Micro-interactions & Feedback

- **Saisie express Musculation** : « + série » duplique la dernière (reps/charge) ; le **tonnage se met à jour en direct**.
- **Autocomplétion d'exercice** : suggestions dès 2 caractères, basées sur l'historique ; sélectionner une suggestion garantit la consolidation des stats.
- **Création contextuelle** : cliquer un jour (Mois/Année) ou un créneau (Jour/Semaine) pré-remplit date (et horaire) dans le formulaire.
- **Off-canvas** : ouverture/fermeture animées ; le calendrier reste visible derrière (overlay léger).
- **Chips d'activité** : mises à jour immédiates après ajout/suppression (optimistic UI ; rollback + toast en cas d'échec).
- **Franchissement de PR** : à l'enregistrement, animation + toast « 🏋️ Nouveau record : Développé couché 65 kg ! ». Non bloquant.
- **Confirmation de suppression** d'une séance (message clair si elle contient des exercices).
- **Recentrage** : « Aujourd'hui » ramène à la période courante et met le jour J en évidence.

---

## 8. Accessibilité & Responsive

- **Clavier** : navigation de jour en jour / créneau en créneau (flèches), Entrée pour ouvrir/créer ; formulaires entièrement utilisables au clavier (ajout de série, interrupteur horaire…).
- **Lecteurs d'écran** : chaque jour annonce « {date}, {n} séances : {types} » ; chaque évènement annonce son résumé et son statut horaire (« journée » ou heure).
- **Cibles tactiles** : cellules de calendrier, chips et boutons d'ajout de série ≥ 40 px sur mobile.
- **Mobile** : les vues **Jour** et **Mois** sont privilégiées ; la vue Semaine reste scrollable ; l'**off-canvas passe en plein écran**. Claviers numériques pour reps/charge/durée/horaire.

---

## 9. Cas limites & Questions ouvertes

**Cas limites traités :**
- Mois à 28–31 jours, débord de semaines → grille calendaire dynamique (jours hors mois atténués).
- Jour avec **plusieurs séances** → chips + « +N » ; détail du jour / off-canvas par évènement.
- **Évènements horodatés qui se chevauchent** (vues Jour/Semaine) → affichage côte à côte.
- Séance Musculation **sans série valide** → refusée (au moins une série requise).
- Exercice saisi avec une variante de casse/espaces → consolidé via le nom normalisé (RG-11).
- Suppression d'une séance portant un PR → la charge max / les records sont **recalculés** sur l'historique restant.
- Séance **sans horaire / sans durée / sans ressenti** → autorisée (champs optionnels).

**Décision actée :**
- **« Zone » (cardio) = zone de fréquence cardiaque Z1–Z5** (% de la FC max), une
  zone dominante par séance (barème §4.3).

**Questions ouvertes à trancher avec le PO :**
1. **Définition du PR** : charge max absolue par exercice (reco) ou PR **par plage de reps** (ex. max à 5 reps) ? → *Reco : charge max absolue au MVP.*
2. **Planification future** : autorise-t-on des séances dans le futur, ou journal strictement passé/aujourd'hui ? → *Reco : permissif, comme le module Habitudes.*
3. **Granularité de la vue Semaine/Jour** : plage horaire affichée (ex. 6h–23h) et pas de la timeline (30 min / 1 h) ?
4. **Profondeur de la vue Stats** au MVP (combien de graphiques, lesquels) ?

---

## 10. Backlog / Évolutions futures (V2+)

- **Dashboard** (agrégation multi-modules) — lot séparé, hors de ce module.
- **Nouveaux types** d'activité avec champs & stats dédiés, **sans toucher au socle** :
  - **🎾 Padel — Match** (`partenaire`, `adversaires`, `score`, `résultat` V/D ; ratio V/D, série de victoires).
  - **🏆 Padel — Tournoi** (`nom`, `partenaire`, `résultat/classement`, `nb matchs`, `notes`).
  - Course, vélo, natation…
- **Modèles de séances** réutilisables et **programmation** à l'avance.
  - **Programmes / Cycles** (périodisation, semaines de deload, séances planifiées) :
    spécification dédiée → [`module_entrainement_programmes.md`](./module_entrainement_programmes.md).
- **Imports** : Strava, Apple Health, Google Fit.
- **Musculation avancée** : 1RM estimé, RPE, temps de repos, supersets, tempo, graphes de progression par exercice, alertes PR enrichies.
- **Cardio avancé** : distance, allure, FC moyenne/max, **découpage d'une séance en plusieurs zones** (temps passé par zone), segments.
- **Gamification** (branchée sur les données déjà produites) : points par séance / par PR ; jalons (« 100 séances »).
- **Export** (CSV/PDF), bilan annuel.

---

## 11. Critères d'acceptation (récapitulatif testable)

- [ ] Le calendrier est consultable en **Jour / Semaine / Mois / Année**, avec navigation période précédente / suivante et « Aujourd'hui » ; jour courant surligné.
- [ ] Je peux **créer une séance en cliquant sur un jour** (Mois/Année) ou sur un **créneau horaire** (Jour/Semaine), avec date (et horaire) pré-remplis.
- [ ] Je peux créer une séance en choisissant un type parmi **3** (Musculation, Cardio, Autre), avec un formulaire adapté ; le type n'est plus modifiable après création.
- [ ] L'**horaire est optionnel** : sans horaire, l'évènement est « journée » et s'affiche en **chip compacte** sans occuper la timeline ; avec horaire, il est positionné à son heure.
- [ ] **Cliquer un évènement** ouvre un **panneau off-canvas** de détail (consultation), avec Éditer et Supprimer.
- [ ] Un jour peut recevoir 0, 1 ou plusieurs séances ; les jours actifs affichent une chip par évènement (+ « +N » si nombreux).
- [ ] Musculation : je peux ajouter exercices et séries (reps × charge) ; le tonnage de la séance est exact ; le nom d'exercice est auto-complété et les stats se consolident sur le nom normalisé.
- [ ] Un nouveau maximum de charge sur un exercice déclenche un feedback PR et émet un évènement persistant.
- [ ] Cardio : je peux saisir zone, temps global et description.
- [ ] Autre : le titre est obligatoire.
- [ ] La suppression d'une séance demande confirmation et cascade sur exercices/séries.
- [ ] La vue Stats présente, par type, les indicateurs clés sur la période sélectionnée (tonnage / charge max / PR ; volume & zones cardio).
