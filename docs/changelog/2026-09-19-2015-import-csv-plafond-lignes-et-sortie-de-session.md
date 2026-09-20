# Import CSV : plafond de lignes et sortie de la session

**Date** : 19 septembre 2026
**Issue** : #774

## Contexte

`POST /settings/import/preview` ne bornait rien. Le validateur acceptait un
fichier de 5 Mo — plusieurs dizaines de milliers de lignes — et le parse les
gardait toutes : chacune validée, conservée en mémoire, stockée **en session**,
puis insérée une par une (deux `INSERT` par ligne) dans une seule transaction.

Deux conséquences, dont une visible en production :

1. **L'import de plusieurs centaines de lignes ne marchait pas.** Avec
   `SESSION_DRIVER=cookie` (la valeur de `.env.example`), les lignes validées
   dépassaient les ~4 Ko d'un cookie. L'aperçu s'affichait correctement, puis
   la confirmation servait « votre prévisualisation a expiré » — pour un
   fichier parfaitement valide, sans rien qui explique pourquoi.
2. **Un fichier volumineux tenait la base.** Des milliers d'`INSERT` unitaires
   dans une transaction unique, verrou long et WAL gonflé, sans borne haute.

## Ce qui change

### Bornes explicites (`shared/constants/csv_import.ts`)

| Constante                     | Valeur  | Appliquée par                                       |
| ----------------------------- | ------- | --------------------------------------------------- |
| `CSV_IMPORT_MAX_ROWS`         | `2 000` | `parseMaintenanceCsv()`, **avant** toute validation |
| `CSV_IMPORT_MAX_FILE_SIZE_MB` | `2`     | `csvPreviewValidator` (VineJS)                      |
| `CSV_IMPORT_INSERT_CHUNK`     | `200`   | `importMaintenanceRows()`                           |

La taille de fichier est calée sur le plafond de lignes, et non l'inverse : un
`5mb` accepté par le validateur puis systématiquement refusé au parse est un
piège. Le refus de lignes passe **avant** le contrôle d'en-têtes — sur un
fichier hors bornes, on ne parse rien de plus que le comptage.

Nouveau message `flash.csv.tooManyRows` (EN/FR) : il nomme le nombre de lignes
du fichier **et** la limite. « Fichier invalide » ne dit pas quoi découper.

L'aide de l'écran (`settings.import.fileHint`, `settings.import.help.step2`)
interpole désormais ces constantes. Elle annonçait « max 5 Mo », sans plafond
de lignes : une limite que le code n'appliquait pas.

### Les lignes en attente sortent de la session

Nouvelle table `pending_imports` (`user_id` **unique** cascade, `boat_id`
cascade, `type`, `rows` en `jsonb`). La session ne porte plus que
`pendingImportId`.

- `preview` supprime l'attente précédente de l'utilisateur puis en crée une —
  une par utilisateur, rien ne s'accumule, donc **aucun job de purge**.
- `confirm` charge la ligne **par `id` et par `userId`**, écrit, puis la
  supprime. Le scope `userId` n'est pas décoratif : sans lui, un identifiant
  recopié suffirait à consommer la prévisualisation d'un collègue de la même
  organisation — la vérification du bateau, elle, ne tranche pas ce cas
  puisque les deux y ont accès.
- `cancel` supprime l'attente de l'utilisateur.

### Insertion par lots

`importMaintenanceRows()` insère par lots de `CSV_IMPORT_INSERT_CHUNK` via
`createMany`, au lieu de deux `INSERT` par ligne. **La transaction unique est
conservée** : le contrat documenté est un rollback global si une ligne échoue,
et le plafond de lignes borne désormais sa durée.

## Migration

`database/migrations/1854000000000_create_pending_imports_table.ts` — `up()` et
`down()`. Aucune donnée à reprendre : les imports en attente vivaient en
session, ils expireront d'eux-mêmes. Un utilisateur au milieu d'un import au
moment du déploiement devra re-uploader son fichier.

## Tests

- `POST /preview` refuse un fichier au-delà de 2 000 lignes, avec le message
  qui nomme les deux nombres, sans rien préparer — et le fichier reste sous le
  plafond de taille, donc c'est bien le nombre de lignes qui le refuse.
- Un import de **600 lignes** se confirme intégralement, et le payload de
  session reste sous 1 Ko. C'est le test qui échouait avec l'ancien mécanisme :
  il assertait la taille, pas le driver, donc il tombe aussi sous
  `SESSION_DRIVER=memory` (la valeur de `.env.test`).
- L'identifiant d'un import préparé par un **autre admin de la même
  organisation** ne confirme rien et ne consomme pas son attente.

Les trois garde-fous ont été vérifiés porteurs en les retirant un à un : chaque
retrait fait tomber le test correspondant, et lui seul.

Les assertions existantes qui lisaient `session('pendingImport')` sont
réécrites sur la table. Deux cas dont le sens est préservé : l'attente de
l'admin survit à l'annulation tentée par un `mechanic`, et la matrice de rôles
confirme toujours avec une attente valide.
