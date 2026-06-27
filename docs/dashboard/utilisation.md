# Module Tableau de bord — Utilisation

> Le tableau de bord (route `/`) est le **hub transversal** : il n'a pas d'entité
> propre, il agrège quelques modules suivis. Pour le fonctionnement côté code,
> voir [`technique.md`](./technique.md).

---

## À quoi ça sert

Une vue de **suivi quotidien / hebdomadaire**, centrée sur trois choses. Un
sélecteur **Aujourd'hui / Semaine** en haut à droite change la portée des deux
premiers blocs.

1. **Habitudes** — sont-elles renseignées ?
   - *Aujourd'hui* : la liste des habitudes du jour, chacune cochée (✓) ou non.
   - *Semaine* : une grille jour par jour (L → D) par habitude, le compteur
     `fait / objectif` de la semaine, et un anneau de complétion globale.
     Les jours futurs ou antérieurs à la création de l'habitude sont grisés ;
     un jour passé non coché apparaît en pointillé.

2. **Séance** — entraînement ou repos ?
   - *Aujourd'hui* : la ou les séances du jour (titre, durée), ou **« Jour de
     repos »** s'il n'y en a pas.
   - *Semaine* : la liste des séances de la semaine, avec le jour et la durée.

3. **Patrimoine** — global et par enveloppe (toujours affiché, quel que soit le
   filtre).
   - *Patrimoine global* : le patrimoine net, sa variation du mois et sur 1 an,
     la progression vers l'objectif s'il est défini, et la **courbe d'évolution
     sur 12 mois**.
   - *Mes enveloppes* : chaque enveloppe avec son solde et sa **tendance sur
     30 jours** — flèche ↑ (haussière) / ↓ (baissière) et la variation en € (et %).
     La couleur indique si l'évolution est *favorable* selon la nature de
     l'enveloppe (pour un passif, une hausse est défavorable).

Chaque bloc est cliquable et renvoie vers le module concerné. Les autres modules
(poids/santé, paris, catalogues…) ne figurent pas ici.
