# Mentions légales — variables d'environnement (#466)

La page `/fr/mentions-legales` (`/en/legal-notice`) publie l'identité de l'exploitant exigée
par l'article 6-III de la LCEN. Ces informations dépendent de la structure juridique réelle :
elles vivent donc dans l'environnement (`config/legal.ts`), jamais dans le code ni dans les
fichiers de traduction — l'i18n ne porte que les **libellés**.

## Variables à renseigner

| Variable                     | Exemple                                    | Rôle                                      |
| ---------------------------- | ------------------------------------------ | ----------------------------------------- |
| `LEGAL_COMPANY_NAME`         | `FleetAi SAS`                              | Dénomination sociale de l'éditeur         |
| `LEGAL_LEGAL_FORM`           | `Société par actions simplifiée`           | Forme juridique                           |
| `LEGAL_SHARE_CAPITAL`        | `10 000 €`                                 | Capital social                            |
| `LEGAL_ADDRESS`              | `12 quai Valin, 17000 La Rochelle, France` | Siège social                              |
| `LEGAL_REGISTRATION_NUMBER`  | `RCS La Rochelle 900 123 456`              | Immatriculation RCS / SIREN               |
| `LEGAL_VAT_NUMBER`           | `FR12900123456`                            | TVA intracommunautaire                    |
| `LEGAL_CONTACT_EMAIL`        | `support@fleetai.app`                      | Contact de l'éditeur                      |
| `LEGAL_CONTACT_PHONE`        | `+33 5 46 00 00 00`                        | Téléphone de l'éditeur                    |
| `LEGAL_PUBLICATION_DIRECTOR` | `Malo Lebrin`                              | Directeur de la publication               |
| `LEGAL_HOST_NAME`            | `Scaleway SAS`                             | Hébergeur                                 |
| `LEGAL_HOST_ADDRESS`         | `8 rue de la Ville l'Évêque, 75008 Paris`  | Adresse de l'hébergeur                    |
| `LEGAL_HOST_CONTACT`         | `+33 1 84 13 00 00`                        | Contact de l'hébergeur                    |
| `LEGAL_MEDIATOR_NAME`        | `Médiateur de la consommation FEVAD`       | Médiateur (art. L612-1 code de la conso)  |
| `LEGAL_MEDIATOR_URL`         | `https://www.mediateurfevad.fr`            | URL de saisine — rendue en lien cliquable |

## Ce qui se passe si une variable manque

La ligne n'est **pas** masquée : elle affiche « Information à compléter — nous écrire à
support@fleetai.app ». Un champ légalement obligatoire absent doit se voir, pas disparaître
de la page. Toutes les variables sont optionnelles au démarrage pour ne pas casser le
développement local et les tests — c'est un choix de robustesse, pas une dispense.

**Avant toute mise en production, les quatorze variables doivent être renseignées.**

## Où c'est utilisé

- `config/legal.ts` — résolution depuis `env`, une seule source
- `app/controllers/marketing_controller.ts` → `buildLegalNoticePageData()` — assemble libellés
  i18n (`marketing.legalNotice.*`) et valeurs d'environnement
- `inertia/pages/marketing/legal_notice.vue` + `LegalDocumentSections.vue` (`LegalSection.entries`)
- Le médiateur est également cité par les CGV (`marketing.salesTerms.s14_*`), qui renvoient
  vers cette page plutôt que de dupliquer ses coordonnées.
