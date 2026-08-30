# 2026-08-30 — La sauvegarde d'un moteur ramène sur sa fiche moteur (#599)

Éditer un moteur faisait perdre sa place : depuis la fiche moteur, le bouton « Modifier » ouvrait le formulaire, et la sauvegarde renvoyait sur la fiche **bateau** au lieu de la fiche moteur qu'on venait de quitter. Il fallait rouvrir le moteur pour constater sa modification — d'autant plus pénible que trois des quatre points d'entrée du formulaire sont des écrans moteur (`engine_show.vue`, l'onglet « Caractéristiques », la page pièces détachées). La sauvegarde revient désormais sur la fiche du moteur édité.

- **Contrôleur (`BoatEquipmentController#updateEngine`).** La redirection de succès passe de `/boats/:boatId` à `/boats/:boatId/engines/:engineId`. L'identifiant est extrait une fois dans `engineId` et réutilisé par l'appel au service, au lieu d'un `Number(params.engineId)` inline.
- **Chemin d'erreur inchangé.** Un `BoatEquipmentNotFoundError` (moteur inexistant ou hors du bateau) continue de renvoyer sur la fiche bateau avec le flash `flash.engine.notFound` : la fiche moteur visée n'existe pas, on ne peut pas y atterrir.
- **Lien « Annuler » (`inertia/pages/boats/engine_edit.vue`).** Il pointait aussi vers la fiche bateau — il ramène maintenant sur la fiche moteur, pour que valider et annuler mènent au même endroit.
- **Création inchangée.** `storeEngine` continue de rediriger vers la fiche bateau : l'ajout se fait depuis une modale de cette page (`BoatEquipmentAddModal`, `BoatShowEnginesCard`) et l'on y enchaîne souvent plusieurs équipements. L'issue vise le retour (« revient ») après édition.
- **Aucune clé i18n nouvelle, aucun changement de route ni de modèle.**
- **Tests.** Nouveau `tests/functional/boats/engine_update_redirect.spec.ts` : redirection vers la fiche moteur après un `PUT` valide (avec le flash de succès), repli sur la fiche bateau pour un moteur inconnu, et non-régression du `POST` de création qui reste sur la fiche bateau. Suite `boats/*` au vert (446 tests).
