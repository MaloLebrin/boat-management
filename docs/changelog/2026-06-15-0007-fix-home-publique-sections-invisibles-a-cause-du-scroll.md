# 2026-06-15 — Fix : home publique — sections invisibles à cause du scroll-reveal brisé (#40)

**Correctif UX — Page d'accueil publique (`/en`, `/fr`)**

Toutes les sections sous le hero (`HomeProblemSection`, `HomePillarsSection`, `HomeFeatureSection` ×3, `HomePersonasSection`, `HomeStatsBandSection`, `HomeComparisonSection`, `HomeTestimonialsSection`, `HomeSecuritySection`, `HomeFaqSection`) restaient à `opacity: 0` : le composable `useScrollReveal` utilisait `IntersectionObserver` sur une ref qui n'était jamais connectée au DOM.

Cause : le pattern `:ref="(el) => (sectionEl = el as HTMLElement)"` réassigne la variable locale sans mettre à jour `sectionEl.value`, donc l'observer ne recevait jamais l'élément cible.

Fix : remplacement de ce pattern par `:ref="sectionEl"` (Vue gère automatiquement `sectionEl.value = el`) dans les 26 occurrences réparties sur 14 composants de `inertia/components/marketing/home/`.
