# Avis natif partagé : `notify()` et `utils/native_dialog`

**Date** : 2026-09-17 — deuxième des observations relevées en marge du plan de
refactorisation TDD (vague 3.5).

## Problème

Trois écrans des ports refusent une suppression avant même de la proposer — une
place est encore occupée — et l'annonçaient par un `alert()` **nu** :
`MouillageCard`, `PontoonCard` et `pages/ports/show.vue`. C'est exactement le
problème que #675 a réglé pour `confirm()` : hors navigateur (SSR), l'appel lève,
et disperser les dialogues natifs rend impossible leur passage groupé à un
composant d'UI.

## Changement — comportement inchangé

- `inertia/utils/confirm_delete.ts` devient **`inertia/utils/native_dialog.ts`**
  (commit séparé, purement mécanique). Le module ne portait déjà plus que la
  suppression : `confirmed()` sert une garde devant un `patch` (équipage d'une
  sortie), et l'avis des ports le rejoint. Les dix-sept appelants ne voient que
  le chemin d'import changer ; `tests/inertia/confirm_delete.spec.ts` et
  `confirm_dialog_guard.spec.ts` suivent le renommage.
- Nouveau `notify(message)` : la même garde SSR que `confirmed()`, pour les refus
  qui s'annoncent. Hors navigateur, l'avis est perdu sans lever — il informe, il
  ne garde rien ; le refus reste porté par l'appelant (`return` après l'appel).
- Les trois écrans appellent `notify(t('…'))` au lieu d'`alert(t('…'))`. Aucune
  autre ligne ne change : la garde, son message et son `return` sont les mêmes.

## Tests

- **La caractérisation existait déjà** : `confirm_before_delete.spec.ts` (2
  tests, #675) fige l'avis des deux cartes de port — « un ponton occupé alerte,
  sans même demander confirmation » — et `ports_show_delete.spec.ts` (3 tests,
  #398) celui de la page, dont le cas où toutes les places sont libres et la
  modale s'ouvre. Ces cinq tests sont inchangés et verts après migration : c'est
  la preuve que le comportement n'a pas bougé.
- `tests/inertia/native_dialog.spec.ts` : 2 tests de `notify()` écrits avant le
  helper (message transmis, silencieux et sans exception hors navigateur).
- `tests/inertia/native_dialog_guard.spec.ts` : la garde passe de 3 à 5 règles —
  ni `window.alert` ni `alert(t(…))` dans `pages`, `components`, `composables`,
  et le helper porte les deux dialogues. La règle `alert(t(…))` désignait les
  trois écrans avant migration (vérifié sur `HEAD`).
- Suite Vitest complète (2453 tests), `pnpm lint` et `pnpm typecheck`
  (197 erreurs préexistantes, aucune nouvelle) verts.
