# 2026-08-20 — Guide entretien : le titre SEO ne reste plus bloqué sur « 2025 » (#476)

Suite de la campagne du 03/08. `/fr/cout-entretien-bateau` s'annonçait « Coût d'entretien bateau 2025 : Guide complet » en août 2026 : l'année était recopiée en dur dans `marketing.guide.meta_title`, dans les deux locales. Un titre daté de l'an passé décrédibilise la page auprès du lecteur comme des moteurs de recherche.

- **L'année est interpolée, plus recopiée.** `meta_title` porte désormais un placeholder ICU `{year}` (EN + FR) ; `MarketingController.buildGuidePageData` le résout à chaque rendu avec `new Date().getFullYear()`. Le titre suit le calendrier sans intervention.
- **Périmètre.** Seul le titre SEO du guide était concerné : `<title>`, `og:title` et le partage social de `/fr/cout-entretien-bateau` et `/en/boat-maintenance-cost`. Le corps de la page ne mentionnait aucune année.
- **Tests.** 4 tests (`tests/functional/marketing/guide_seo.spec.ts`) vérifient dans les deux locales que le titre contient l'année courante, que le placeholder est bien résolu et qu'aucune année figée ne subsiste. Ils échouent sur le code d'avant.
