# Kit PDF partagé : thème, document, en-tête et pied communs

**Date** : 2026-09-17 — plan de refactorisation TDD, vague 2.3.

## Problème

Les cinq générateurs PDF (facture, contrat de location, historique
d'entretien, rôle d'équipage, carnet d'entretien) redéclaraient chacun la
palette (`NAVY`, `CORAL`, `GREY_*`, `WHITE`, `#f8f8f8`), la géométrie A4
(`PAGE_W`, `PAGE_H`, `MARGIN`, `CONTENT_W`), la création du document PDFKit
avec collecte du flux, et — pour la facture et le contrat — le même en-tête
de marque (bandeau, logo en marque blanche, nom, titre, date), le même pied
paginé et le même filet.

## Changement — rendu inchangé

- `app/services/pdf/theme.ts` : `PDF_COLORS` (palette, fond de ligne
  alternée, couleur de bandeau par défaut) et `PDF_PAGE` (A4, marges,
  largeur utile). Chaque service en tire les alias qu'il utilise.
- `app/services/pdf/document.ts` :
  - `createPdfDocument({ bufferPages? })` → `{ doc, finish }` : document aux
    marges du thème, flux collecté, `finish()` clôt et rend le `Buffer` ;
  - `resolveBranding(org)` → `{ canWhiteLabel, primaryColor, displayName, logoUrl }`
    (règle marque blanche du plan Entreprise, une seule fois) ;
  - `renderBrandedHeader(doc, { branding, title, generatedOn, locale })` ;
  - `renderPagedFooter(doc, (page, total) => texte)` ;
  - `divider(doc, gap)`.
- Les cinq services adoptent le kit ; facture et contrat perdent leurs
  `#renderHeader`, `#renderFooter` et `#divider`, le rôle d'équipage son
  `#renderFooter`. 1 768 → 1 540 lignes (−297 / +103).
- Reporté : le découpage de `maintenance_log_pdf_service.ts` (832 lignes)
  en primitives et sections — il n'adopte ici que le thème et le document,
  pour garder cette PR mécanique et relisible.

## Tests

- **Caractérisation avant** :
  `tests/integration/services/pdf_render_snapshot.spec.ts` espionne les
  méthodes de dessin de PDFKit (`text`, `fillColor`, `rect`, `font`,
  `image`, `switchToPage`…) et fige, pour chaque générateur et chaque locale,
  la séquence exacte des appels et le nom de fichier, avec des entrées fixes
  (`tests/integration/services/__fixtures__/pdf/*.json`, douze fixtures ;
  date du jour et identifiants neutralisés, déterminisme vérifié sur trois
  exécutions). Le refactor produit un diff nul.
  Régénération volontaire : `UPDATE_PDF_FIXTURES=1`.
- `tests/unit/services/pdf_document.spec.ts` (7 tests) : flux collecté et
  `%PDF` rendu, règles de marque (plan Pro vs Entreprise, repli sur le nom et
  la couleur par défaut), en-tête (nom, titre, date), pied sur chaque page
  avec numérotation, filet sur la largeur utile.
- Suites `invoices/*`, `boats/rental_contracts`, `boats/crew_role_pdf`,
  `maintenance/*` inchangées ; `pnpm lint`, `tsc -b`, `node ace build`,
  suite backend complète. Vérification visuelle possible via
  `dev/pdf_previews_controller`.
