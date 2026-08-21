# 2026-06-01 — États d'usure et documents sur les pièces moteur

**Nouvelles fonctionnalités**

- Champ `wear_state` ajouté sur `boat_engine_parts` : valeurs `new | good | worn | to_replace | damaged`, optionnel (défaut `good`)
- Les pièces moteur peuvent désormais avoir des documents attachés (PDF, CSV, XLSX, DOCX) via le système Media polymorphique (`entityType: 'boat_engine_part'`)
- Nouvelle page dédiée `/boats/:boatId/engines/:engineId/parts/:partId` avec deux onglets : **Informations** et **Documents**
- Bouton « Voir » dans le tableau des pièces de la page moteur → redirige vers la page pièce
- Colonne « État d'usure » (badge coloré) dans le tableau des pièces
- Sélecteur d'état d'usure dans le modal d'ajout/modification de pièce
- Clés i18n ajoutées dans `equipment.wearState` (EN + FR) et `boats.engineShow.parts.wearState/view` + `boats.engineShow.partShow` (EN + FR)

**Routes ajoutées**

- `GET  /boats/:boatId/engines/:engineId/parts/:partId` → `BoatEnginePartsController.show`
- `POST /boats/:boatId/engines/:engineId/parts/:partId/documents` → `storeDocument`
- `DELETE /boats/:boatId/engines/:engineId/parts/:partId/media/:mediaId` → `destroyMedia`
- `GET  /boats/:boatId/engines/:engineId/parts/:partId/media/:mediaId/download` → `downloadMedia`

**Dossier Cloudinary** : `organizations/{slug}/boats/{id}/engines/{id}/parts/{id}/documents`
