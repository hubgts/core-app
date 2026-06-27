# Module Santé / Poids — Spécification détaillée

> **Document de spécification fonctionnelle & UX/UI** · Version 1.0 · 2026-06-17
> Nouveau module de l'application. Document autoporteur (le module est indépendant).
> Référence du périmètre global : [`mvp.md`](./mvp.md).
>
> **Intention v1** : suivre le **poids** et quelques **mensurations** dans le temps, voir la **courbe** (avec tendance lissée pour gommer le bruit du quotidien), et se fixer un **objectif** avec progression et date estimée — sur le même principe que les [objectifs d'épargne](./objectifs_epargne.md).

---

## 1. Intention & Philosophie

Le module Santé matérialise **l'évolution du corps dans la durée**. Le poids quotidien est **bruité** (eau, repas, heure de pesée) : la valeur n'est pas dans le chiffre du jour mais dans la **tendance**. Le module met donc en avant une **moyenne lissée** plutôt que les soubresauts, et relie chaque mesure à un **objectif** clair.

Trois principes directeurs :

1. **Saisie minimale.** Une pesée = un nombre + une date (aujourd'hui par défaut). Les mensurations sont optionnelles.
2. **La tendance prime sur le point.** On affiche le poids brut **et** sa moyenne mobile ; c'est la courbe lissée qui guide.
3. **Un cap, pas une obsession.** Un objectif unique, une progression honnête, une date estimée au rythme réel — sans culpabilisation.

---

## 2. Concepts & Vocabulaire

| Terme | Définition |
|---|---|
| **Mesure (measurement)** | Un relevé daté : poids et/ou une ou plusieurs mensurations. **Au plus une mesure par jour.** |
| **Poids** | Valeur en **kg** (1 décimale). Métrique principale. |
| **Mensuration** | Tour de taille, hanches, bras, cuisse, etc. en **cm** — ensemble de champs optionnels. |
| **Tendance (moyenne lissée)** | Moyenne mobile (ex. EMA / 7 j) qui gomme le bruit quotidien du poids. |
| **Objectif (goal)** | Poids cible + date souhaitée optionnelle. Donne une **progression** et une **date estimée** (ETA) au rythme réel. |
| **IMC** | Indicateur dérivé `poids / taille²`, affiché à titre informatif si la taille est connue (jamais un jugement). |
| **Δ (delta)** | Variation sur une fenêtre : 7 j, 30 j, depuis le début / depuis le départ de l'objectif. |

---

## 3. Périmètre (MVP)

Tout ce qui suit est **dans le MVP**.

- Saisir / modifier / supprimer une **mesure** (poids et/ou mensurations) pour aujourd'hui ou une date passée.
- **Profil minimal** : taille (cm) et sexe optionnels — uniquement pour dériver IMC et libellés (jamais bloquant).
- **Vue Courbe** : poids brut + **moyenne lissée**, sur période **Mois / 3 mois / Année / Tout** ; ligne d'**objectif** et **bande de tendance**.
- **Mensurations** : suivi d'un jeu de mesures configurables (taille, hanches, bras, cuisse, poitrine, poids…), chacune avec sa mini-courbe.
- **Objectif** : poids cible + date optionnelle → **barre de progression**, **ETA** estimée au rythme réel, statut (on_track / behind / atteint).
- **KPIs** : poids actuel (= dernière tendance), Δ 7 j / 30 j / total, IMC (si taille), reste à parcourir.
- **Historique** : liste des mesures (édition/suppression rapide).
- **Corrélation légère** (lecture seule, opt-in) : poids/tendance superposé au **volume d'entraînement** (module Training) sur la même période.

> Hors MVP (backlog §10) : photos de progression, masse grasse / composition corporelle, multi-objectifs, rappels de pesée, import balance connectée, unités impériales.

---

## 4. Modèle de données

### Entité `BodyMeasurement`
| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `date` | date (YYYY-MM-DD) | **Unique** : au plus une mesure par jour (date locale). |
| `weightKg` | numeric \| null | Poids en kg, 1 décimale. Au moins un champ (poids **ou** une mensuration) doit être renseigné. |
| `note` | string \| null | Optionnel (ex. « après sport »). |
| `createdAt` | datetime | Auto. |
| `updatedAt` | datetime | Auto. |

### Entité `MeasurementValue` (mensurations, n par mesure)
| Champ | Type | Règles |
|---|---|---|
| `measurementId` | UUID | FK → `BodyMeasurement` (cascade delete). |
| `metricKey` | string | Clé de métrique (`waist`, `hips`, `arm`, `thigh`, `chest`…). |
| `valueCm` | numeric | Valeur en cm. |

### Entité `HealthProfile` (singleton)
| Champ | Type | Règles |
|---|---|---|
| `heightCm` | numeric \| null | Pour l'IMC. Optionnel. |
| `sex` | enum \| null | `f` \| `m` \| null. Informatif. |
| `metrics` | string[] | Mensurations suivies/affichées (sous-ensemble configurable). |

### Entité `HealthGoal` (objectif de poids — au plus 1 actif)
| Champ | Type | Règles |
|---|---|---|
| `id` | UUID | Généré. |
| `targetWeightKg` | numeric | Poids visé. |
| `targetDate` | date \| null | Échéance souhaitée (optionnelle). |
| `startedAt` | date | Ancrage du calcul de progression (défaut : 1ʳᵉ mesure ≥ création). |
| `status` | enum | `active` \| `reached` \| `archived`. |

**Règles structurelles :**
- Unicité **une mesure par `date`** : ressaisir le même jour = édition.
- Une mesure doit porter **au moins une valeur** (poids ou une mensuration).
- Dates **locales** ; « aujourd'hui » sur le fuseau de l'appareil.
- **Un seul objectif `active`** à la fois ; en créer un nouveau archive le précédent.

---

## 5. Architecture des écrans (UX/UI)

### 5.0 Barre de contrôle (commune)
- **Sélecteur de métrique** : `Poids` · `Taille` · `Hanches` · … (les mensurations suivies).
- **Filtre de période** : `Mois` · `3 mois` · `Année` · `Tout`.
- **Navigateur** : `◄ ►` + libellé + **Aujourd'hui**. Bouton **+ Pesée**.

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Santé / Poids                                       [ + Pesée ]     │
│   [ Poids │ Taille │ Hanches │ Bras ]      [ Mois │ 3 mois │ Année │ Tout ] │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.1 Vue Courbe (écran d'atterrissage)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Poids actuel  78,4 kg     Δ7j −0,6   Δ30j −1,9   Objectif 75,0 kg     │
│                                                                        │
│  kg                                                                    │
│  82 ┤ •                                                                │
│  80 ┤  •• •   ╭╮         ── tendance (moy. 7j)                          │
│  78 ┤ •  ╰────╯╰─•─╮  •   • pesée du jour                              │
│  76 ┤              ╰──────╮                                            │
│  75 ┤············· objectif ······· 🎯 atteint ~ 12 août 2026          │
│     └──────────────────────────────────────────────►                  │
│        juin      juil      août                                        │
└──────────────────────────────────────────────────────────────────────┘
```

- **Points** : pesées brutes (semi-transparents). **Ligne pleine** : tendance lissée (la lecture de référence).
- **Ligne d'objectif** : horizontale en pointillés (couleur **hex**, pas `var()` — cf. contrainte SVG du projet) ; **point ETA** sur la tendance projetée.
- **Bande de tendance** : léger ombrage autour de la moyenne mobile.
- **En-tête** : poids actuel (= dernière valeur de tendance), Δ 7 j / 30 j, objectif.
- **Interaction** : survol → tooltip `{date} · {brut} kg · tendance {x} kg`. Clic sur un point → édition de la mesure.
- **État vide** : « Enregistre ta première pesée » + bouton **+ Pesée**.

### 5.2 Bloc Objectif

```
┌───────────────────────────────────────────────┐
│  🎯 Objectif : 75,0 kg                          │
│  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░  68 %                          │
│  Reste 3,4 kg · −0,45 kg/sem · 🎯 ~ 12 août 2026 │
│  (échéance 1ᵉʳ sept. → ✅ dans les temps)        │
└───────────────────────────────────────────────┘
```

- **Progression** = `(start − current) / (start − target)` bornée `[0,1]` (gère perte **et** prise de poids selon le sens de l'objectif).
- **Rythme** = pente de la **tendance** depuis `startedAt` (kg/sem).
- **ETA** = projection de la tendance jusqu'à `targetWeightKg` ; `null` si le rythme va à l'opposé de la cible (« au rythme actuel, objectif non atteint »).
- **Statut vs `targetDate`** : `on_track` (ETA ≤ date), `behind` (affiche l'effort requis kg/sem pour tenir), `reached`.
- Réutilise la logique décrite dans [`objectifs_epargne.md`](./objectifs_epargne.md) (régression sur série datée, fallback < 3 points).

### 5.3 Mensurations

- Grille de **mini-courbes** (sparklines) par métrique suivie, avec dernière valeur + Δ.
- Clic → courbe plein écran de la métrique (même mécanique que le poids, objectif optionnel par métrique en backlog).
- Configuration des métriques affichées dans les **réglages** du module (`HealthProfile.metrics`).

### 5.4 Drawer de saisie (+ Pesée / édition)
- **Date** (défaut aujourd'hui, modifiable).
- **Poids** (kg, clavier décimal) + champs **mensurations** suivies (cm), tous optionnels mais au moins un requis.
- **Note** optionnelle.
- Actions : **Enregistrer** / **Annuler** ; en édition : **Supprimer** (confirmation).

### 5.5 Historique
- Liste anti-chronologique : date · poids · Δ vs précédente · icône note. Édition/suppression au clic.

---

## 6. Règles de gestion détaillées

- **RG-01** — Au plus **une mesure par date** ; ressaisir un jour = édition.
- **RG-02** — Une mesure exige **au moins une valeur** (poids ou une mensuration) ; sinon refus.
- **RG-03** — Le **poids affiché** (« actuel ») est la **dernière valeur de tendance**, pas la dernière pesée brute, pour éviter le bruit.
- **RG-04** — **Tendance** = moyenne mobile lissée (EMA ou MM 7 j) recalculée à chaque ajout/suppression.
- **RG-05** — Δ7j / Δ30j calculés sur la **tendance** entre deux dates (interpolation si pas de point exact).
- **RG-06** — **IMC** affiché seulement si `heightCm` connu ; présenté comme indicateur neutre, sans étiquette de jugement bloquante.
- **RG-07** — **Objectif** : `targetWeightKg > 0` ; un seul actif ; progression et ETA selon §5.2. Atteindre la cible (tendance franchit le seuil) → `status = reached`.
- **RG-08** — `startedAt` par défaut = date de la 1ʳᵉ mesure à/aprés la création de l'objectif ; modifiable.
- **RG-09** — Édition libre du passé ; dates **futures** interdites pour une mesure.
- **RG-10** — Suppression d'une mesure → recalcul tendance, Δ, progression, ETA.
- **RG-11** — Corrélation training : superposition lecture seule sur l'intersection des dates ; masquée si module Training absent/vide.

---

## 7. Micro-interactions & Feedback

- **Saisie optimiste** : le point apparaît et la tendance se recalcule immédiatement ; rollback + toast en cas d'échec.
- **Franchissement d'objectif** : feedback (halo + toast « 🎯 Objectif 75 kg atteint ! »), non bloquant ; passage en `reached`.
- **Δ coloré** selon le **sens de l'objectif** (perte voulue → Δ négatif en vert ; prise voulue → l'inverse), neutre si pas d'objectif.
- **Recentrage** : « Aujourd'hui » recadre la courbe sur la période récente.
- Bascule métrique/période : transition douce, pas de rechargement perçu.

---

## 8. Accessibilité & Responsive

- Δ et états ne reposent pas que sur la couleur (signe + flèche ↑/↓).
- Courbe : points/tendance avec tooltips textuels ; valeurs annoncées aux lecteurs d'écran (« 78,4 kg, tendance −0,6 sur 7 jours »).
- Clavier décimal sur mobile pour la saisie ; drawer en bottom-sheet.
- **Mobile** : courbe pleine largeur, sélecteur de métrique scrollable ; historique condensé.
- Pas de message moralisateur sur l'IMC ou l'objectif (santé sensible).

---

## 9. Cas limites

- Jour déjà mesuré rouvert → drawer pré-rempli (édition, pas doublon).
- Une seule mesure → pas de tendance fiable : afficher le point brut + « pas assez de données pour la tendance ».
- Objectif au rythme inverse de la cible → ETA = « — », message « au rythme actuel, objectif non atteint ».
- Taille absente → IMC masqué, reste fonctionnel.
- Mensuration retirée de `metrics` → ses valeurs historiques conservées, simplement non affichées.
- Grand trou entre deux pesées → tendance interpolée, Δ calculé sur les bornes disponibles (signalé au survol).
- Changement de fuseau / minuit → « aujourd'hui » réévalué.

---

## 10. Backlog / Évolutions futures (hors MVP)

- **Photos de progression** datées (avant/après).
- **Composition corporelle** : masse grasse, masse musculaire, eau (balance connectée).
- **Objectif par mensuration** (ex. tour de taille cible).
- **Rappels de pesée** (notification).
- **Import** depuis balances/health apps ; **unités impériales** (lb/in).
- **Corrélations enrichies** : poids ↔ nutrition (module Recettes/macros), poids ↔ humeur ([`module_journal.md`](./module_journal.md)).

---

## 11. Critères d'acceptation (récapitulatif testable)

- [ ] Je peux enregistrer une pesée (kg) et/ou des mensurations (cm) pour aujourd'hui ou un jour passé ; une seule mesure par date.
- [ ] La **vue Courbe** affiche le poids brut **et** la tendance lissée, avec ligne d'objectif et ETA, sur Mois/3 mois/Année/Tout.
- [ ] Le **poids actuel** affiché est la tendance, pas le dernier point brut ; Δ7j/Δ30j sont exacts.
- [ ] L'**objectif** montre une barre de progression (perte **ou** prise), une **date estimée** au rythme réel, et un statut vs échéance.
- [ ] L'**IMC** apparaît uniquement si la taille est renseignée, sans jugement bloquant.
- [ ] Les **mensurations** suivies ont chacune leur mini-courbe ; la liste des métriques est configurable.
- [ ] L'**historique** liste les mesures avec Δ et permet édition/suppression (avec recalcul de la tendance).
- [ ] Dates futures interdites ; édition libre du passé ; dates locales et recentrage « Aujourd'hui » corrects.
- [ ] La **corrélation Training** s'affiche en lecture seule quand des données existent, et se masque sinon.
