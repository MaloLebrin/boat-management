# Cloudinary — Gestion des médias

## Vue d'ensemble

Les photos et documents sont stockés sur Cloudinary avec une arborescence de dossiers qui reflète la hiérarchie des entités. La table `media` en base de données conserve les métadonnées (URL, type, taille…) et sert de source de vérité pour l'affichage.

---

## Configuration

### Variables d'environnement

```
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Fichiers

| Fichier                              | Rôle                                                 |
| ------------------------------------ | ---------------------------------------------------- |
| `config/cloudinary.ts`               | Configure le SDK Cloudinary v2 et exporte l'instance |
| `app/services/cloudinary_service.ts` | Service bas niveau : upload, delete, dossiers        |

---

## Arborescence Cloudinary

```
{env}/organizations/{org-slug}/
  boats/{boat-id}/
    photos/
    documents/
    engines/{engine-id}/
      photos/
      documents/
    sails/{sail-id}/
      photos/
      documents/
    rig/
      photos/
      documents/
    maintenance/{event-id}/
      photos/
      documents/
  users/{user-id}/
    avatar/
```

Les chemins sont générés par `CloudinaryFolders` (exporté depuis `cloudinary_service.ts`). Le préfixe `dev/` ou `production/` est ajouté automatiquement selon `app.inProduction`.

```ts
import { CloudinaryFolders } from '#services/cloudinary_service'

const folder = CloudinaryFolders.boatPhotos(org.slug, boat.id)
// dev     → "dev/organizations/my-org/boats/42/photos"
// prod    → "production/organizations/my-org/boats/42/photos"
```

---

## Table `media`

Migration : `database/migrations/1776763000000_create_media_table.ts`

Colonnes principales :

| Colonne                | Type         | Description                                                                                      |
| ---------------------- | ------------ | ------------------------------------------------------------------------------------------------ |
| `entity_type`          | string       | Type d'entité : `boat`, `boat_engine`, `boat_sail`, `boat_rig`, `boat_maintenance_event`, `user` |
| `entity_id`            | int          | ID de l'entité                                                                                   |
| `kind`                 | string       | `photo` ou `document`                                                                            |
| `cloudinary_public_id` | string       | Public ID Cloudinary (nécessaire pour la suppression)                                            |
| `secure_url`           | string       | URL HTTPS du fichier                                                                             |
| `original_filename`    | string       | Nom de fichier d'origine                                                                         |
| `format`               | string       | Extension (`jpg`, `pdf`…)                                                                        |
| `bytes`                | int          | Taille en octets                                                                                 |
| `width` / `height`     | int\|null    | Dimensions (images uniquement)                                                                   |
| `position`             | int          | Ordre d'affichage (défaut 0)                                                                     |
| `caption`              | string\|null | Légende facultative                                                                              |
| `uploaded_by_id`       | FK → users   | Auteur de l'upload (SET NULL à la suppression)                                                   |

Index : `(entity_type, entity_id)`.

Les constantes de types sont dans `shared/constants/media.ts`.

---

## MediaService

`app/services/media_service.ts` — orchestre Cloudinary + DB.

```ts
const mediaService = new MediaService()

// Uploader un fichier
await mediaService.upload(user, file, {
  entityType: 'boat',
  entityId: boat.id,
  kind: 'photo',
  folder: CloudinaryFolders.boatPhotos(org.slug, boat.id),
  caption: 'Coque tribord',
})

// Lister les médias d'une entité
const photos = await mediaService.listForEntity('boat', boat.id)

// Supprimer un média (Cloudinary + DB)
await mediaService.deleteById(mediaId)

// Supprimer tous les médias d'une entité (ex: suppression d'un bateau)
await mediaService.deleteAllForEntity('boat', boat.id, CloudinaryFolders.boat(org.slug, boat.id))

// Remplacer un avatar utilisateur (atomique)
await mediaService.replaceAvatar(user, file, CloudinaryFolders.userAvatar(org.slug, user.id))
```

---

## Endpoints HTTP (bateaux)

Définis dans `start/routes/boats.ts`, gérés par `app/controllers/boat_media_controller.ts`.

| Méthode  | URL                             | Action             | Auth                 |
| -------- | ------------------------------- | ------------------ | -------------------- |
| `POST`   | `/boats/:boatId/photos`         | Upload photo       | `canManageEquipment` |
| `POST`   | `/boats/:boatId/documents`      | Upload document    | `canManageEquipment` |
| `DELETE` | `/boats/:boatId/media/:mediaId` | Supprimer un média | `canManageEquipment` |

### Limites de fichiers (validators dans `app/validators/media.ts`)

| Type     | Taille max | Formats acceptés                |
| -------- | ---------- | ------------------------------- |
| Photo    | 10 Mo      | jpg, jpeg, png, heic, webp, gif |
| Document | 20 Mo      | pdf, csv, xlsx, docx, doc       |

---

## Frontend

### Composants

| Composant                                               | Usage                                                  |
| ------------------------------------------------------- | ------------------------------------------------------ |
| `components/boats/show/BoatPhotoGallery.vue`            | Grille de photos avec upload instantané                |
| `components/boats/show/tabs/BoatShowTabDocuments.vue`   | Liste des documents avec téléchargement et suppression |
| `components/boats/show/modals/BoatDocumentAddModal.vue` | Modale d'ajout de document (drag-and-drop)             |

### Upload de fichiers

Les uploads utilisent `useForm` de `@inertiajs/vue3` avec `forceFormData: true` — le composant `<Form>` de `@adonisjs/inertia/vue` ne prend pas en charge les fichiers.

```ts
const form = useForm({ file: null as File | null, caption: '' })

form.post(`/boats/${boatId}/photos`, {
  forceFormData: true,
  onSuccess: () => form.reset(),
})
```

### Type `MediaRow`

Défini dans `inertia/types/boat_show.ts` et inclus dans `BoatShowDetail.media`.
