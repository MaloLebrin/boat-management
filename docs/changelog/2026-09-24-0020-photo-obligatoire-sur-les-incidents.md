# 2026-09-24 — Incidents : photo obligatoire

#814 a livré les photos d'incident en invoquant le dossier assurance et la preuve sur le terrain, mais les a laissées **facultatives et postérieures** à la création : on déclarait l'incident, on atterrissait sur l'onglet, et la galerie de la page de détail attendait qu'on revienne. Personne ne revient. Un incident sans photo ne sert à rien pour un dossier assurance — exactement ce que la fonctionnalité existait pour permettre.

- **Règle.** Au moins **une** photo par incident. Les bornes ne bougent pas : `MAX_FILES_PER_BATCH = 20`, `PHOTO_MAX_SIZE_MB = 10` (`shared/constants/media.ts`).

- **Deux temps, pas de multipart.** `POST /boats/:boatId/incidents` reste un POST **JSON**. Le basculer en multipart aurait renvoyé les six FK de cible en chaînes vides au lieu de `number | null`, imposé une entrée dans `LARGE_UPLOAD_ROUTES` (dont la garde `mediaBatchKindFor` exige un suffixe `/photos` ou `/documents`), et fait entrer des `File` dans la file hors-ligne, que `QueuedAction.payload` ne transporte pas (#621). Le formulaire crée donc l'incident, puis poste les photos sur `…/incidents/:incidentId/photos` — route déjà validée, déjà plafonnée.

- **L'id de l'incident créé.** `BoatIncidentsController.store` flashe `createdResourceType = create-incident` et `createdResourceId`, le canal déjà relayé par `InertiaMiddleware.share()` et déjà utilisé par les inspections, les journaux et les pleins. La redirection ne change pas. **Neutre pour `drainQueue`** : ces clés ne sont lues que si l'action porte un `tempId`, ce que les incidents ne font pas.

- **Hors-ligne : exempté.** Sans réseau, l'incident part en file **sans** photo, avec un message qui dit de l'ajouter au retour. Mieux vaut un incident déclaré sur un ponton qu'une saisie perdue.

- **Clôture : le filet.** `BoatIncidentService.updateForBoat` refuse `status: 'closed'` sur un incident sans photo (`BoatIncidentValidationError('photoRequiredToClose')` → `flash.incidents.photoRequiredToClose` + `rejectedType`). C'est cette règle qui rattrape les chemins incapables de porter une photo. Elle ne porte que sur la **transition** : un incident clôturé avant l'obligation reste éditable, sinon tout l'historique devenait ingérable.

- **Copilote.** `report_incident` continue de créer l'incident — il n'a aucun fichier à joindre — mais sa confirmation réclame désormais la photo, et le verrou de clôture la rend obligatoire avant de refermer le dossier.

- **UI.** Nouveau `MediaPendingPhotoPicker.vue` : un sélecteur de fichiers **en attente**, qui ne poste rien et remonte des `File` à son parent — ce qu'aucune brique existante ne savait faire (`usePhotoUpload`, `MediaPhotoGallery` et `DocumentAddModal` postent tous eux-mêmes). Pré-validation extension/taille/nombre dès la sélection, entrée caméra séparée (#485), aperçus révoqués. Toute la soumission passe dans `use_incident_photo_flow.ts`, avec un `createdIncidentId` mémorisé : une resoumission après un envoi raté rejoue la seconde étape, jamais la première. `BoatIncidentForm.vue` repasse sous les 250 lignes.

- **Badges.** « Photo manquante » sur `BoatIncidentCard`, `IncidentRow` et `IncidentCard` — d'où `photosCount` sur `FleetIncidentRow`, posé par `getFleetIncidents` avec le même helper groupé que `listForBoat` (`attachIncidentPhotosCount`, extraite de la méthode privée de `BoatIncidentService`). Incitation sur `IncidentShowTabPhotos`. Le formulaire d'édition retire l'option « clôturé » quand `photosCount === 0` et renvoie vers la page de détail (`BaseSelect` n'a pas de `disabled` par option).

- **Compteur exact sur la page de détail.** `toIncident(i, photosCount?)` : `show()` a déjà ses photos en main, sans quoi il rendait `photosCount: 0` et masquait à tort l'option de clôture d'un incident qui en avait.

- **i18n.** `incidents.json` : `form.photos`, `form.photoHint`, `form.photoRequired`, `form.photoOfflineNotice`, `form.photoUploading`, `form.photoUploadFailed`, `form.closedNeedsPhoto`, `form.goToIncident`, `missingPhoto`, `show.missingPhotoHint`. `media.json` : `photos.selected/remove/browse/dropzone/formats/rejected*`. `flash.json` : `incidents.photoRequiredToClose`, et `assistant.actions.report_incident` reformulé. Les deux locales.

- **Tests.** Vitest : `boat_incident_form.spec.ts` refondu (enchaînement des deux temps, refus sans photo, flash perdu, pas de doublon à la resoumission, exemption hors-ligne, verrou de clôture dans les trois cas) et nouveau `media_pending_photo_picker.spec.ts`. Japa functional : refus de clôture et son `rejectedType`, un document ne vaut pas une photo, un incident déjà clos reste modifiable ; `offline_replay_markers.spec.ts` couvre l'id rendu. Japa integration : `photoRequiredToClose` au niveau service, le test canonique. Helper `tests/support/incident_photos.ts` — la fabrique garde volontairement son défaut **sans** photo, pour que le chemin « photo manquante » reste testable.

- **Docs.** `docs/domain/incidents.md` (section « Photo obligatoire »), `docs/domain/offline-queue.md` (pourquoi `create-incident` renvoie son id, et pourquoi la photo est exemptée), fiche `incidents` de `product_knowledge.ts`.
