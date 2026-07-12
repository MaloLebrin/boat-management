# Audit SEO — Pages marketing

_Date : 2026-07-12_

Périmètre : pages publiques `inertia/pages/marketing/**` (home, tarifs, about, contact,
guide, simulateur, privacy) et l'infrastructure SEO associée (shell SSR, sitemap,
robots, i18n). Le site est bilingue **en/fr**, rendu en **SSR** (Inertia
`ssr.enabled = true`), avec des routes localisées (`/en/...`, `/fr/...`).

## Résumé exécutif

La base SEO est globalement saine : un seul `<h1>` par page, hiérarchie de titres
`h1 → h2 → h3` sans saut, HTML sémantique (`header`, `nav`, `main`, `section`,
`article`, `footer`), `<Head>` par page, hreflang présent sur la majorité des pages,
`robots.txt` correct. L'audit a néanmoins relevé **8 défauts techniques** dont 2 de
sévérité haute. Les défauts #1 à #6 et #8 sont **corrigés dans cette PR** ; le #7 et
quelques compléments sont laissés en recommandations.

| #   | Sévérité   | Constat                                                                | Statut     |
| --- | ---------- | ---------------------------------------------------------------------- | ---------- |
| 1   | 🔴 Haute   | `<html>` sans attribut `lang` (site entier)                            | ✅ Corrigé |
| 2   | 🔴 Haute   | `sitemap.xml` limité à 5 URLs, sans hreflang                           | ✅ Corrigé |
| 3   | 🟠 Moyenne | `about` & `contact` sans canonical/hreflang                            | ✅ Corrigé |
| 4   | 🟠 Moyenne | JSON-LD `WebSite` de la home injecté côté client (absent du SSR)       | ✅ Corrigé |
| 5   | 🟠 Moyenne | Aucun `og:image` / `twitter:*` de fallback global                      | ✅ Corrigé |
| 6   | 🟡 Basse   | `<title>` placeholder « AdonisJS », marque incohérente, pas de favicon | ✅ Corrigé |
| 7   | 🟡 Basse   | canonical/hreflang en URLs relatives, pas d'`x-default` partout        | 🔶 Partiel |
| 8   | 🟡 Basse   | Liens footer Contact/About morts (`href="#"`)                          | ✅ Corrigé |

## Détail des constats

### 1. `<html>` sans attribut `lang` — 🔴 Haute

`resources/views/inertia_layout.edge` servait toutes les pages (en **et** fr) avec un
`<html>` sans `lang`. Pour un site bilingue, c'est le défaut le plus pénalisant :
Google ne sait pas dans quelle langue est la page, et l'accessibilité (lecteurs
d'écran) en souffre.

**Correction** : `<html lang="{{ page?.props?.locale ?? 'en' }}">`. La prop partagée
`locale` est déjà exposée en `inertia.always(...)`
(`app/middleware/inertia_middleware.ts:86`), donc disponible dans la vue racine Edge.

### 2. `sitemap.xml` incomplet — 🔴 Haute

Le générateur `start/routes/home.ts` ne listait que 5 URLs (`/en`, `/fr`, `/en/tarifs`,
`/fr/tarifs`, `/design-system`). Manquaient : guide, simulateur, about, contact et
privacy dans les deux locales — soit la majorité des pages indexables. Aucune
annotation hreflang non plus.

**Correction** : réécriture du générateur avec une structure `LOCALIZED_PAGES` (source
de vérité des slugs, alignée sur `start/routes/marketing.ts`) et `STANDALONE_PAGES`.
Chaque groupe localisé produit une `<url>` par locale, annotée avec
`<xhtml:link rel="alternate" hreflang="en|fr|x-default">`. Namespace `xmlns:xhtml`
ajouté.

### 3. `about` & `contact` sans canonical/hreflang — 🟠 Moyenne

Toutes les pages marketing exposaient canonical + hreflang **sauf** `about.vue` et
`contact.vue`, qui n'avaient que title + description + og.

**Correction** :

- `about.vue` : ajout de `canonical` (slug localisé `/en/about` ↔ `/fr/a-propos`) et des
  alternates hreflang `en` / `fr` / `x-default`, via le pattern `usePage<{locale}>()`
  déjà utilisé sur les autres pages.
- `contact.vue` : servie sur une URL unique `/contact` (non localisée) → canonical
  `/contact` seul, sans alternate hreflang (il n'existe pas de variante par langue).

### 4. JSON-LD `WebSite` injecté côté client — 🟠 Moyenne

`home.vue` construisait le schéma `WebSite` dans `onMounted` via
`document.createElement`. Résultat : le JSON-LD n'apparaissait **pas** dans le HTML
SSR que lisent les crawlers (seulement après hydratation).

**Correction** : suppression du bloc `onMounted/onUnmounted`, schéma désormais rendu
dans `<Head>` via le composant existant `~/components/json_ld` — même approche que le
`FAQPage` de `guide.vue`. Le JSON-LD est donc dans la réponse SSR.

### 5. Pas de fallback social global — 🟠 Moyenne

Seules `home` et `simulator_share` définissaient `og:image` et `twitter:card`. Toutes
les autres pages (pricing, about, contact, guide, simulator, privacy) généraient des
aperçus sociaux vides, faute de fallback dans le shell.

**Correction** : ajout dans `inertia_layout.edge` d'un `og:image` global
(`/og-image.png`, asset existant) et `twitter:card = summary_large_image`. Les pages
qui définissent leurs propres tags continuent de surcharger.

### 6. Nettoyage du shell SSR — 🟡 Basse

- `<title>` par défaut = `"AdonisJS"` → remplacé par `"Fleet AI"`.
- Incohérence de marque : JSON-LD `Organization` disait `"FleetAi"` alors que
  `og:site_name` / l'app name disent `"Fleet AI"` → harmonisé sur `"Fleet AI"`.
- Aucun `<link rel="icon">` (seulement `apple-touch-icon` + manifest) → ajout de
  `<link rel="icon" href="/favicon.svg">`.

### 7. URLs relatives pour canonical/hreflang — 🟡 Basse — 🔶 Partiel

Les canonical et hreflang des pages sont en chemins relatifs (`/en`, `/fr/tarifs`…).
Google **recommande des URLs absolues** pour les hreflang. Le sitemap (défaut #2) et les
og utilisent déjà des URLs absolues (`https://fleetai.app/...`), et l'`x-default` a été
ajouté sur home et about dans cette PR.

**Recommandation restante** : généraliser les URLs absolues et l'`x-default` sur
**toutes** les pages marketing (pricing, guide, simulator, privacy). Cela touche
plusieurs pages et gagnerait à passer par un composable SEO partagé (voir
« Recommandations »).

### 8. Liens footer morts — 🟡 Basse

Dans `inertia/layouts/public.vue`, les liens footer **Contact** et **About** étaient des
`<a href="#">` alors que les routes existent bel et bien.

**Correction** : remplacés par des `<Link>` localisés (Contact → `/contact`, About →
`/en/about` ↔ `/fr/a-propos`). Le lien **Terms** reste `href="#"` : aucune route CGU
n'existe (voir recommandations).

## Points positifs (aucune action)

- **Structure de titres** : exactement un `<h1>` par page, hiérarchie `h1 → h2 → h3`
  propre sur les 38 composants marketing, sans niveau sauté.
- **HTML sémantique** : landmarks `header` / `nav` / `main` / `section` / `article` /
  `footer` correctement utilisés ; `privacy.vue` enveloppe chaque clause légale dans un
  `<article>`.
- **SSR actif** : les meta par page sont rendues côté serveur, donc lisibles par les
  crawlers.
- **JSON-LD `FAQPage`** déjà SSR-friendly sur `guide.vue` via le composant `json_ld`.
- **i18n solide** : routes localisées avec slugs traduits (`/en/boat-maintenance-cost`
  ↔ `/fr/cout-entretien-bateau`), switch de langue, détection via URL → cookie →
  `Accept-Language`.
- **`robots.txt`** correct : autorise le public, bloque `/dashboard`, `/login`,
  `/signup`, référence le sitemap.
- **Images** : les visuels produit sont des mocks CSS/SVG (pas de raster), donc aucun
  souci d'`alt` / lazy-load manquants ; un seul `og-image.png` sert d'aperçu social.

## Corrections appliquées dans cette PR

- `resources/views/inertia_layout.edge` — `lang`, `<title>`, favicon, fallback
  `og:image`/`twitter`, marque JSON-LD (défauts #1, #5, #6).
- `start/routes/home.ts` — sitemap complet + hreflang + `x-default` (défaut #2).
- `inertia/pages/marketing/about.vue` — canonical + hreflang (défaut #3).
- `inertia/pages/marketing/contact.vue` — canonical (défaut #3).
- `inertia/pages/marketing/home.vue` — JSON-LD `WebSite` rendu en SSR (défaut #4) +
  `x-default`.
- `inertia/layouts/public.vue` — liens footer Contact/About (défaut #8).

## Recommandations restantes (hors périmètre de cette PR)

1. **URLs absolues + `x-default` généralisés** sur toutes les pages marketing
   (défaut #7). Idéalement extraire un composable/composant SEO partagé
   (`useSeoHead` / `<SeoHead>`) prenant `title`, `description`, `canonicalPath`,
   `alternates`, pour supprimer la duplication de balises `<Head>` entre pages et
   garantir la cohérence.
2. **`og:image` / `twitter` dédiés par page** (au-delà du fallback global) pour des
   aperçus sociaux différenciés (pricing, guide, about…).
3. **Page Terms / CGU** : le lien footer existe mais aucune route ne la sert. Créer la
   page ou retirer le lien.
4. **`Organization.sameAs`** : renseigner les profils sociaux réels (LinkedIn, X…) dans
   le JSON-LD du shell (actuellement `[]`).
5. **`lastmod` dans le sitemap** : ajouter une date de dernière modification par URL
   (contenu marketing majoritairement statique aujourd'hui, donc faible priorité).
6. **`og:locale` / `og:locale:alternate`** dans le shell ou par page pour signaler la
   langue des aperçus sociaux.
