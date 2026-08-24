# 2026-07-17 — Unification du lexique produit : port, sortie, événement (#368)

Un même concept portait plusieurs noms selon l'écran : « Marinas » (widget dashboard) vs « Ports » (menu, page) ; « trip »/« passage » vs « sortie » selon l'écran de navigation ; « entry » vs « event » pour un élément d'historique de maintenance. Le breadcrumb de la fiche bateau affichait aussi « Fleet > Boats > {nom} » avec deux libellés consécutifs pour la même destination (`/boats`).

- **Lexique retenu** (documenté dans `docs/frontend/i18n.md`) : _port_ (pas _marina_), _trip_/_sortie_ (pas _passage_/_trajet_), _event_/_événement_ (pas _entry_/_entrée_).
- Widget dashboard `MarinaDashboardCard.vue` renommé `PortDashboardCard.vue` ; namespace i18n `dashboard.marina.*` renommé `dashboard.port.*`.
- `ports.json` (EN) : « Marina plan » → « Port plan », « How to use the marina plan » → « How to use the port plan ».
- `navigation.json` (EN, onglet Logbook) : « passages » → « trips » pour s'aligner sur `navigation_logs.json` et le FR (« sorties »).
- `boats.json` : menu rapide « A history entry »/« Une entrée d'historique » → « A maintenance event »/« Un événement de maintenance » ; « Un trajet » (FR) → « Une sortie » ; panel historique de maintenance (`addEntry`/`createEntry`) renommé `addEvent`/`createEvent` (EN+FR), ainsi que l'event Vue `addEntry` → `addEvent` (`BoatShowHeaderActions.vue`).
- Breadcrumb de `boats/show.vue` : suppression du libellé « Boats » redondant avec « Fleet » (tous deux pointaient vers `/boats`).
- **Tests** : `tests/inertia/boat_show_header_actions.spec.ts` mis à jour pour les clés/events renommés.
