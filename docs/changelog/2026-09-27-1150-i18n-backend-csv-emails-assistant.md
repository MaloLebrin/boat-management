# 2026-09-27 — i18n backend : en-têtes CSV, e-mails et assistant sans bascule `locale === 'fr'` (#863)

Un utilisateur anglophone exportait des CSV aux colonnes `légende_moteur` ou `coût_total`. Côté backend, plusieurs textes bilingues étaient écrits à la main (ternaires `locale === 'fr'`, gabarits d'e-mail `@if(isFr)`), ce qui fermait la porte à une troisième langue.

- **Exports CSV** :
  - les en-têtes de `maintenance.csv`, `fuel-logs.csv` et `navigation-logs.csv` suivent la locale de l'utilisateur ;
  - ils viennent du nouveau namespace backend-only `csv` (`resources/lang/{en,fr}/csv.json`), exclu d'`appT` comme `flash`/`marketing`/`validator` ;
  - les en-têtes FR ne changent pas ;
  - les en-têtes EN de `maintenance.csv` sont exactement ceux de l'import de maintenance : un export anglais se ré-importe tel quel. L'import garde ses en-têtes stricts, sans alias (`docs/domain/csv-import-export.md`).
- **E-mails** :
  - les gabarits `invoice`, `rental_contract`, `simulator_report`, `nurturing_d3`, `nurturing_d7` et `contact_message_ack` n'ont plus de bascule `isFr` / `locale === 'fr'` ;
  - les jobs et `EmailQueueService` passent `i18n` à `edge.render`, et le global `t()` d'`@adonisjs/i18n` traduit ;
  - l'accusé de réception du formulaire de contact passe aussi son sujet et son texte par `marketing.emails.contactAck.*` ;
  - au passage, le corps HTML de la facture ne dit plus « votre la facture n FAC-… » : il réutilise l'article de `invoices.email.kind`.
- **Assistant** :
  - le message de repli quand une action n'est pas exécutable passe par `assistant.notExecutable.<reason>` ;
  - le titre de la section « Repères d'expert » passe par `assistant.playbooks.promptHeader`.
- **Partage du simulateur** : la redirection après création vise la route nommée `simulator.share.show.<locale>`, et non plus un chemin choisi par ternaire.
- **Helpers** :
  - `toAppLocale(locale, fallback?)` accepte un repli explicite ;
  - nouveau `isAppLocale()` (`shared/helpers/locale_path.ts`), utilisé par `DetectUserLocaleMiddleware`, `MarketingContentService` et `ContactMessageService`.
- **Garde-fou** : une règle ESLint `no-restricted-syntax` refuse toute comparaison à `'fr'` dans `app/**`. Seuls les fragments de prompt envoyés au modèle IA, jamais affichés, gardent leur bascule, avec un `eslint-disable-next-line` motivé.
- **Tests** :
  - `csv_export_contract.spec.ts` : en-têtes EN, et export EN identique aux en-têtes de l'import ;
  - e-mails de facture, de contrat de location et du simulateur : le HTML est vérifié dans les deux langues ;
  - partage du simulateur en EN ;
  - titre de section des playbooks ;
  - `toAppLocale` / `isAppLocale`.
- **Docs** :
  - `docs/frontend/i18n.md` : section « Côté backend » ;
  - `docs/domain/csv-import-export.md` ;
  - `CLAUDE.md` (namespaces backend-only).
