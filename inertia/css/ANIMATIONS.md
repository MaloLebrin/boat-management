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

Effet : les cartes apparaissent en cascade à chaque navigation vers `/dashboard`.
