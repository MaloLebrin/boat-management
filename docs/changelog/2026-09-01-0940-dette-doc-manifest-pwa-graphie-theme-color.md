# Dette doc/manifest PWA — graphie FleetAi, theme_color, ui-map.md, README (#623)

**Date** : 2026-09-01

Résorption de la dette relevée au §5 de l'analyse mobile de l'épic PWA terrain (#481).

## Modifications

### Graphie de la marque (`FleetAi`, jamais `FleetAI` ni `Fleetide`)

- `public/site.webmanifest` : `name` et `short_name` passent de `FleetAI` à `FleetAi` — c'est le
  nom affiché sous l'icône installée sur l'écran d'accueil ;
- `public/offline.html` : `<title>Offline — FleetAi</title>` ;
- `docs/frontend/pwa.md` : la prose disait encore « Fleetide » (ancienne marque) et le snippet du
  manifest citait `Fleetide` / `#0066cc` — aligné sur le contenu réel. L'identifiant technique
  `fleetide-offline-queue` (nom de la base IndexedDB) n'est pas renommé.

### `theme_color` aligné sur la palette

- `public/site.webmanifest` : `theme_color` passe de `#0066cc` (absent des tokens de
  `inertia/css/app.css`) à `#0b1d2e` (`--color-navy-900`, couleur des surfaces permanentes —
  sidebar). À l'exécution, les balises `<meta name="theme-color">` de
  `resources/views/inertia_layout.edge` (clair `#faf6ee` / sombre `#0f1a23`) prennent le relais ;
  le `theme_color` du manifest sert au chrome de la PWA installée (splash, barre de titre) ;
- `public/offline.html` : le bouton « Réessayer » utilisait le même `#0066cc` hors palette
  (hover `#0052a3`) — remplacé par `#0b1d2e` (hover `#102a40`, `--color-navy-800`). La page reste
  autonome (hex bruts assumés, pas de tokens CSS disponibles hors bundle).

### `docs/frontend/ui-map.md`

- La ligne « SSR désactivé (voir `config/inertia.ts`) » était obsolète : `config/inertia.ts` a
  `ssr.enabled: true` depuis le passage en SSR. Corrigée en « SSR activé » avec l'entrypoint
  `inertia/ssr.ts`. Le passage sur l'onglet initial de `boats/show` (« lien profond rendu en
  SSR ») supposait déjà le SSR actif — cohérent, inchangé.

### README

- Nouvelle section « PWA terrain (hors-ligne) » dans les fonctionnalités : installation,
  service worker/precache (`inertia/sw.ts`, Workbox `injectManifest`), file hors-ligne IndexedDB,
  Web Push — avec liens vers `docs/architecture/pwa-terrain-epic-481.md` et
  `docs/frontend/pwa.md`.

## Références

- Issue #623, épic #481 (section « Hors périmètre, assumé »)
- Convention de graphie : `CLAUDE.md` § Branding,
  changelog `2026-07-22-0004-graphie-canonique-de-la-marque-et-du-plan-entreprise.md`
