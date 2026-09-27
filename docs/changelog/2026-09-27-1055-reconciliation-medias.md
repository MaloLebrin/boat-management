# 2026-09-27 — Réconciliation des médias orphelins et du quota de stockage

La table `media` est polymorphe (`entity_type`, `entity_id`) et ne peut porter aucune clé étrangère : une entité supprimée ne cascade pas sur ses médias. Le nettoyage est fait à la main par les services, sans transaction avec Cloudinary, et certaines suppressions l'oublient. Un bateau supprimé emporte par exemple en cascade ses réservations, donc ses inspections et ses contrats de location, sans que leurs médias soient nettoyés. Rien ne comparait les deux côtés : les fichiers restaient facturés sur Cloudinary et `organizations.storage_used_bytes` dérivait, bloquant un utilisateur à tort ou le laissant dépasser son plan (#859).

- **`MediaReconciliationService.reconcile({ dryRun })`** :
  - supprime sur Cloudinary puis en base les médias dont l'entité n'existe plus, pour chacun des 14 `entity_type` ;
  - un échec Cloudinary garde la ligne, que la passe suivante réessaie ;
  - un `entity_type` inconnu est signalé, jamais supprimé ;
  - recalcule `storage_used_bytes` de chaque organisation depuis la somme des `media.bytes` (organisation résolue via le bateau pour les équipements, avatars exclus comme à l'upload). L'écriture est conditionnée à la valeur lue, pour ne pas écraser un upload concurrent.
- **Job `ReconcileMedia`** (queue `media`) planifié le dimanche à 03:30, heure de Paris (`weekly-reconcile-media`).
- **Commande `node ace media:reconcile [--dry-run]`** : `--dry-run` affiche les orphelins par type et les écarts de quota par organisation sans rien modifier.
- **Hors périmètre, à traiter plus tard** :
  - les fichiers Cloudinary sans ligne `media`, qui demandent de lister les ressources par préfixe ;
  - la suppression en deux temps (`pending_deletion`) ;
  - l'ajout d'`organization_id` sur `media`.
- **Tests** :
  - `tests/integration/services/media_reconciliation_service.spec.ts` : orphelins supprimés, entités imbriquées gardées, échec Cloudinary rattrapé à la passe suivante, `dry-run` sans effet, quota recalculé, organisation vide remise à zéro ;
  - `tests/integration/jobs/reconcile_media.spec.ts` : le job et la commande dans les deux modes.
  - Le fake Cloudinary accepte `failDeleteFor`.
- **Docs** : `docs/domain/equipment-media.md` (section « Réconciliation des orphelins ») et `docs/dev/cloudinary.md`.
