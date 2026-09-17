# Édition inline d'une ligne : composable `useInlineRowEdit`

**Date** : 2026-09-17 — plan de refactorisation TDD, vague 3.5 (cible 3/3 des
confirmations et éditions recopiées).

## Problème

Les deux listes de budget — écritures et séjours au port — tenaient chacune la
même mécanique d'édition inline : `editingId`, un `useForm` rempli depuis la
ligne, une annulation qui referme et remet à zéro, un envoi qui referme **au
seul succès**. Quatorze lignes identiques de part et d'autre, aux champs près.

Périmètre réel, mesuré avant d'extraire : ces **deux** écrans seulement. Les
quatorze autres réfs `editing*` de l'app ne désignent qu'une ligne ouverte dans
une modale ou un formulaire enfant — pas de cycle partagé, rien à mutualiser.
C'est donc la plus mince des trois cibles de cette série ; elle réduit la
duplication sans réduire beaucoup les lignes.

## Changement — comportement inchangé

- `inertia/composables/use_inline_row_edit.ts` :
  `useInlineRowEdit({ form, fill, url })` →
  `{ editingId, isEditing, start, cancel, submit }`.
  - le formulaire reste celui du composant : lui seul connaît ses champs et la
    façon de les remplir depuis une ligne (`fill`), `null` du serveur compris ;
  - ce qui est partagé, c'est le va-et-vient autour : quelle ligne est ouverte,
    la remise à zéro à l'annulation, et la fermeture **au seul succès** — pas
    avant, sinon une erreur de validation referme la ligne et perd la saisie ;
  - `InlineEditForm<F>` décrit ce que le cycle attend d'un `useForm()` : ses
    champs en `string`, `reset` et `patch`.
- Les deux listes adoptent le composable (−58 / +37 lignes) ; `ref` quitte
  leurs imports Vue.

## Tests

- **Caractérisation avant** : `tests/inertia/budget_inline_edit.spec.ts`
  (6 tests, verts sur le code d'origine puis après migration) : chargement de
  la ligne dans le formulaire (dont les `null` devenus chaîne vide),
  annulation qui referme et remet à zéro, envoi sur l'URL exacte avec
  `preserveScroll`, ligne encore ouverte pendant la requête, refermée au
  succès. Les specs existantes des deux listes ne couvraient que la présence
  des boutons et les suggestions de ports.
- `tests/inertia/use_inline_row_edit.spec.ts` (7 tests, écrits avant le
  composable) : ligne initiale, `start` et rechargement sur une autre ligne,
  `cancel`, `submit` qui laisse la ligne ouverte, fermeture au seul succès,
  `isEditing`.
- Suite Vitest complète (2425 tests), `pnpm lint` et `pnpm typecheck`
  (197 erreurs préexistantes, aucune nouvelle) verts.
