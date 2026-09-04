# 2026-09-03 — Refonte marketing : pages fonctionnalités, aide & support, home resserrée

Refonte des pages marketing publiques pour améliorer la compréhension du futur
acheteur et la conversion : chaque fonctionnalité cœur a désormais sa page
dédiée, une page Aide & support existe, la navigation les expose (header +
footer), et la page d'accueil est resserrée autour du parcours d'achat.

## Nouvelles pages

Quatre pages publiques localisées (slugs dans `MARKETING_SLUGS`,
`shared/helpers/locale_path.ts`, alignés sur `start/routes/marketing.ts`) :

| Page               | FR                            | EN                          |
| ------------------ | ----------------------------- | --------------------------- |
| Carnet d'entretien | `/fr/carnet-entretien-bateau` | `/en/boat-maintenance-log`  |
| Planning & flotte  | `/fr/gestion-flotte-bateaux`  | `/en/boat-fleet-management` |
| Assistant IA       | `/fr/assistant-ia-bateau`     | `/en/ai-boat-assistant`     |
| Aide & support     | `/fr/aide`                    | `/en/help`                  |

- Les trois pages fonctionnalité sont rendues par une page Vue commune
  (`inertia/pages/marketing/feature.vue`) pilotée par `featureKey`, servie par
  `MarketingFeaturesController` (builder générique `buildFeaturePageData`).
  Sections : hero + mock produit, 3 blocs bénéfices (réutilisation de
  `HomeFeatureSection` et des mocks de la home), comment ça marche, preuve,
  maillage interne, FAQ, CTA final.
- La page Aide (`inertia/pages/marketing/help.vue`, `MarketingController.help`)
  agrège les canaux de contact et une FAQ par thèmes dont les réponses
  **réutilisent les clés i18n existantes** (FAQ home, FAQ tarifs avec montants
  ICU via `pricingCopyParams` — aucun prix recopié), plus des cartes ressources
  (guide, simulateur, outils IA).
- i18n : namespaces `marketing.features` et `marketing.help` (EN + FR,
  tutoiement FR côté marketing).
- SEO : `<Head>` complet (canonical, hreflang en/fr/x-default, og/twitter),
  JSON-LD `FAQPage` sur les 4 pages, entrées sitemap (`start/routes/home.ts`,
  features 0.8/monthly, help 0.5/monthly).

## Navigation

- **Header desktop** : 4 entrées — dropdown « Produit » (groupes
  Fonctionnalités : carnet, flotte, assistant IA ; Outils gratuits :
  simulateur — jusqu'ici absent du header —, diagnostic IA, pièces IA),
  puis Tarifs, Guide, Aide. Le lien ancre `/{locale}#features` quitte le
  header ; l'ancre `#features` reste posée sur la home.
- **Drawer mobile** : mêmes groupes à plat sous intertitres.
- **Source unique** : `inertia/composables/use_public_nav.ts` (hrefs via
  `marketingPath`), consommée par `AppHeaderProductMenu.vue` (nouveau) et le
  drawer.
- **Footer** : 5 colonnes — marque, Produit (carnet, flotte, assistant IA,
  tarifs), Ressources (simulateur, guide, diagnostic IA, pièces IA, aide),
  Entreprise, Légal.

## Page d'accueil

La home passe de 18 à 10 sections : hero → problème → 3 features (avec CTA
« En savoir plus » vers leurs pages dédiées) → diagnostic IA → comment ça
marche → témoignages → FAQ → CTA final.

**Aucun composant supprimé** (décision propriétaire) : les 8 sections retirées
de l'affichage (`HomePillarsSection`, `HomeModularOfferSection`,
`HomeCaseStudySection`, `HomePersonasSection`, `HomeStatsBandSection`,
`HomeComparisonSection`, `HomeSecuritySection`, `HomeDemoSection`) et les
4 composants déjà inutilisés (`HomeFaqCtaSection`, `HomeIndustriesSection`,
`HomeProofSections`, `HomeScreenshotsSection`) portent un bloc de commentaire
en tête (rôle d'origine, statut, procédure de réactivation). Dans `home.vue`,
leurs imports et blocs `<template>` restent commentés en place : réactivation
par simple décommentage. `buildHomePageData` et `PageProps` sont inchangés
(les props des sections retirées sont toujours servies — surcoût de payload
accepté pour garder la réactivation sans travail backend).

Les CTA « Réserver une démo » (hero, CTA final) pointaient sur l'ancre `#demo`
de la section Demo retirée : nouvelle prop optionnelle `secondaryHref`
(rétrocompatible, défaut = ancre `#demo`), ciblée sur `/contact#contact-form`.

## Tests

- `tests/functional/marketing/feature_pages.spec.ts` : les 8 nouvelles URLs
  rendent le bon composant avec copie résolue (aucune clé i18n brute, montants
  ICU interpolés sur l'aide).
- `tests/inertia/marketing_feature.spec.ts` : montage de `feature.vue` et
  `help.vue` (hero, blocs, mailto en ancre brute, accordéon FAQ, ressources).
- `tests/inertia/public_nav_footer.spec.ts` adapté (dropdown Produit) + tests
  d'atteignabilité des nouvelles pages depuis header/drawer/footer.
- `tests/functional/routing/marketing_slugs.spec.ts` couvre automatiquement
  les nouveaux slugs (itère sur `MARKETING_SLUGS`).
