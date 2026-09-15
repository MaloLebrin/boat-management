# Menu latéral : une seule entrée active à la fois

**Date** : 2026-09-15

Sur une fiche moteur ou équipement (`/boats/:boatId/engines/:engineId`), la sidebar desktop allumait « Bateaux » **et** « Moteurs » : l'état actif était calculé par sous-chaîne (`url.includes(path)`), donc `/engines` matchait n'importe où dans l'URL.

- Nouveau helper `inertia/utils/nav_active.ts` (`isNavPathActive`) : correspondance par segment (chemin exact, ou suivi de `/`, `?` ou `#`).
- Utilisé par `AsideMenu.vue` et `MobileBottomNav.vue` (qui dupliquait déjà cette logique).
- Le cas spécial `/en/dashboard` / `/fr/dashboard` est supprimé : les routes de l'app ne sont pas préfixées par la locale.
- Aucun changement de route ni de backend.
