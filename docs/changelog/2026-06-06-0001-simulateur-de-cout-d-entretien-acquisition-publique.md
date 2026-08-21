# 2026-06-06 — Simulateur de coût d'entretien (acquisition publique)

**Nouvelle fonctionnalité — outil public / stratégie d'acquisition**

## Simulateur de coût annuel d'entretien

Page publique (sans authentification) permettant à tout propriétaire de bateau d'estimer son budget annuel d'entretien en 2 minutes. Basé sur la réglementation Division 240 – Annexe 240-A.2.

**Tunnel de conversion :**

1. L'utilisateur remplit les données de son bateau (type, longueur, âge, catégorie CE) et l'état de ses équipements (coque, moteur, sécurité, gréement)
2. Un coût estimé par catégorie (fourchette min/max) est calculé côté frontend sans appel serveur
3. Un CTA incite l'utilisateur à créer un compte — les données du bateau sont stockées en session
4. Après inscription, le bateau est automatiquement créé et l'utilisateur est redirigé vers la fiche de son bateau

**Routes :**

- `GET /fr/simulateur-cout-entretien` → `marketing.fr.simulator`
- `GET /en/maintenance-cost-simulator` → `marketing.en.simulator`
- `POST /simulator/session` → stockage en session + redirect signup

**Fichiers créés :**

- `shared/types/simulator.ts` — types `SimulatorBoatInput`, `SimulatorCostBreakdown`
- `app/validators/simulator.ts` — validation VineJS des données du simulateur
- `app/controllers/simulator_controller.ts` — `saveSession()`
- `inertia/composables/use_simulator_costs.ts` — calcul des coûts par catégorie
- `inertia/components/marketing/simulator/` — 7 composants (étapes + résultat + CTA)
- `inertia/pages/marketing/simulator.vue` — page multi-étapes

**Fichiers modifiés :**

- `app/controllers/marketing_controller.ts` — méthode `simulator()`
- `app/services/boat_hull_service.ts` — méthode `createFromSimulator(orgId, data)`
- `app/controllers/new_account_controller.ts` — auto-création du bateau depuis la session post-inscription
- `start/routes/marketing.ts` — routes simulateur
- `resources/lang/{fr,en}/marketing.json` — clés `marketing.simulator.*`
- `resources/lang/{fr,en}/public.json` — lien footer "Simulateur de coût"
- `inertia/layouts/public.vue` — lien footer ajouté

---
