# 2026-09-16 — Garde du thème sombre : scan exhaustif d'`inertia/` (refactorisation, vague 0.3)

Le garde-fou du thème sombre (`tests/inertia/theme_safe_components.spec.ts`,
#416) était une liste d'opt-in de 94 composants `.vue` : une couleur figée posée
dans un composable `.ts` ou dans un composant jamais listé passait sans bruit.
C'est ainsi que les pastilles de notification (`bg-blue-100`…) restaient
bleu/vert/orange/rouge Tailwind en thème sombre.

- **Scan.** Le test relit désormais **tous** les `.vue` et `.ts` d'`inertia/` (plus de 500 fichiers, un test par fichier) ; seules les **exceptions** restent déclarées, avec leur raison et leur budget exact d'occurrences. Un méta-test vérifie que le scan voit bien toute la base.
- **Corrections.** `use_notification_helpers.getSeverityClasses()` passe aux palettes de marque alignées sur `BaseBadge` (sky / mint / peach / coral / lilac) ; `PasswordStrength` colore ses segments avec `--color-bone` / `--color-danger` / `--color-warning` / `--color-success` ; le mot-marque du pied de page public et du panneau d'authentification utilise `text-coral-500` ; l'avatar du témoignage passe en `bg-navy-600` ; `HomeBrowserFrame` utilise `border-bone`.
- **Cartes Leaflet.** Nouveau `inertia/utils/map_markers.ts` (`trackDotHtml()`, `BOAT_MARKER_HTML`) partagé par la position du bateau et le tracé d'une sortie : plus d'hex de secours (`#2563eb`) ni d'anneau blanc figé (`#fff`) — le point suit `--color-brand` et `--color-surface-elevated`.
- **Exceptions assumées** (21 fichiers ajoutés à la table) : boutons blancs et bordures navy des panneaux Assistant IA, diagnostic et pièces, sidebar, boussole décorative du panneau d'authentification, illustrations autonomes (sections À propos, CTA final, carte marina : eau et pontons).
- **Tests.** `theme_safe_components.spec.ts` (558 tests), `map_markers.spec.ts` (3 tests), `use_notification_helpers.spec.ts` mis à jour (palettes de marque). Suite Vitest complète verte (2 299 tests).
