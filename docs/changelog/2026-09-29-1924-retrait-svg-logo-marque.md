# 2026-09-29 — Retrait du SVG des logos de marque (#785)

Le validateur du logo de marque acceptait `svg` aux côtés des bitmaps. Un SVG
est un document XML actif (script, gestionnaires d'événements, références
externes) ; seule l'extension était contrôlée.

- **Décision.** Retirer `svg` de `uploadLogoValidator` plutôt que d'introduire
  un assainisseur. Le sélecteur UI refusait déjà le SVG
  (`accept=".jpg,.jpeg,.png,.webp"`). PDFKit n'embarque que des rasters
  (`doc.image`). Les e-mails et l'UI chargent le logo en `<img>` (mode
  restreint navigateur).
- **Correctif.** `extnames` limité à JPG/JPEG/PNG/WebP ; commentaire dans le
  validateur pour ne pas réintroduire le SVG ni inliner le logo sans
  assainisseur ; `logoHint` FR/EN alignés.
- **Logos existants.** Les SVG déjà stockés sur Cloudinary ne sont pas purgés :
  ils restent sûrs tant qu'ils ne sont pas inlinés (`v-html`) ni servis depuis
  notre origine.
- **Tests.** `tests/functional/settings/branding_logo.spec.ts` — upload d'un
  SVG porteur de `<script>` → 422, `logoUrl` reste `null`.
