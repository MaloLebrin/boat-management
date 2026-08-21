# 2026-07-09 — Marketing : correction des liens morts (404) + page de confidentialité

Audit et correction des liens 404 sur les pages publiques (issue #345) :

- **Lien « Simulateur » du footer** (`inertia/layouts/public.vue`) : pointait vers `/${locale}/simulateur` (404) → désormais route localisée réelle (`/fr/simulateur-cout-entretien`, `/en/maintenance-cost-simulator`) via un `computed simulatorHref`.
- **CTA « études de cas » de la home** (`HomeCaseStudySection`, clés `marketing.home.case_study.cta_*`) : pointait vers `/cas-clients` / `/case-studies` (pages inexistantes). Le CTA renvoie maintenant vers le simulateur (texte adapté : « Estimer mes coûts d'entretien » / « Estimate your maintenance costs »).
- **Balises SEO** : `canonical` + `hreflang` corrigés sur la page **simulateur** (`inertia/pages/marketing/simulator.vue`) et le `canonical` de la page **guide** (`inertia/pages/marketing/guide.vue`) qui donnait un 404 en anglais (`/en/cout-entretien-bateau`).
- **Nouvelle page « Politique de confidentialité »** : routes `/en/privacy` et `/fr/confidentialite` (`MarketingController.privacy` + `marketing/privacy.vue`), contenu RGPD en deux langues (clés `marketing.privacy.*`). Les liens privacy du footer et du formulaire de contact (`ContactFormSection`, auparavant `/privacy` → 404) pointent désormais vers cette page (route localisée).
