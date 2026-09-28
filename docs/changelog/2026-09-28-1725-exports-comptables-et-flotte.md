# 2026-09-28 — Exports comptables (journal des ventes, FEC) et exports flotte (#879)

Une organisation qui facture transmettait ses ventes à son comptable facture
par facture, en PDF, et ne pouvait pas produire de FEC. Les exports CSV
existants étaient tous **par bateau**, sans période : rien pour les
réservations, les clients ou les factures de toute la flotte.

## Journal des ventes et FEC

- `GET /invoices/export.csv?from=&to=&kind=&status=&detail=` — une ligne par
  facture ou avoir **émis** (ni devis ni brouillon), période sur la date
  d'émission : numéro, type, date, échéance, client, facture avoirée, HT, taux
  de TVA, TVA, TTC, devise, statut, date et moyen de paiement. Les **avoirs
  sont en négatif** : une colonne se somme en chiffre d'affaires net.
  `detail=lines` : une ligne par ligne de facture.
- `GET /invoices/export/fec?year=` — fichier des écritures comptables au
  format de l'article A47 A-1 du LPF (18 colonnes, tabulations, `AAAAMMJJ`,
  virgule décimale, ISO-8859-15), nommé `<SIREN>FEC<AAAA>1231.txt` :
  - journal `VE` à l'émission : facture = débit 411 (TTC, compte auxiliaire du
    client), crédit 706 (HT), crédit 44571 (TVA) ; avoir = l'inverse ;
  - journal `BQ` au paiement : règlement = débit 512 / crédit 411 pour le total
    moins les avoirs non remboursés ; remboursement d'un avoir = l'inverse.

  Chaque écriture est équilibrée et numérotée par journal. C'est une **aide**
  au comptable, pas un livre certifié : l'écran le dit.

- Comptes et SIREN réglables dans `/settings/billing`, carte « Export
  comptable » : `PUT /settings/billing/accounting` (`manageBilling`).
- Ouvert à qui voit les factures (`invoices.view`), plan avec export, module
  CRM & Facturation actif **ou** pièces existantes (lecture seule après
  résiliation, #332).

## Exports flotte

- `GET /reservations/export.csv?from=&to=&boatId=&status=&paymentStatus=` —
  réservations qui **chevauchent** la période, avec prix, acompte, encaissé,
  statut de paiement et caution (#875). Module Location, `boats.view`.
- `GET /clients/export.csv?from=&to=` — fiches créées sur la période, **hors
  clients anonymisés**. Même seuil que l'export RGPD d'une fiche
  (`clients.update`) ; journal `client.export_bulk`.
- `GET /maintenance/history.csv` — historique de toute la flotte avec les
  filtres de l'écran (recherche, sujet, bateau, période), à côté du PDF.
- Les quatre exports d'un bateau (`maintenance`, `maintenance-tasks`,
  `fuel-logs`, `navigation-logs`) acceptent `?from=&to=` (VineJS, bornes
  incluses) ; deux champs de date sur `/settings/import`.
- En-têtes dans la langue de l'utilisateur (namespace `csv`), anti-injection de
  formule (#773) comme pour les autres exports.

## Gros exports en arrière-plan

- Au-delà de **5 000 lignes** (`EXPORT_ASYNC_THRESHOLD`), l'export n'est plus
  servi dans la réponse : une ligne `data_exports` est créée, le job
  `GenerateExport` (file `exports`) — jusqu'ici un placeholder — construit le
  même fichier, le garde **compressé en base** (le worker et le serveur web ne
  partagent pas de disque), puis notifie le demandeur `export.ready` (ou
  `export.failed`).
- Nouvelle page `/settings/exports` : les exports du demandeur, statut, période,
  nombre de lignes, expiration, lien de téléchargement **signé**
  (`GET /exports/:id/download`) valable 7 jours, qui exige aussi la session du
  demandeur.
- Purge quotidienne `PurgeExpiredExports` à 01:30 (Europe/Paris).

## Journal d'audit

- `export.run` pour chaque export flotte ou comptable, synchrone ou non : type,
  période, nombre de lignes, paramètres.
- `client.export_bulk`, `accounting_settings.update`.

## Base de données

Migration `1870000000000_add_data_exports` :

- `organizations.accounting_siren` (9 chiffres, nullable),
  `accounting_sales_account` (`706`), `accounting_vat_account` (`44571`),
  `accounting_customer_account` (`411`), `accounting_bank_account` (`512`) ;
- table `data_exports` (organisation, demandeur, type, paramètres jsonb,
  statut, lignes, fichier gzip en `bytea`, erreur, expiration).

## Documentation

`docs/domain/invoicing.md` §7 quinquies, `docs/domain/csv-import-export.md`
(période, exports flotte, arrière-plan), `docs/data/schema.md`
(`data_exports`, comptes, purge), `docs/domain/clients.md`, `ui-map.md`,
base de connaissance du copilote (`accounting-exports`, `csv-pdf-export`).
