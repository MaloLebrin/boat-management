# 2026-07-09 — Refonte marketing « Stripe-like » : home + tarifs (animations, canvas, configurateur)

Refonte visuelle des pages **home** et **tarifs** pour mettre en scène l'offre modulaire (#327) et apporter une couche d'animation façon stripe.com, dans le respect de la charte nautique (hero sombre navy + corps cream).

- **Infrastructure d'animation réutilisable** :
  - `GradientMeshCanvas.vue` (`inertia/components/marketing/canvas/`) — dégradé multicolore animé en fond de hero (canvas 2D). Variantes `navy`/`sunset`/`ocean`.
  - `ParticleNetworkCanvas.vue` — réseau de nœuds reliés, réactif à la souris (évoque une flotte connectée).
  - Composables `use_count_up.ts` (compteurs incrémentés au scroll), `use_tilt.ts` (cartes 3D inclinables + parallaxe) et `use_tween_number.ts` (nombre qui « roule » à chaque changement).
  - Utilitaires CSS : `.text-gradient-animated` (titres highlight en dégradé animé), `.glow-border` (bordure conique rotative sur les cartes mises en avant), `.float-slow` (flottement du mockup hero), `.stagger` (entrée en cascade des cartes au scroll).
  - Tous **SSR-safe** (accès `window`/canvas uniquement `onMounted`), avec pause hors-écran (`IntersectionObserver`) + onglet caché (`visibilitychange`), `devicePixelRatio` plafonné à 2, et **fallback statique / animations coupées** sous `prefers-reduced-motion`.
- **Home** : hero sombre navy + gradient mesh, mock produit en carte 3D ; nouvelle section **`HomeModularOfferSection`** (socle Pro + 2 modules add-ons avec prix) ; tilt sur les mockups des features ; compteurs animés (`HomeStatValue`) sur la stats band et les métriques du case study ; réseau de particules en fond du CTA final.
- **Tarifs** : hero sombre + gradient mesh ; nouveau **configurateur interactif `PricingConfigurator`** (socle Pro + toggles Location/CRM & Facturation → **total et économie annuelle recalculés en direct**, comparaison Enterprise) ; le tableau détaillé marque désormais les capacités issues des modules via un badge **« Add-on »** (nouveau groupe « Modules add-ons »). La grille `PricingModulesSection` est absorbée par le configurateur.
- **`BaseButton`** : ajout de la variante `outline` (type honnête avec `ctaVariant` produit par le controller).
- **Prix** lus depuis `PLAN_PRICES` / `MODULE_PRICES` (`shared/types/plan.ts`) via `MarketingController` — aucune valeur en dur.
- **i18n** (en + fr) : `home.modularOffer.*`, `pricing2.config_*`, `pricing2.table_modules_*` / `table_addon_badge`.
- **Couche d'animation enrichie** : titres highlight en dégradé animé, bordure lumineuse rotative sur le tier Pro / la carte récap du configurateur / le socle de l'offre modulaire, flottement du mockup hero, entrée staggerée des cartes, total du configurateur qui « roule ». Correction au passage : l'entrée `fadeUp` (`fill: both`) du mockup hero écrasait le `transform` du tilt (séparation entrée / flottement / tilt sur des divs imbriqués).
- **Tests** : Vitest configurateur (total mensuel/annuel, toggles, économie), `HomeStatValue` (parsing), montage des canvas sans erreur, `HomeModularOfferSection` ; suites marketing existantes mises à jour.
- **Doc** : `inertia/css/ANIMATIONS.md` complété (canvas, composables, utilitaires CSS).
