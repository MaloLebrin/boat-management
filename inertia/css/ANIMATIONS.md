# Système d'animations — FleetAi

Toutes les animations reposent sur les variables CSS définies dans `app.css` :

- `--motion-fast` : 150ms
- `--motion-normal` : 220ms
- `--motion-slow` : 320ms
- `--ease-premium` : `cubic-bezier(0.2, 0.8, 0.2, 1)`

`prefers-reduced-motion` est géré globalement : toutes les durées tombent à 1ms.

---

## Keyframes

| Nom             | Effet                                             | Utilisé par                                                           |
| --------------- | ------------------------------------------------- | --------------------------------------------------------------------- |
| `fadeUp`        | Opacity 0→1 + translateY 24px→0                   | Page transition entrée, stat cards dashboard, scroll-reveal marketing |
| `fadeIn`        | Opacity 0→1                                       | Tab transition, page transition sortie                                |
| `scaleIn`       | Scale 0.95→1 + opacity                            | (disponible, non utilisé en app)                                      |
| `shimmer`       | Défilement horizontal                             | `BaseSkeleton`                                                        |
| `marquee`       | Défilement infini horizontal                      | Marketing — logos partenaires                                         |
| `slideDown`     | Opacity + translateY(-8px) + scale(0.97) → normal | `BaseDropdown` à l'ouverture                                          |
| `modalIn`       | Scale(0.94) + translateY(12px) + opacity → normal | `BaseModal` — panneau                                                 |
| `overlayIn`     | Opacity 0→1                                       | `BaseModal` overlay, drawer mobile overlay                            |
| `fadeUpList`    | Opacity + translateY(10px) → normal               | `TransitionGroup` listes (cartes bateaux)                             |
| `slideFromLeft` | TranslateX(-100%) + opacity → normal              | Drawer mobile sidebar                                                 |

---

## Transitions Vue (`<Transition>` / `<TransitionGroup>`)

### Page — `name="page"` `mode="out-in"`

- **Fichier** : `inertia/layouts/default.vue`
- **Déclencheur** : changement de `page.url` (navigation Inertia)
- **Entrée** : `fadeUp` 220ms — la nouvelle page monte depuis le bas avec fade
- **Sortie** : `fadeIn` reverse 150ms — l'ancienne page disparaît en fondu

### Modal overlay — `name="modal-overlay"`

- **Fichier** : `inertia/components/base/BaseModal.vue`
- **Déclencheur** : prop `open` true/false
- **Entrée/Sortie** : `overlayIn` 150ms — fond semi-transparent fade in/out

### Modal panneau — `name="modal-panel"`

- **Fichier** : `inertia/components/base/BaseModal.vue`
- **Déclencheur** : prop `open` true/false
- **Entrée** : `modalIn` 220ms — panneau scale + translateY + fade
- **Sortie** : `modalIn` reverse 150ms

### Dropdown — `name="dropdown"`

- **Fichier** : `inertia/components/base/BaseDropdown.vue`
- **Déclencheur** : `open` ref (clic sur le trigger)
- **Entrée** : `slideDown` 150ms — menu glisse vers le bas depuis le haut
- **Sortie** : `slideDown` reverse 150ms

### Onglets bateau — `name="tab"` `mode="out-in"` `:key="tab"`

- **Fichier** : `inertia/pages/boats/show.vue`
- **Déclencheur** : changement de `tab` ref
- **Entrée** : `fadeIn` 150ms
- **Sortie** : `fadeIn` reverse 150ms

### Onglets moteur — `name="tab"` `mode="out-in"` `:key="tab"`

- **Fichier** : `inertia/pages/boats/engine_show.vue`
- **Déclencheur** : changement de `tab` ref
- **Entrée/Sortie** : identique aux onglets bateau

### Drawer mobile overlay — `name="drawer-overlay"`

- **Fichier** : `inertia/layouts/default.vue`
- **Déclencheur** : `isSidebarOpen` ref
- **Entrée** : `overlayIn` 220ms
- **Sortie** : `overlayIn` reverse 150ms

### Drawer mobile panneau — `name="drawer-panel"`

- **Fichier** : `inertia/layouts/default.vue`
- **Déclencheur** : `isSidebarOpen` ref
- **Entrée** : `slideFromLeft` 220ms — panneau glisse depuis la gauche
- **Sortie** : `slideFromLeft` reverse 150ms

### Liste de bateaux — `name="list"` (`TransitionGroup`)

- **Fichier** : `inertia/components/boats/list/BoatCards.vue`
- **Déclencheur** : changement de la liste `boats` (filtres, pagination)
- **Entrée** : `fadeUpList` 220ms, avec stagger `calc(var(--i) * 40ms)` — les cartes montent en cascade
- **Sortie** : `fadeUpList` reverse 150ms
- **Réorganisation** : `list-move` — `transform` 220ms (smooth reorder)

---

## Micro-animations CSS (Tailwind, sur les composants base)

| Composant                               | Effet                                                                                                                      |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `BaseButton`                            | `transition-colors` au hover                                                                                               |
| `BaseCard` (isAnimated)                 | Perspective 3D + scale au hover                                                                                            |
| `BaseStatCard`                          | `scale(1.01)` au hover + shadow                                                                                            |
| `BaseInput / BaseTextarea`              | Box-shadow focus ring animé                                                                                                |
| `BaseCheckbox / BaseRadio / BaseToggle` | Transform + box-shadow                                                                                                     |
| `BaseTabs`                              | Pill indicator absolue qui glisse (`left`+`width`) entre les onglets — `transition-[left,width,opacity]` `--motion-normal` |
| `BaseSkeleton`                          | `shimmer` 1.4s infini                                                                                                      |

---

## Animations staggerées — Dashboard

Les 5 `BaseStatCard` du dashboard (`inertia/pages/dashboard.vue`) ont un `animation-delay` progressif via `:style` inline :

- Card 1 : 0ms
- Card 2 : 60ms
- Card 3 : 120ms
- Card 4 : 180ms
- Card 5 : 240ms

---

## Canvas & animations marketing (« Stripe-like »)

Couche d'animation des pages **home** et **tarifs** (refonte 2026-07-09). Toutes les briques sont **SSR-safe** (accès `window`/canvas uniquement dans `onMounted`) et honorent `prefers-reduced-motion` (rendu statique, aucune boucle `requestAnimationFrame`).

### Composants canvas — `inertia/components/marketing/canvas/`

| Composant                   | Effet                                                                                                                                  | Utilisé par                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `GradientMeshCanvas.vue`    | Dégradé multicolore (4–5 blobs radiaux) qui dérive lentement en fond de hero. Props `variant` (`navy`/`sunset`/`ocean`) + `intensity`. | `HomeHeroSection`, `PricingHeroSection` |
| `ParticleNetworkCanvas.vue` | Nœuds flottants reliés par des segments, réactifs à la souris (attraction douce). Props `color` + `density`.                           | `HomeFinalCtaSection`                   |

**Garde-fous communs** : `IntersectionObserver` (pause hors écran) + `visibilitychange` (pause onglet caché), `devicePixelRatio` plafonné à 2, `getContext` en `try/catch` (fallback si canvas indisponible, ex. jsdom), nettoyage complet des listeners/rAF en `onUnmounted`.

### Composables — `inertia/composables/`

| Composable            | Effet                                                                                                                                | Utilisé par                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `use_count_up.ts`     | Incrémente `0 → target` (easeOutCubic) au premier passage dans le viewport (`IntersectionObserver`). Gère préfixe/suffixe/décimales. | `HomeStatValue` (stats band, métriques case study) |
| `use_tilt.ts`         | Inclinaison 3D (`rotateX/rotateY`) selon la souris + parallaxe verticale au scroll. Retourne `{ el, transform }`.                    | `HomeHeroSection`, `HomeFeatureSection` (mockups)  |
| `use_tween_number.ts` | Anime (easeOutCubic) un nombre à **chaque changement** d'une source réactive (le total « roule » au lieu de sauter).                 | `PricingConfigurator` (total + économie annuelle)  |

### Utilitaires CSS (`app.css`)

| Classe                    | Effet                                                                                                                                                                                                                                         | Keyframe        | Utilisé par                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------- |
| `.text-gradient-animated` | Texte à dégradé coral→violet→sky qui défile en boucle (`background-clip: text`).                                                                                                                                                              | `gradientShift` | Highlights `<em>` des titres hero & configurateur          |
| `.glow-border`            | Anneau dégradé de base + un **faisceau lumineux (coral→violet) qui tourne en continu** autour du bord (« border beam »). Angle animé via `@property --beam-angle` (aucune rotation de l'élément → pas de coin qui dépasse), masqué en anneau. | `beamRotate`    | Carte récap configurateur, socle offre modulaire, tier Pro |
| `.float-slow`             | Flottement vertical lent et continu.                                                                                                                                                                                                          | `floaty`        | Mockup hero (couche externe, sous le tilt)                 |
| `.stagger` + `.visible`   | Entrée en cascade des enfants directs au scroll-reveal (délais `nth-child`).                                                                                                                                                                  | `revealUp`      | Colonnes de cartes (configurateur, offre modulaire)        |

Toutes ces animations infinies décoratives sont **explicitement coupées** (`animation: none`) sous `prefers-reduced-motion` — sinon la règle globale `animation-duration: 1ms` les ferait clignoter.

### Configurateur tarifs

`PricingConfigurator.vue` recalcule le total en direct (socle Pro + modules activés) à partir de `PLAN_PRICES`/`MODULE_PRICES` ; le total et l'économie annuelle « roulent » à chaque changement via `use_tween_number`, la carte récap porte un `.glow-border`.
