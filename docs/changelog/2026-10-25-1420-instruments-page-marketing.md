# Instruments : page marketing « Instruments de bord connectés » (#995)

Date : 2026-10-25

## Ce qui change

- Nouvelle page publique **`/en/connected-boat-instruments`** et **`/fr/instruments-bateau-connectes`** : ce que l'on voit (six familles de mesures), comment ça marche en trois étapes, ce que ça change pour l'entretien (heures moteur automatiques, historique, alertes), compatibilité honnête (ce qui est pris en charge et ce qui ne l'est pas, plan Pro ou Entreprise requis), installation à bord, sécurité et conservation des données, FAQ de sept questions.
- Mise en avant : lien « Instruments connectés » dans le menu Produit, le drawer mobile et le footer ; quatrième bloc de la home (avec maquette de l'onglet Instruments) ; entrée dans le sitemap (priorité 0,8) ; question « Faut-il le plan Pro pour les instruments connectés ? » dans la FAQ tarifs.
- La FAQ de la page répond honnêtement sur l'iPhone : la configuration avec certificat auto-signé n'est pas encore validée sur appareil.
- Guide d'installation pas à pas : `docs/user-guide/instruments-signalk.md`.

## Technique

- `MARKETING_SLUGS.instruments`, routes `marketing.{en,fr}.instruments` rendues par `MarketingFeaturesController.instruments` (page `marketing/instruments`).
- `MarketingInstrumentsContentService` assemble la prop `content` (typée dans `shared/types/marketing_instruments.ts`) depuis `marketing.features.instruments.*` ; les durées de conservation sont lues dans `TELEMETRY_SAMPLE_RETENTION_DAYS`.
- Composants : `HomeMockInstruments` (valeurs simulées, libellés dans `homePreview.mock.instruments.*`), `InstrumentsCardsSection`, `InstrumentsCompatibilitySection` ; `FeatureHeroSection` et `HomeFeatureSection` acceptent le mock `instruments`.
- `<Head>` : JSON-LD `FAQPage`, `BreadcrumbList` et `WebApplication`, `og:locale`, canonical et hreflang absolus avec `x-default`.
- Base de connaissance du copilote : mots-clés « instruments connectes », « page instruments » et « heures moteur automatiques » ajoutés à l'entrée `instruments-signalk`.
- Le paramètre `?from=instruments` des CTA n'a pas encore de bandeau contextuel sur la page d'inscription.
