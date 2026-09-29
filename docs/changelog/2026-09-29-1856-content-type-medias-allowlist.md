# 2026-09-29 — Content-Type des médias déduit d'une allowlist (#784)

Les téléchargements de média recopient le `Content-Type` annoncé par Cloudinary. `Content-Disposition: attachment` et `nosniff` empêchent aujourd'hui un XSS stocké, mais un aperçu `inline` rendrait cet en-tête externe décisif — et l'upload ne contrôle que l'extension.

- **Correctif.** `contentTypeForMediaFormat` (`shared/constants/media.ts`) associe chaque extension déjà acceptée (`PHOTO_EXTNAMES`, `DOCUMENT_EXTNAMES`, dérivés de la même table) à un type sûr. Un format inconnu (`html`, `svg`, …) sort en `application/octet-stream`. `CloudinaryService.downloadAsBuffer` ne renvoie plus que le tampon. Les cinq routes qui relayaient le type (bateau, moteur, pièce moteur, document client, document signé d'un contrat) posent le type de l'allowlist, toujours en `attachment`.
- **Tests.** `tests/unit/helpers/media_content_type.spec.ts` fige la table. `tests/functional/boats/media_download.spec.ts` sert un tampon HTML avec `format=pdf` (type `application/pdf`) et `format=html` (`application/octet-stream`).
