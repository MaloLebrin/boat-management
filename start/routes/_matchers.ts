import router from '@adonisjs/core/services/router'

/*
|--------------------------------------------------------------------------
| Global route matchers
|--------------------------------------------------------------------------
|
| Les contrôleurs de ressources font `Number(params.<id>)` sans valider que
| le segment est numérique. Sans matcher, `PUT /clients/not-a-number` produit
| `Number('not-a-number') = NaN` → `where('id', NaN)` → PostgreSQL lève
| `invalid input syntax for type integer: NaN` (une exception NON attrapée) →
| réponse 500 au lieu d'un 404 propre.
|
| On enregistre ici un matcher numérique global pour tous les paramètres de
| route qui désignent un identifiant en base. Un segment non numérique ne
| matche alors plus la route → 404 natif (voir issue #280).
|
| Importé en premier dans `start/routes.ts` (avant les fichiers de routes)
| pour rendre l'intention claire ; les matchers globaux sont de toute façon
| lus au commit des routes, donc appliqués à toutes les ressources.
|
| Paramètres volontairement exclus (non numériques) : `:token` (partage
| simulateur) et `:name` (preview d'email en dev).
|
*/

const numericIdParams = [
  'id',
  'boatId',
  'reservationId',
  'engineId',
  'portId',
  'mediaId',
  'partId',
  'logId',
  'itemId',
  'pontoonId',
  'mouillageId',
  'inspectionId',
  'sheetId',
  'sailId',
  'taskId',
  'stayId',
  'memberId',
  'incidentId',
  'entryId',
  'documentId',
  'eventId',
  'certId',
  'actionId',
]

for (const param of numericIdParams) {
  router.where(param, router.matchers.number())
}
