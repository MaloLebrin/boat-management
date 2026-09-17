# 2026-09-18 — Une seule mesure des octets, avec ses unités traduites

**Date** : 2026-09-18 — reste annoncé par le changelog des documents génériques
(« la jauge de stockage de la facturation garde son `formatBytes` propre —
unités traduites, Go »).

## Problème

Deux calculs de taille cohabitaient, et la raison invoquée pour ne pas les
réunir était la bonne : ils ne rendent pas la même chose.

- `inertia/utils/format_bytes.ts` (listes et modale de documents) : palier
  octet, une décimale dès le Ko, pas de palier Go — et **unités en dur, en
  français**. Un utilisateur anglophone lisait « 1.5 Ko » et « 3.0 Mo », alors
  que `settings.json` portait déjà `KB`/`MB`/`GB` pour la jauge.
- `SettingsBillingUsageGauge.vue` : arrondi à l'entier, palier Go, unités
  traduites — mais recalculées dans le composant.

La duplication n'était donc pas supprimable par réutilisation : la cause était
que le helper partagé figeait sa langue et ignorait le Go.

## Correctif

- `inertia/utils/format_bytes.ts` expose deux rendus purs qui reçoivent leurs
  libellés : `renderFileSize` (palier octet, une décimale) et
  `renderStorageSize` (arrondi, palier Go).
- `inertia/composables/use_byte_format.ts` (nouveau) leur fournit les unités de
  l'app : `useByteFormat()` → `formatFileSize`, `formatStorageSize`. Même forme
  que `useNumberFormat()` au-dessus de `shared/helpers/number_format`, et même
  principe de catalogue que les dates (#461) : un écran choisit un style, il
  n'écrit pas son calcul.
- Unités dans `common.json` des deux locales : `units.bytes`, `units.kb`,
  `units.mb`, `units.gb`. Les trois clés `settings.billing.usage.{kb,mb,gb}`,
  devenues mortes, sont retirées.
- `DocumentAddModal`, `DocumentList` et `SettingsBillingUsageGauge` n'ont plus
  de calcul propre.

## Comportement changé (un seul, et c'est une correction)

En **anglais**, la taille d'un document s'affiche désormais `1.5 KB` / `3.0 MB`
au lieu de `1.5 Ko` / `3.0 Mo`. En français, rien ne change, au caractère près :
les paliers, les arrondis et les décimales des deux styles sont ceux des deux
implémentations d'origine, et la jauge est inchangée dans les deux langues.

## Tests

- `tests/inertia/byte_format.spec.ts` (nouveau, 8 tests) remplace
  `format_bytes.spec.ts` (3) : les deux styles, leurs paliers et leurs
  frontières — `1023 o`, `0 Ko` pour un stockage quasi vide, `3072.0 Mo` pour
  un fichier de 3 Go, `1.4 Go` pour la jauge — et les unités reçues de
  l'appelant.
- `settings_billing_usage_gauge.spec.ts` : le test de stockage assert
  maintenant la sortie (`5 MB`, `100 MB`) et non plus le nom de la clé ; un
  test de palier Go est ajouté.
- `document_list.spec.ts` et `document_add_modal.spec.ts` passent leurs
  libellés d'unités par `pageProps` et attendent l'anglais — ce sont les deux
  specs qui affichaient le bug sans le voir.
