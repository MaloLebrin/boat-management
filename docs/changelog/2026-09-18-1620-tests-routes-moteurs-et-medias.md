# 2026-09-18 — Tests : routes moteurs, téléchargements de médias et exports CSV (#692)

`tests/functional/boats/` est le domaine le mieux couvert du dépôt — 55 fichiers, plus de 500 cas,
avec même des assertions anti N+1. C'est précisément ce qui rendait ses trous difficiles à voir : un
scan des 48 routes littérales de `start/routes/boats.ts` fait ressortir cinq routes qu'aucun test
n'atteignait, dont **les deux seules qui construisent un en-tête `Content-Disposition` à partir d'un
nom de fichier fourni par l'utilisateur**.

## Ce que l'issue annonçait, et ce que le dépôt disait

#692 listait sept routes. Deux ne sont plus à couvrir — `GET …/sails/:sailId/edit` et
`GET …/rig/edit` ont été épinglées entre-temps par #689 (`boats_pages_contract.spec.ts`). Il en
restait cinq : les deux `PATCH` partiels du moteur, le `DELETE` d'un média moteur, et les deux
`download`.

Les quatre exports CSV, eux, n'étaient pas « non testés » mais testés **en damier** — chacun sur une
cellule différente, aucun sur les trois :

| Export                | 200 + contenu | Refus `starter` | Cross-org |
| --------------------- | ------------- | --------------- | --------- |
| `maintenance.csv`     | ✗             | ✓               | ✗         |
| `fuel-logs.csv`       | ✓             | ✗               | ✗         |
| `navigation-logs.csv` | ✗             | ✗               | ✗         |
| `budget.csv`          | ✓             | ✗               | ✓         |

C'est le pire des cas : la couverture a l'air d'exister. `csv_export_contract.spec.ts` remplit la
grille entière et fige le **contrat de route** ; les specs existantes gardent le **contenu métier**
(colonne `carburant`, ligne `TOTAL`) — deux questions distinctes, volontairement laissées à deux
endroits.

## Le contrat réel n'est pas celui que l'issue décrivait

L'issue attendait des `404` sur les accès inter-organisations et un refus explicite sur le quota. Le
code dit autre chose, et c'est le code qui a été figé :

- le scoping bateau est un `where('organizationId', …)` dans `BoatHullService.getForUserOrFail`, pas
  un bouncer : un bateau étranger donne **`302 → /boats`**, jamais 403 ni 404 ;
- un média introuvable ou rattaché à une autre entité donne **`302`** vers la fiche concernée ;
- `QuotaExceededError` est rendue par le handler global (`app/exceptions/handler.ts`) en **`302`
  vers la page précédente**, avec le flash `errorAction` = `/settings/billing` — l'upsell de #418.

## Le header splitting, mesuré

Les deux routes `download` passent bien par `contentDisposition()`, mais rien ne le vérifiait au
niveau HTTP : seul le helper avait un test unitaire. Un test par média au nom hostile
(`rapport"\r\nX-Injected: 1\été`) fige désormais les deux routes — l'en-tête ne contient ni CR ni LF,
les caractères de contrôle et le guillemet sont remplacés par `_` dans `filename`, le nom complet
reste restituable via `filename*`, et aucun en-tête `X-Injected` n'apparaît dans la réponse.

Constat de la vérification, qui vaut d'être noté : **Node refuse lui-même un en-tête contenant un
CRLF** (`ERR_INVALID_CHAR`). Remplacer le helper par une interpolation brute ne produit donc pas une
réponse corrompue mais une requête qui meurt (`ECONNRESET`) — le risque réel n'est pas l'injection
d'en-tête en production, c'est le **500 sur un nom de fichier légitime mais exotique**. Le helper
vaut pour les deux.

## Un écart d'autorisation entre deux routes voisines

Épinglé, pas corrigé : `destroyEngineMedia` exige `boats.edit` via le bouncer, mais les deux routes
`download` **n'ont aucun bouncer** — un `mechanic`, dont les capabilities s'arrêtent à la
maintenance, télécharge donc n'importe quel document de n'importe quel bateau de son organisation.
Le test le dit explicitement, pour qu'un durcissement futur soit un choix délibéré et non une
surprise.

## `process_media` est du code mort

La garde de #699 exemptait ce job au motif « couvert par le domaine bateau (#692), avec les
fabriques Cloudinary ». **Le motif était faux** : les médias de bateau passent par `MediaService` et
`CloudinaryService` en direct, jamais par ce job — qui n'est enfilé nulle part dans le dépôt, et dont
`execute()` se contente de logger, comme `GenerateExport`. Une exemption au mauvais motif annonce une
couverture qui ne viendrait jamais.

Traité comme `GenerateExport` en #699 : sa clé de déduplication, seule partie réelle et pure, est
testée ; l'exemption est levée. Sa suppression relève d'une PR de production, hors périmètre ici.

## Tests

54 cas ajoutés :

- `tests/functional/boats/engine_partial_updates.spec.ts` — 15 cas : les quatre statuts du domaine
  (`retired` compris), le refus hors enum, les bornes de `notes` (5000/5001), le moteur d'un autre
  bateau, le bateau d'une autre organisation, `member` accepté / `mechanic` refusé.
- `tests/functional/boats/media_download.spec.ts` — 18 cas : téléchargement bateau et moteur, branche
  image **et** branche PDF (`resourceType` dérivé du format), noms hostiles, IDOR à chaque niveau,
  suppression effective observée chez Cloudinary.
- `tests/functional/boats/csv_export_contract.spec.ts` — 17 cas : les 4 exports × (nominal, refus
  `starter`, cross-org, session requise), plus l'ordre `assertCanExport` **avant** `resolveBoat`.
- `tests/integration/jobs/process_media.spec.ts` — 4 cas sur la clé de déduplication.
- `tests/support/fakes.ts` — le fake Cloudinary enregistre désormais ses `downloadAsBuffer`
  (`publicId`, `resourceType`, `format`) et accepte une réponse scriptée. Sans ça, un test de
  téléchargement ne peut prouver ni quel média a été servi, ni que la branche `pdf → raw` est prise.
- `tests/functional/helpers.ts` — `createStarterAdminUser()`. `createStarterPlanUser()` n'a **pas**
  de membership : sur une route gardée par une policy puis par le plan, il est refusé par la policy
  et le test passerait au vert sans jamais atteindre la garde de plan. C'est le piège des gardes en
  amont (#688). La copie locale de `quota_flash_source.spec.ts` est migrée dessus.

## Non-vacuité

Quatre mutations, chacune restaurée, chacune produisant un échec nommé :

| Mutation                                                     | Échec obtenu                                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `contentDisposition(media.originalFilename)` — format retiré | `expected 'attachment; filename="manuel"' to equal '…"manuel.pdf"'`               |
| `getForEntity` sans son scoping `entityType`/`entityId`      | les deux cas IDOR tombent : `expected 200 to equal 302`                           |
| `assertCanExport` retiré de l'export maintenance             | `expected 200 to equal 302` + `expected {} to have nested property 'errorAction'` |
| spec de `process_media` supprimé                             | `jobs sans aucun test : process_media`                                            |
