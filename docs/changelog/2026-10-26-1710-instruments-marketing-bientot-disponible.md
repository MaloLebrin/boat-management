# 2026-10-26 — Page « Instruments de bord connectés » : annoncée comme bientôt disponible

La page publique des instruments connectés (`/fr/instruments-bateau-connectes`, `/connected-boat-instruments`) décrivait la fonctionnalité comme ouverte alors que le parcours « plug and play » (#1032) et la boîte FleetAi (#1044) sont encore en cours. Le héros l'annonce désormais explicitement.

- **Pastille « Bientôt disponible ».** Nouvelle prop optionnelle `badge` sur `FeatureHeroSection` (pastille ambre `bg-amber-100` / `text-amber-700`, inversés par le thème sombre, posée entre l'accroche et le titre, `data-testid="feature-hero-badge"`). Les autres pages de fonctionnalité ne la passent pas : rien ne change pour elles.
- **Contenu.** `InstrumentsMarketingContentProps.hero.comingSoon` servi par `MarketingInstrumentsContentService` depuis `marketing.features.instruments.hero_coming_soon` ; la réassurance sous les boutons devient « Bientôt dans les plans Pro et Entreprise · … » (EN : « Coming soon to the Pro and Enterprise plans · … »). Meta, FAQ, étapes et boutons inchangés.
- **i18n.** Clé `hero_coming_soon` ajoutée et `hero_reassurance` révisée dans `marketing.json` EN + FR (tutoiement marketing).
- **Tests.** Japa functional `instruments_seo.spec.ts` : le héros porte la mention dans les deux locales ; Vitest `marketing_feature_hero_badge.spec.ts` : la pastille s'affiche avec `badge`, précède le titre, et n'existe pas sans.
