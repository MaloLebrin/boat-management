# 2026-09-17 — `confirmDelete` reprend `deleteVisit` : une seule visite de suppression

Suivi annoncé dans l'entrée de la veille (#680) et laissé hors de cette PR pour ne pas entrer
en conflit avec le renommage de #679. Les deux étant fusionnées, il tient en trois lignes.

- **Contexte.** `deleteVisit`, extrait en #680, existe pour porter au même endroit le `if` qui
  décide du nombre d'arguments de la visite : sans options, `router.delete` part à un seul
  argument — pas avec un `undefined` explicite, que les specs des écrans sans options refusent.
  Deux des trois porteurs de confirmation l'utilisaient déjà (`useRowDeleteConfirmation`,
  `useDeleteConfirmation`) ; le troisième, la garde native `utils/native_dialog.confirmDelete`,
  gardait sa copie. Le commentaire de `delete_visit.ts` le nommait pourtant comme appelant.
- **Correctif.** `confirmDelete` se réduit à sa raison d'être — confirmer, puis déléguer :
  `if (!confirmed(message)) return` suivi de `deleteVisit(url, options)`. Le module perd du
  même coup son import de `router` et sa déclaration locale de `DeleteVisitOptions`, désormais
  importée de `~/utils/delete_visit`.
- **Comportement inchangé.** La signature publique de `confirmDelete` ne bouge pas, et la
  garde SSR reste où elle était : hors navigateur, `confirmed()` rend `false` et aucune
  suppression ne part.
- **Tests.** `tests/inertia/delete_visit.spec.ts` (3 tests) caractérise `deleteVisit` sur
  l'unité elle-même, avant la migration et verte sur le code d'origine — il n'était jusqu'ici
  testé qu'indirectement, à travers les deux composables. Les 4 tests de `confirmDelete`
  (`native_dialog.spec.ts`, #675), les 5 tests des refus de ports et les 14 tests des deux
  composables sont **inchangés** et verts.
