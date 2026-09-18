# 2026-09-18 — Les parcours e2e que seul un navigateur peut prouver (#700)

Dernière des 15 issues de couverture de l'épic #686.

## Ce qui était déjà vrai, et que l'issue disait autrement

**La suite comptait 32 tests, pas 41.** Le tableau de #700 somme lui-même à 32
(7 + 4 + 5 + 3 + 2 + 4 + 4 + 1 + 2) ; c'est sa phrase d'introduction qui était fausse.

Sur les cinq parcours demandés, la mesure (trois sondes, avant d'écrire une ligne) donne des
valeurs très inégales :

| Parcours                   | Déjà prouvé ailleurs                                                | Ce que le navigateur ajoute          |
| -------------------------- | ------------------------------------------------------------------- | ------------------------------------ |
| ② hors-ligne               | ≈39 cas Vitest (`fake-indexeddb`), protocole serveur (#696)         | **la couture, improuvable ailleurs** |
| ④ simulateur → inscription | le POST `/simulator/session`, l'inscription, chaque étape en Vitest | **un trou franc**                    |
| ③ plan de port             | positions, bornes, gating (#695, 8 cas)                             | le geste et sa persistance           |
| ① location                 | massif : contrat, signature, EDL, facture, gating, IDOR, policies   | la navigabilité seule                |
| ⑤ invitation               | saturé : 5 accept, 8 decline, 4 envoi, 12 gestion, + 2 cas browser  | le raccord                           |

D'où le périmètre retenu : ② ③ ④ en entier, ① réduit aux trois maillons que le fonctionnel ne
peut pas voir, ⑤ en un seul cas de boucle.

## Le fait décisif : le conflit hors-ligne n'est mesurable que dans un navigateur

`use_offline_queue` détecte un conflit en relisant un **flash Inertia** (`conflictData` +
`conflictType`) posé sur une 302. La suite `functional` tourne avec `SESSION_DRIVER=memory` : le
flash ne survit pas d'une requête à l'autre — c'est écrit en tête de
`tests/unit/middleware/inertia_offline_protocol.spec.ts`, qui se rabat pour cette raison sur un
test unitaire du middleware. Dans un vrai navigateur, le cookie porte le flash.

Les deux moitiés du protocole étaient prouvées séparément depuis #696. **La couture ne l'était
nulle part**, et `tests/browser/` ne contenait aucune occurrence de `setOffline`.

## Le deuxième trou : l'inscription depuis le simulateur

`app/controllers/new_account_controller.ts` — s'il reste un `simulatorBoat` en session au moment de
l'inscription, le bateau est créé et l'utilisateur atterrit sur `/boats/:id` au lieu de
`/dashboard`. `grep -rn "simulatorBoat" tests/` ne renvoyait que le POST amont : **ce bloc n'était
exercé par aucun test**, à aucun niveau.

## Fichiers ajoutés

| Fichier                                     | Cas | Ce qu'il fixe                                                                                        |
| ------------------------------------------- | --- | ---------------------------------------------------------------------------------------------------- |
| `tests/browser/offline_queue.spec.ts`       | 6   | file, rejeu par l'événement `online`, rejeu par le bouton, conflit et ses deux sorties, bac à échecs |
| `tests/browser/marina_canvas.spec.ts`       | 3   | drag persistant, contre-exemple hors mode édition, affectation depuis le plan                        |
| `tests/browser/rental_navigation.spec.ts`   | 3   | navigabilité vers le contrat, `<input type="file">` caché, téléchargement réel                       |
| `tests/browser/simulator_to_signup.spec.ts` | 3   | stepper variable, chaîne des auto-avances, atterrissage sur le bateau pré-créé                       |
| `tests/browser/invitation_flow.spec.ts`     | 1   | la boucle complète et la bascule d'organisation                                                      |

`tests/browser/helpers.ts` ré-exporte `createCharterAdminUser` (demandé par #700).

## Changement de production — déclaré

**Quatre lignes, trois attributs, strictement additifs.** C'est la première entorse à la règle
« diff de production vide » tenue sur les quatorze issues précédentes de l'épic, et elle est
assumée : sans elle le parcours du plan de port n'est pas déterministe.

| Fichier                                             | Attribut                                                    |
| --------------------------------------------------- | ----------------------------------------------------------- |
| `inertia/components/ports/show/MarinaPontoon.vue`   | `data-testid="marina-pontoon-{id}"` et `marina-spot-{id}`   |
| `inertia/components/ports/show/MarinaMouillage.vue` | `data-testid="marina-mouillage-{id}"` et `marina-spot-{id}` |

Sans eux, un ponton ne s'atteint que par son `<text>` de nom remonté en `xpath=..`, et les noms de
places sont tronqués à 6 caractères dans le rendu (3 pour les mouillages) — non uniques par
construction.

## La limite tactile : tranchée

#700 demandait de décider. **On vit avec.** `browserContext` est créé sans options par
`@japa/browser-client`, donc `hasTouch`/`isMobile` ne peuvent pas être passés. Ouvrir un second
harnais Playwright dans la même suite, avec son propre `chromium.launch()`, son cycle de vie et son
authentification, se paierait en maintenance permanente pour un ou deux cas. Ce qui n'est donc pas
mesuré est écrit noir sur blanc dans `docs/dev/testing.md` : les variantes `pointer-coarse:` ne
s'activent jamais et les cibles tactiles (#494) ne sont pas vérifiées à la taille du doigt. Les
breakpoints CSS, eux, le sont.

## Ce que la mesure a appris en chemin

- **Un test qui prouve qu'il ne s'est rien passé ne peut pas lire la base.** Le contre-exemple du
  mode lecture passait **même la garde `editMode` retirée** : le PATCH mettait une seconde à
  arriver, l'assertion courait avant. Il observe désormais les requêtes sortantes. C'est le pendant
  navigateur de la règle du témoin en base de #697.
- **`locator.dragTo()` ne marche pas ici** : il émet des événements souris, `MarinaCanvas` écoute
  des événements pointeur. Il faut `page.mouse`, avec au moins un pas intermédiaire.
- **La garde `editMode` protège aussi le clic sur une place** : sans elle, le `pointerdown` démarre
  un drag et capture le pointeur, donc l'affectation devient inatteignable.
- **Deux affordances mènent au même formulaire de journal de bord** — l'encart « Underway » de
  l'en-tête et la liste de l'onglet — avec les mêmes libellés et les mêmes `id`.

## Non-vacuité — cinq mutations, chacune restaurée

| Mutation                                                                       | Échec obtenu                                                                                                           |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `watch(isOnline)` retiré de `default.vue`                                      | 4 cas tombent (rejeu automatique + les 3 de conflit, qui en dépendent) ; « Sync now » et la mise en file restent verts |
| le bloc `if (flash?.conflictData …)` retiré de `use_offline_queue`             | les 3 cas de conflit tombent, eux seuls                                                                                |
| la consommation de `session.simulatorBoat` retirée de `new_account_controller` | 1 cas tombe ; le contre-exemple `/dashboard` d'`auth.spec.ts` reste vert                                               |
| `if (!props.editMode) return` retiré de `MarinaCanvas`                         | le contre-exemple **et** l'affectation tombent                                                                         |
| `PontoonService.updatePosition` court-circuitée, route toujours 302            | le cas de persistance tombe, lui seul                                                                                  |

## Vérification

- `pnpm test:e2e` — **48 passed** contre 32 à la ligne de base, **3 min 09 s** contre 2 min 15 s
  (+40 % pour +16 cas)
- `pnpm test` (`unit integration functional`) — inchangé
- `pnpm test:inertia` — **2507 passed** (les deux composants touchés ne cassent aucune spec)
- `npx tsc --noEmit` et `npx eslint` — propres
- `git diff app/ start/ shared/ database/` — vide ; `git diff inertia/` — les 4 lignes `data-testid`

## Constats ouverts

| #   | Constat                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------- |
| —   | `ConflictResolutionModal` n'a ni `role="dialog"` ni `aria-modal`, là où `BaseModal` les porte                   |
| —   | aucun chemin de `/boats/:id/reservations` vers la facture : « Créer un devis » n'existe que sur `/reservations` |
| —   | les actions de `ReservationList` n'ont qu'un `title`, donc aucun nom accessible                                 |
| —   | contexte Playwright dédié pour les cibles tactiles (#494), si la limite devient gênante                         |
