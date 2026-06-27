# Idées V2 — TrackMyself

> Réservoir d'idées pour la prochaine itération. **Aucune n'est implémentée** —
> ce document sert à prioriser. La spec fonctionnelle de référence reste
> `specs/` ; la doc `docs/<module>/` décrit l'état réel du code.

---

## Partie 1 — Idées par module existant

### ✅ Habitudes
- **Streaks & heatmap** : calendrier type GitHub, plus longue série, série en cours.
- **Habitudes flexibles** : « 3× par semaine » et pas seulement quotidiennes.
- **Habitudes quantifiées** : valeur cible (ex. 2 L d'eau, 30 min) et pas juste oui/non.
- **Rappels / notifications** : relances aux heures choisies.
- **Taux de complétion** : score global et par habitude sur la période.
- **Corrélations** : croiser habitudes ↔ humeur, training, finances (lien Journal).

### 🏋️ Entraînement
- **Records personnels (PR)** : détection auto et historique par exercice.
- **Volume & charge** : tonnage hebdo, courbe de progression par groupe musculaire.
- **Programmes / cycles** : périodisation, semaines de deload, séances planifiées.
- **Bibliothèque d'exercices enrichie** : notes de technique, variantes, photos.
- **Comparaison période** : volume / fréquence ce mois vs le précédent.
- **Récupération** : suivi sommeil / fatigue lié aux séances (lien Santé, Journal).

### 💰 Finances (enveloppes / patrimoine)
- **Projection de net worth** : courbe prévisionnelle selon l'épargne moyenne.
- **Objectifs d'épargne** : enveloppes-cibles avec barre de progression et date estimée
  (cf. `specs/objectifs_epargne.md`).
- **Multi-devises** : conversion et patrimoine consolidé.
- **Allocation / répartition** : camembert par type d'enveloppe, dérive vs cible.
- **Jalons & annotations** : marquer un événement sur la courbe (prime, achat).

### 📊 Budget (flux mensuels)
- **Transactions récurrentes** : abonnements et revenus auto-générés chaque mois.
- **Catégorisation auto** : règles (libellé → catégorie) pour classer les dépenses.
- **Vue cash-flow** : entrées vs sorties, taux d'épargne, report mois précédent.
- **Import relevé bancaire** : CSV/OFX avec rapprochement.
- **Alertes de dépassement** : seuil par catégorie atteint.
- **Pont vers Finances** : le surplus mensuel alimente une enveloppe d'épargne.

### 🎲 Paris sportifs (bankroll)
- **Suivi par discipline / type de pari** : ROI et winrate filtrés par sport, marché, book.
- **Closing Line Value (CLV)** : cote prise vs cote de clôture = qualité réelle des picks.
- **Gestion de mise** : suggestion de stake (Kelly, % fixe) selon la bankroll active.
- **Multi-bookmakers** : solde par book + alerte d'exposition.
- **Streak & drawdown** : plus longue série gagnante/perdante, drawdown max du capital.
- **Export fiscal / annuel** : récap des gains pour déclaration.

### 🍳 Alimentation (recettes)
- **Macros / nutrition** : kcal, protéines, glucides par portion (lien Santé / Training).
- **Scaling de portions** : recalcul auto des quantités.
- **Mode pas-à-pas enrichi** : minuteurs intégrés par étape (extension RealizationMode).
- **Favoris & historique** : « déjà cuisiné le… », fréquence, note personnelle.
- **Planificateur de repas** : calendrier hebdo glisser-déposer.
- **Photos de résultat** : galerie par recette.

### 🛒 Course (listes de courses)
- **Rangement par rayon** : tri automatique selon le rayon du référentiel.
- **Mode magasin** : vue dépouillée plein écran, coche au doigt, total estimé.
- **Prix & budget course** : prix moyen par article → estimation du panier (lien Budget).
- **Récurrence** : listes hebdomadaires régénérées depuis un modèle.
- **Suggestions** : articles fréquemment rachetés non présents dans la liste.

### 🛠️ Savoir-faire (procédés)
- **Mode pas-à-pas enrichi** : minuteurs par étape, validation au fil de l'eau.
- **Versions & itérations** : « v2 de la recette de lessive », historique des ajustements.
- **Composants → Course** : envoyer les composants manquants dans une liste de courses.
- **Tags & recherche** : filtrer par catégorie (entretien, cosmétique, cuisine…).
- **Coût de revient** : prix des composants → coût du procédé.

### ⚖️ Santé / Poids
- **Mensurations étendues** : tour de taille, masse grasse, plus de points de mesure.
- **Objectif avec date estimée** : projection sur la tendance lissée.
- **Pont Training / Alimentation** : croiser poids ↔ volume d'entraînement ↔ apports.
- **Rappel de pesée** : notification à heure fixe.

### 🗂️ Référentiel
- **Fusion de doublons** : détecter et fusionner deux articles équivalents.
- **Import / export** : sauvegarde et reprise du référentiel.
- **Usage croisé** : où un article est utilisé (recettes, listes) avant suppression.

### 🧭 Tableau de bord
- **Widgets configurables** : choisir et réordonner les blocs affichés.
- **Plage personnalisée** : au-delà de Aujourd'hui / Semaine (mois, 30 jours glissants).
- **Bloc finances/budget** : solde du mois, taux d'épargne en un coup d'œil.
- **Bloc humeur** : pastille du jour (lien Journal).

---

## Partie 2 — Idées de nouveaux modules

- **📓 Journal / Humeur** — déjà spécifié (`specs/module_journal.md`) : humeur du jour
  + mot libre, calendrier-couleur, corrélations transverses. **Candidat n°1.**
- **🎯 Objectifs (Goals)** : module transversal d'objectifs SMART agrégeant les données
  de tous les modules (poids, épargne, fréquence training…).
- **🗓️ Revues (Reviews)** : bilans hebdo/mensuels auto-générés depuis chaque module.
- **📚 Lecture / Apprentissage** : livres, cours, temps passé, progression.
- **🕐 Time tracking** : répartition du temps par activité/projet.
- **💳 Dettes & crédits** : prêts, échéanciers, intérêts (complément de Finances/Budget).
- **📦 Inventaire / Garde-manger** : stock alimentaire connecté à Course et Alimentation.
- **✈️ Voyages / Budget projet** : budget dédié à un projet ponctuel.
- **🔔 Centre de rappels** : échéances transverses (paiements, RDV, deadlines).
</content>
</invoke>
