# 2026-05-23 — Enforcement quotas : retour utilisateur anticipé (bateaux)

Amélioration UX : le blocage quota sur l'ajout de bateau remonte désormais au plus tôt, avant toute navigation.

**4 niveaux de guards pour l'ajout de bateau (defense in depth) :**

1. **Icône cadenas dans le bouton** (`inertia/pages/boats/index.vue`) — signal visuel avant tout clic ; `canAddBoat: false` → `LockClosedIcon` affiché dans le bouton "Nouveau bateau"
2. **Toast au clic** — `handleNewBoat()` intercepte le clic et affiche `toast.error(t('boats.index.quotaReached'))` au lieu de naviguer
3. **Redirect dans `GET /boats/new`** (`BoatsController.create`) — si accès direct par URL, redirige vers `/boats` + flash error
4. **Assert dans `POST /boats`** (`BoatsController.store`) — `quotaService.assertCanAddBoat()` avant toute création en base

**Changements :**

- `BoatsController.index` : charge l'org et passe `canAddBoat` (boolean) en prop Inertia via `quotaService.canAddBoat()`
- `BoatsController.create` : vérifie `canAddBoat` avant de rendre le formulaire
- `inertia/pages/boats/index.vue` : `handleNewBoat()` remplace le lien direct ; bouton avec `LockClosedIcon` conditionnel
- i18n : `boats.index.quotaReached` ajouté en EN et FR

**Correctif** : import ESM dans `app/services/boat_hull_service.ts` — import relatif `../utils/boat_utils` (sans `.js`) remplacé par l'alias `#utils/boat_utils` (résolution correcte en ESM Node 20)

---
