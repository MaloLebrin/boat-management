# 2026-07-12 — Marketing : audit SEO et correctifs techniques

Audit SEO des pages marketing (rapport : `docs/seo-audit-marketing.md`) et correction des défauts à fort impact / faible risque.

- **`<html lang>`** : le shell SSR `resources/views/inertia_layout.edge` servait toutes les pages (en/fr) sans attribut `lang`. Ajout de `lang="{{ page?.props?.locale ?? 'en' }}"` (la prop `locale` est déjà `inertia.always`). Défaut le plus pénalisant pour un site bilingue.
- **`sitemap.xml`** (`start/routes/home.ts`) : passait de 5 URLs hardcodées à l'ensemble des pages marketing dans les deux locales (home, tarifs, simulateur, guide, about, privacy, contact, design-system), avec annotations `<xhtml:link rel="alternate" hreflang="en|fr|x-default">` par groupe localisé.
- **canonical / hreflang** : ajout sur `about.vue` (canonical localisé `/en/about` ↔ `/fr/a-propos` + alternates) et `contact.vue` (canonical `/contact`), seules pages marketing qui n'en avaient pas.
- **JSON-LD `WebSite`** : sur `home.vue`, déplacé d'une injection client-side (`onMounted`) vers `<Head>` via le composant `~/components/json_ld`, pour qu'il soit présent dans le HTML SSR lu par les crawlers.
- **Aperçus sociaux** : ajout d'un fallback global `og:image` (`/og-image.png`) + `twitter:card` dans le shell, pour les pages sans tags dédiés (pricing, about, contact, guide, simulator, privacy).
- **Nettoyage shell** : `<title>` par défaut `AdonisJS` → `Fleet AI`, marque JSON-LD `Organization` harmonisée `FleetAi` → `Fleet AI`, ajout de `<link rel="icon" href="/favicon.svg">`.
- **Footer** : liens Contact/About (`inertia/layouts/public.vue`), auparavant `<a href="#">` morts, désormais des `<Link>` localisés vers les routes existantes.
