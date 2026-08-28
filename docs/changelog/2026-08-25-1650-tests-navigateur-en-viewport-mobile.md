# 2026-08-25 — Tests navigateur en viewport mobile (#500)

Aucune des 8 specs de `tests/browser/` ne fixait de viewport : tout était validé en desktop, et rien ne protégeait le travail mobile des lots 2 et 4 de l'épic #481 — un débordement horizontal réintroduit serait passé inaperçu, comme le service worker cassé de #482.

- **`tests/browser/mobile_field.spec.ts`** (4 cas, 390×844 via `page.setViewportSize()`) :
  - **absence de débordement horizontal** (`scrollWidth <= innerWidth`) sur les 6 écrans terrain — `/planning`, `/maintenance/history`, `/navigation/{logbook,fuel,incidents}`, `/boats/:id` — avec données seedées (sortie, avitaillement, incident, événement de maintenance) ;
  - **bottom nav** (#492) : visible et ≥ 56 px en mobile, absente en desktop ;
  - **replis carte** (#493) : sur les 3 écrans navigation, cartes visibles et table masquée en mobile, l'inverse en desktop (via `getComputedStyle`) ;
  - **drawer** : atteignable au hamburger et pleine hauteur du viewport (h-dvh, #484).
- **Limite documentée plutôt que masquée** (`docs/dev/testing.md`) : le `browserContext` de `@japa/browser-client` est créé sans options — `isMobile`/`hasTouch` ne sont pas émulés. Suffisant pour les breakpoints CSS, insuffisant pour le tactile : les variantes `pointer-coarse:` de #494 ne s'activent pas dans ce contexte (pointeur `fine`), la mesure `boundingBox` des cibles n'aurait pas de valeur ici.
- **Validation de la spec elle-même** (exigée par l'issue) : repli carte du logbook et breakpoint `lg:hidden` de la bottom nav cassés volontairement → la spec échoue avec des messages exploitables (« /navigation/logbook : les cartes mobiles ne rendent pas », « la bottom nav doit disparaître au-dessus du breakpoint lg »), puis restaurés → 4/4 verts.
- Seed : pas de factory incident — création directe via le modèle `BoatIncident` (notée en commentaire).
