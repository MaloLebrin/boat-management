# Photos des équipements

Les six types d'équipement (moteur, pièce moteur, voile, gréement, équipement générique,
équipement de sécurité) peuvent porter des photos. Les **incidents** aussi depuis #814, par un
contrôleur dédié (`BoatIncidentMediaController`, autorisé par `IncidentPolicy.edit`) — voir
`docs/domain/incidents.md`.

## Modèle de données

Aucune migration : le média est **polymorphe**. La table `media` est indexée par
`(entity_type, entity_id)` et `entity_type` est une simple colonne `string` sans contrainte SQL.
Ajouter un porteur de média se réduit donc à étendre l'union TS `MEDIA_ENTITY_TYPES`
(`shared/constants/media.ts`).

`kind` (`photo` | `document`) sépare les deux usages. Une même entité peut porter les deux :
un moteur a des documents (PDF, avec route `/download`) **et** des photos (rendues via
`<img :src="secureUrl">`, donc pas de route de téléchargement).

## Résolveur plutôt que 12 méthodes

Six entités × (`store`, `destroy`) donnerait douze méthodes de contrôleur quasi identiques.
À la place :

- `shared/types/equipment_media.ts` — `EquipmentMediaSlug`, `ResolvedEquipmentMedia`,
  `EquipmentMediaResolution` (union discriminée `ok: true | false`).
- `app/services/equipment_media_service.ts` — `resolve(slug, boat, params, orgSlug)`. Un `switch`
  par slug ; chaque branche vérifie la propriété et renvoie `{ entityType, entityId, photoFolder,
photosUrl }` ou une redirection.
- `app/controllers/boat_equipment_media_controller.ts` — deux méthodes publiques déléguant à un
  `handle` privé. **Le slug est inféré des params déclarés par la route matchée**
  (`partId` → `engine-part`, `engineId` → `engine`, `sailId` → `sail`, `genericId` → `generic`,
  `safetyId` → `safety`, sinon `rig`), jamais lu depuis l'entrée utilisateur — d'où les noms de
  params distincts (`:genericId`, `:safetyId`) plutôt qu'un `:itemId` partagé.

Les routes **documents** existantes (moteur, pièce moteur) ne sont pas touchées : `kind`
différent, UI différente, et elles ont des routes `/download`.

## Défense IDOR (deux couches)

1. **Chaîne de propriété** : `auth.authenticate()` → `boatService.getForUserOrFail(user, boatId)`
   (scopé à l'organisation) → `bouncer.with(BoatPolicy).authorize('edit', boat)` → le résolveur
   vérifie que l'équipement appartient bien à ce bateau. Un `engineId` / `sailId` / `genericId`
   forgé depuis un autre bateau donne `ok: false` → redirection, aucun média touché.
2. **Scope du média** : à la suppression, `mediaService.getForEntity(mediaId, entityType, entityId)`
   exige que la ligne `media` appartienne à cette entité précise. C'est ce qui bloque le cas du
   gréement (singleton), où l'attaquant passe son propre `boatId` mais le `mediaId` de la victime.

Redirections en cas d'échec : moteur/voile → `/boats/:id` ; pièce → `.../engines/:engineId?tab=parts` ;
générique/sécurité → `/boats/:id?tab=equipment`.

Couverture : `tests/functional/boats/boat_equipment_photos.spec.ts` (upload, suppression, IDOR par
entité, non authentifié).

## Envois groupés : ce qui est refusé, et quand (#764)

Les treize routes de `LARGE_UPLOAD_ROUTES` (`config/bodyparser.ts`) sortent du
traitement automatique du bodyparser (`processManually`) et sont reprises par
`LargeMultipartUploadMiddleware`, qui les rejoue avec un plafond relevé.

Ce middleware écrivait chaque partie **en entier sur le disque** avant qu'aucun
validateur ne s'exécute, avec un plafond unique de 400 Mo pour les douze
routes. Il applique désormais trois gardes, par coût croissant :

| Garde                   | Source                             | Effet                                                                                   |
| ----------------------- | ---------------------------------- | --------------------------------------------------------------------------------------- |
| Plafond de charge utile | `largeUploadLimitFor(pattern)`     | 200 Mo pour un lot de photos (20 × 10 Mo), 400 Mo pour un lot de documents (20 × 20 Mo) |
| Extension               | `MEDIA_BATCH_RULES[kind].extnames` | la partie est **drainée sans être écrite**                                              |
| Nombre de parties       | `MAX_FILES_PER_BATCH`              | idem au-delà de 20                                                                      |

Les trois valeurs viennent de `shared/constants/media.ts`, que lit aussi
`app/validators/media.ts` : le middleware ne peut pas diverger du validateur
sans casser la compilation. La nature du lot est déduite du **motif de route**
(`/photos` ou `/documents`) — `tests/unit/hygiene/large_upload_routes.spec.ts`
fige ce couplage, pour qu'une treizième route ne se retrouve pas sans plafond
adapté ni allowlist.

Une partie refusée est drainée et non écrite : il faut consommer le flux pour
que l'analyse multipart continue, mais aucun octet ne touche le disque. Le
validateur rend ensuite l'erreur habituelle — **le refus précoce ne change pas
ce que voit l'utilisateur, seulement ce que ça coûte**.

Les fichiers temporaires acceptés sont supprimés en fin de requête (`finally`
du middleware). Le `unlink` précédent ne couvrait que l'échec du `pipeline` :
un lot rejeté par le validateur en aval laissait tout dans `tmpdir()`, et on
dépendait du ménage de l'OS. C'est sûr parce que les envois vers Cloudinary
ont lieu **dans la requête**, pas dans un job différé.

Enfin, `MediaService.upload` ne saute plus sa garde de quota quand
`file.size` vaut 0 : il mesure le fichier temporaire (`stat`) au lieu de
renoncer au contrôle pré-upload.

## Nettoyage Cloudinary

`deleteAllForEntity(entityType, entityId, folder, org)` supprime les lignes `media`, purge le dossier
Cloudinary et décrémente le quota. **Le `folder` passé doit être le dossier parent de l'entité**
(`parts/:partId`), pas un sous-dossier (`parts/:partId/documents`) — sinon le sous-dossier `photos/`
survit à la suppression.

Appelé par : `boat_engine_service.delete` (moteur + ses pièces), `boat_engine_part_service.delete`,
`boat_sail_service.delete`, `boat_rig_service.delete`, `boat_generic_equipment_service.delete`,
`boat_safety_equipment_service.delete`, et `boat_hull_service.deleteForUser` (toutes les entités du
bateau). Le paramètre `org` est optionnel : sans lui, le nettoyage est ignoré (le quota ne peut pas
être décrémenté).

## Ajouter un nouveau porteur de photos

1. Étendre `MEDIA_ENTITY_TYPES` (`shared/constants/media.ts`).
2. Ajouter les builders `CloudinaryFolders` : un dossier parent + un `…Photos`.
3. Ajouter un slug + une branche `resolve` dans `EquipmentMediaService`.
4. Déclarer la paire de routes `photos` avec un nom de param distinct et un `.as(...)` explicite
   (l'auto-nommage AdonisJS collisionne, six routes partageant `store`).
5. Charger `photos` dans l'action `show` (`mediaService.listForEntity` + `toMediaRow`).
6. Appeler `deleteAllForEntity` dans le `delete` du service, et dans `boat_hull_service`.
7. Tests : upload, suppression, **IDOR**, non authentifié.
