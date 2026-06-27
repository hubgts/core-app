# Spec — Objectifs d'épargne (enveloppes-cibles)

Donner à une enveloppe d'épargne une **cible** (montant + échéance optionnelle), avec **barre de progression** et **date d'atteinte estimée** calculée depuis l'historique réel des snapshots.

## Périmètre

- Concerne uniquement les types **`epargne`** et **`investissement`** (actifs où l'on accumule vers un but).
- Exclus : `compte_courant`, `especes` (flux courant, pas une cible) et `dette` (un objectif de dette serait un module à part : « rembourser X pour le… »).
- Une enveloppe sans cible fonctionne comme aujourd'hui — la cible est **optionnelle**.

## Modèle de données

Trois colonnes nullables sur `EnvelopeEntity` (rétro-compatibles, aucune migration destructive) :

```ts
@Column({ type: 'numeric', nullable: true })
targetAmount: number | null;        // montant visé, ex. 10000

@Column({ name: 'target_date', type: 'date', nullable: true })
targetDate: string | null;          // échéance souhaitée (optionnelle)

@Column({ name: 'target_started_at', type: 'date', nullable: true })
targetStartedAt: string | null;     // ancrage du calcul de progression
```

`EnvelopeInput` reçoit `targetAmount?`, `targetDate?`, `targetStartedAt?`.
Garde-fous service : `targetAmount > 0`, ignorée si le type n'est pas éligible (cohérent avec `natureOf`).

## Calculs (côté service, à partir des snapshots existants)

L'historique `snapshots` est déjà une série `{date, amount}` triée — on s'en sert directement.

- **Solde de départ** = snapshot à `targetStartedAt` (ou le 1er snapshot si absent).
- **progress** = `(current − start) / (targetAmount − start)`, borné `[0, 1]`.
- **Rythme mensuel** = pente de l'épargne sur les snapshots depuis `targetStartedAt`
  (régression linéaire simple, ou `(current − start) / mois écoulés` en fallback < 3 points).
- **ETA** = `current + rythme × n = targetAmount` → date estimée.
  - rythme ≤ 0 → `eta = null` (« au rythme actuel, jamais »).
- **Statut vs échéance** (si `targetDate`) :
  - `on_track` : ETA ≤ targetDate
  - `behind` : ETA > targetDate → afficher l'**effort requis** = `(targetAmount − current) / mois restants` €/mois.

Payload renvoyé par enveloppe :

```ts
target: {
  amount, date, progress,           // 0..1
  monthlyRate, eta,                 // eta: string | null
  status: 'on_track' | 'behind' | 'reached' | 'no_pace',
  requiredMonthly: number | null,
}
```

## UI

**EnvelopeFormModal** — section « Objectif » affichée seulement pour `epargne`/`investissement` :
- champ Montant cible (€), champ Date cible (optionnel), réutilise `parseAmount` + `ffield`.

**Carte d'enveloppe** :
- barre de progression `--c` (couleur de l'enveloppe), ex. `7 200 € / 10 000 € · 72 %`.
- ligne d'estimation : `🎯 Atteint vers nov. 2026` ou `⚠️ En retard · +180 €/mois pour tenir avril 2026`.
- état atteint : ✅ + barre pleine.

**EnvelopeDrawer** : projection visuelle sur le `NetWorthChart`/courbe — ligne pointillée objectif + point ETA (couleur hex, pas `var()`).

## Règles / cas limites

- Pas de snapshot après `targetStartedAt` → progress = 0, eta = null, message « ajoutez un relevé pour estimer ».
- `current ≥ targetAmount` → `status = 'reached'`, eta = date du snapshot franchissant la cible.
- Cible modifiable à tout moment ; baisser la cible peut faire passer en `reached`.

## Découpage

1. **Backend** : colonnes + DTO + calcul `target` dans le décor d'enveloppe (réutilise `snapshotsByEnvelope`).
2. **Form** : champs cible conditionnels au type.
3. **Carte** : barre + ligne ETA.
4. **Drawer** : ligne objectif sur le graphe.

Étapes 1–3 livrables seules (MVP) ; l'étape 4 est un bonus visuel.
