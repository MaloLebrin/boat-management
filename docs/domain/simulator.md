# Domaine — Simulateur de coût d'entretien

## Objectif fonctionnel

Page publique (sans authentification) qui estime le coût annuel d'entretien d'un bateau selon ses caractéristiques et l'état de ses équipements. Basée sur la réglementation française **Division 240 – Annexe 240-A.2** (Registre de Vérification Spéciale).

**Stratégie d'acquisition** : après avoir vu son estimation, l'utilisateur est invité à créer un compte. À l'inscription, son bateau est **automatiquement créé** dans son organisation — il arrive directement sur la fiche de son bateau, sans friction.

---

## Tunnel de conversion

```
GET /fr/simulateur-cout-entretien  (public, pas d'auth)
  → Questionnaire multi-étapes (4–5 étapes selon type de bateau)
  → Résultat : fourchette de coûts par catégorie
  → CTA "Créer mon compte et enregistrer mon bateau"
    → POST /simulator/session  (sauvegarde en session AdonisJS)
    → Redirect /signup
      → Inscription NewAccountController#store
        → Lit session 'simulatorBoat'
        → Boat auto-créé via BoatHullService#createFromSimulator
        → session.forget('simulatorBoat')
        → Redirect /boats/:id  (fiche du bateau créé)

Fallback (accès direct /signup sans simulateur) :
  → Inscription normale → Redirect /dashboard
```

---

## Routes

Référence : `start/routes/marketing.ts`

| Méthode | URL | Nom | Controller |
|---|---|---|---|
| GET | `/fr/simulateur-cout-entretien` | `marketing.fr.simulator` | `MarketingController#simulator` |
| GET | `/en/maintenance-cost-simulator` | `marketing.en.simulator` | `MarketingController#simulator` |
| POST | `/simulator/session` | `simulator.session` | `SimulatorController#saveSession` |

La route POST `/simulator/session` est publique (pas de middleware auth). Elle stocke les données en session et redirige vers `/signup`.

---

## Types partagés

Référence : `shared/types/simulator.ts`

```typescript
// Types de bateau
type SimulatorBoatType = 'motorboat' | 'sailboat' | 'catamaran' | 'rib'

// États d'usure
type SimulatorWearLevel = 'new' | 'good' | 'worn' | 'to_replace'

// Données collectées dans le simulateur
interface SimulatorBoatInput {
  boatType: SimulatorBoatType
  lengthM: number           // 2–30 m
  yearBuilt: number         // 1950–année courante
  navigationCategory: 'A' | 'B' | 'C' | 'D'
  hasDedicatedEngine: boolean
  hullWear: SimulatorWearLevel
  engineWear: SimulatorWearLevel | null   // null si pas de moteur
  safetyWear: SimulatorWearLevel
  riggingWear: SimulatorWearLevel | null  // null si motorboat/rib
}

// Résultat du calcul
interface SimulatorCostBreakdown {
  categories: SimulatorCostCategory[]   // { key, minCost, maxCost }
  totalMin: number
  totalMax: number
}
```

---

## Validation backend

Référence : `app/validators/simulator.ts`

Validator VineJS `simulatorValidator` — valide `SimulatorBoatInput` :
- `boatType` : `vine.enum(SIMULATOR_BOAT_TYPES)`
- `lengthM` : `vine.number().range([2, 30])`
- `yearBuilt` : `vine.number().range([1950, currentYear])`
- `navigationCategory` : `vine.enum(['A', 'B', 'C', 'D'])`
- `engineWear` / `riggingWear` : `.nullable()` (champs optionnels selon le type)

---

## Calcul des coûts

Référence : `inertia/composables/use_simulator_costs.ts`

Calcul **purement côté frontend** (pas d'appel serveur). Fonction exportée : `computeSimulatorCosts(input: SimulatorBoatInput): SimulatorCostBreakdown`

### Coûts de base annuels par tranche de longueur (€)

| Longueur | Coque | Moteur | Sécurité | Électricité | Mouillage |
|---|---|---|---|---|---|
| < 6 m | 250–350 | 300–400 | 120–180 | 100–150 | 60–100 |
| 6–9 m | 500–700 | 450–650 | 180–250 | 150–220 | 100–150 |
| 9–12 m | 900–1 300 | 700–900 | 250–350 | 200–300 | 150–220 |
| 12–15 m | 1 500–2 100 | 1 000–1 400 | 350–500 | 300–400 | 200–280 |
| > 15 m | 2 500–3 500 | 1 600–2 000 | 450–600 | 450–550 | 250–350 |

### Gréement (voiliers/catamarans uniquement, €)

| Longueur | Base |
|---|---|
| < 6 m | 300–500 |
| 6–9 m | 500–900 |
| 9–12 m | 800–1 400 |
| 12–15 m | 1 200–1 800 |
| > 15 m | 1 800–2 500 |

### Multiplicateurs par état d'usure

| État | Multiplicateur |
|---|---|
| `new` | × 0.5 |
| `good` | × 1.0 |
| `worn` | × 1.5 |
| `to_replace` | × 2.5 |

### Logique conditionnelle

- **Moteur** : inclus si `boatType === 'motorboat' | 'rib'` OU si `hasDedicatedEngine === true`
- **Gréement** : inclus si `boatType === 'sailboat' | 'catamaran'`
- **Électricité** : toujours inclus, état d'usure calqué sur `hullWear`
- **Mouillage** : toujours inclus, état d'usure calqué sur `hullWear`

---

## Étapes du questionnaire

La liste des étapes est **calculée dynamiquement** côté frontend selon le type de bateau.

| Ordre | Clé | Composant | Condition |
|---|---|---|---|
| 1 | `boat` | `SimulatorStepBoat.vue` | Toujours |
| 2 | `hull` | `SimulatorStepHull.vue` | Toujours |
| 3 | `engine` | `SimulatorStepEngine.vue` | `motorboat`/`rib` ou `hasDedicatedEngine` |
| 4 | `safety` | `SimulatorStepSafety.vue` | Toujours |
| 5 | `rigging` | `SimulatorStepRigging.vue` | `sailboat`/`catamaran` uniquement |

---

## Fichiers

### Backend

| Fichier | Rôle |
|---|---|
| `shared/types/simulator.ts` | Types partagés backend ↔ frontend |
| `app/validators/simulator.ts` | Validation VineJS |
| `app/controllers/simulator_controller.ts` | `saveSession()` — stocke en session + redirect /signup |
| `app/controllers/marketing_controller.ts` | Méthode `simulator()` — rendu Inertia |
| `app/services/boat_hull_service.ts` | `createFromSimulator()` — création bateau post-signup |
| `app/controllers/new_account_controller.ts` | Détecte session `simulatorBoat` après inscription |
| `start/routes/marketing.ts` | Routes GET (FR/EN) + POST /simulator/session |

### Frontend

| Fichier | Rôle |
|---|---|
| `inertia/pages/marketing/simulator.vue` | Page principale, gestion des étapes |
| `inertia/composables/use_simulator_costs.ts` | Calcul des coûts (pure function) |
| `inertia/components/marketing/simulator/SimulatorStepBoat.vue` | Étape 1 : type, longueur, année, catégorie, moteur |
| `inertia/components/marketing/simulator/SimulatorStepHull.vue` | Étape 2 : état de la coque |
| `inertia/components/marketing/simulator/SimulatorStepEngine.vue` | Étape 3 : état du moteur |
| `inertia/components/marketing/simulator/SimulatorStepSafety.vue` | Étape 4 : état du matériel de sécurité |
| `inertia/components/marketing/simulator/SimulatorStepRigging.vue` | Étape 5 : état du gréement (voiliers/cata) |
| `inertia/components/marketing/simulator/SimulatorResultCard.vue` | Tableau coûts par catégorie + total |
| `inertia/components/marketing/simulator/SimulatorCtaCard.vue` | CTA → `router.post('/simulator/session', input)` |

### i18n

Clés dans `resources/lang/{fr,en}/marketing.json`, namespace `marketing.simulator.*`.  
Lien footer dans `resources/lang/{fr,en}/public.json` → `public.footer.simulator`.

---

## Création automatique du bateau

Référence : `app/services/boat_hull_service.ts#createFromSimulator`

```typescript
async createFromSimulator(organizationId: number, data: SimulatorBoatInput): Promise<Boat>
```

Mappe `SimulatorBoatInput` → modèle `Boat` :
- `name` : `"Mon bateau {boatType} {lengthM}m"` (nom par défaut modifiable ensuite)
- `propulsionType` : `'motorboat'` si `motorboat`/`rib`, sinon `data.boatType`
- `type`, `lengthM`, `yearBuilt`, `navigationCategory` : copiés directement

La session `simulatorBoat` est **supprimée après usage** (`session.forget('simulatorBoat')`).

---

## Référence réglementaire

Le barème de coûts est inspiré de la **Division 240 – Annexe 240-A.2** (Registre de Vérification Spéciale) qui définit les catégories de vérification :
- Équipements de sécurité (gilets, extincteurs, signaux, VHF, EPIRB)
- Coque / construction
- Propulsion
- Mouillage
- Feux de signalisation
- Assèchement
- Gréement dormant
- Gaz / électricité
