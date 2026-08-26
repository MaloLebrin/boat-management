# PWA de terrain — implémentation de l'épic #481 et plan de merge

> Épic : [#481](https://github.com/MaloLebrin/boat-management/issues/481) — service worker, hors-ligne, Web Push et UX mobile.
> **18 issues / 18 livrées**, en 16 PRs (une par issue) + 1 PR annexe. Ce document résume ce qui a
> été construit, les décisions structurantes, puis donne le **plan de merge** — le repo mergeant en
> squash, l'ordre et les rebases comptent.

## Vue d'ensemble des livraisons

### Lot 1 — Socle service worker (bloquant)

| PR                                                             | Issue | Contenu                                                                                                                                                                                                                                |
| -------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#547](https://github.com/MaloLebrin/boat-management/pull/547) | #482  | Le SW ne s'installait **jamais** en production (scope `/assets/`, `offline.html` non précaché → `non-precached-url` à l'évaluation). Corrigé : `outDir: 'build/public'`, `buildBase`/`scope` `/`, précache explicite d'`offline.html`. |
| [#548](https://github.com/MaloLebrin/boat-management/pull/548) | #483  | Garde-fou `pnpm check:sw` sur le **build réel** (évaluation vm, scope, précache, enregistrement client), branché en CI dans le job `build`. Validé en provoquant la régression.                                                        |

### Lot 2 — Quick wins terrain

| PR                                                             | Issue | Contenu                                                                                                                                                                |
| -------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#549](https://github.com/MaloLebrin/boat-management/pull/549) | #484  | `h-screen` → `h-dvh` (bas de page atteignable sur iOS Safari), `viewport-fit=cover` + safe-areas sur header mobile et drawer. ⚠️ vérification iPhone réel attendue.    |
| [#550](https://github.com/MaloLebrin/boat-management/pull/550) | #485  | Bouton « Prendre une photo » sur les deux galeries — **second** input `capture="environment"` sans `multiple` (l'ajouter à l'input existant tuait la multi-sélection). |
| [#551](https://github.com/MaloLebrin/boat-management/pull/551) | #486  | Bouton « Ma position actuelle » (géoloc `enableHighAccuracy`, arrondi 5 décimales, précision affichée, 3 échecs explicites, pas d'auto-soumission).                    |

### Lot 3 — File hors-ligne (pile : chaque PR est la base de la suivante)

| PR                                                             | Issue | Contenu                                                                                                                                                                            |
| -------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#552](https://github.com/MaloLebrin/boat-management/pull/552) | #487  | Les refus 4xx partent dans un store `failed` (IndexedDB **v2**, migration testée) avec les erreurs de validation ; UI Réessayer/Abandonner ; la file continue après un échec.      |
| [#553](https://github.com/MaloLebrin/boat-management/pull/553) | #488  | Heures moteur hors-ligne (incrément commutatif vérifié côté service — rejeu sans conflit possible).                                                                                |
| [#554](https://github.com/MaloLebrin/boat-management/pull/554) | #489  | Incidents hors-ligne — conversion `<Form>` → `useForm`, `tzOffsetMinutes` **figé à la soumission** (jamais recalculé au rejeu).                                                    |
| [#555](https://github.com/MaloLebrin/boat-management/pull/555) | #490  | Fiches d'entretien : dédup `dedupeKey` (upsert, dernière valeur gagne), **état optimiste**, notes sans debounce hors-ligne, **détection de conflit backend** `_expectedUpdatedAt`. |
| [#556](https://github.com/MaloLebrin/boat-management/pull/556) | #491  | Défauts d'inspection hors-ligne ; limite assumée : refus explicite (message + bouton désactivé) si l'inspection n'existe pas encore côté serveur.                                  |

La file couvre désormais **9 formulaires** (tableau dans `docs/frontend/pwa.md`).

### Lot 4 — UX mobile

| PR                                                             | Issue | Contenu                                                                                                                                                                                 |
| -------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#559](https://github.com/MaloLebrin/boat-management/pull/559) | #492  | Bottom tab bar — 4 raccourcis par rôle via `bottomNavItems` (`use_nav_sections.ts`, mêmes `can()` que la nav), montée **dans le flux** du shell (jamais `fixed`), masquée `boat_owner`. |
| [#560](https://github.com/MaloLebrin/boat-management/pull/560) | #493  | Replis carte des 4 écrans terrain (`lg:hidden` cartes / `hidden lg:block` table) — `LogbookCard`, `FuelLogCard`, `IncidentCard`, `MaintenanceHistoryCard`.                              |
| [#561](https://github.com/MaloLebrin/boat-management/pull/561) | #494  | Cibles tactiles ≥ 44 px : pseudo-zones `pointer-coarse:` (case des fiches, `BaseButton` sm/md/icon, drawer), hamburger à 44 px pleins — densité desktop intacte.                        |
| [#562](https://github.com/MaloLebrin/boat-management/pull/562) | #495  | `BaseTabs` : snap + dégradés de débordement ; état des lieux en onglets Départ/Retour sous `lg` (chaque panneau rendu une seule fois — ids de formulaires).                             |

### Lot 5 — Web Push (pile sur le lot 1)

| PR                                                             | Issue | Contenu                                                                                                                                                                                                                      |
| -------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#563](https://github.com/MaloLebrin/boat-management/pull/563) | #496  | Bascule `injectManifest` + SW custom `inertia/sw.ts` (skipWaiting/claim manuels, NetworkFirst restreint aux **navigations**, `NavigationRoute` par défaut — sans elle `setCatchHandler` ne rattrape rien —, repli offline).  |
| [#564](https://github.com/MaloLebrin/boat-management/pull/564) | #497  | Socle backend : table `push_subscriptions` (upsert sur hash d'endpoint), `WebPushService` (404/410 → purge, 429 → retry), job dénormalisé, routes auth+throttle, `VAPID_*` **optionnels**, clé publique en shared prop.      |
| [#565](https://github.com/MaloLebrin/boat-management/pull/565) | #498  | Opt-in contextuel (2e session, jamais de prompt à froid), entonnoir iOS, gestionnaires `push`/`notificationclick` (payload parsé en fonction pure, `tag` par type), écran `/settings/notifications` (gestion des appareils). |

### Lot 6 — Tests

| PR                                                             | Issue | Contenu                                                                                                                                                                         |
| -------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#566](https://github.com/MaloLebrin/boat-management/pull/566) | #500  | `tests/browser/mobile_field.spec.ts` (390×844) : débordement horizontal sur 6 écrans, bottom nav, replis carte, drawer pleine hauteur. Auto-validée par régressions provoquées. |

### Annexe

- [#557](https://github.com/MaloLebrin/boat-management/pull/557) — fix du test flaky `ai_analysis_service.spec.ts` (fixture `locale` manquante). Hors épic, mais **à merger en premier** : le test échoue sur `main`.
- **#558 est un doublon de #559** (même branche `feat/492-bottom-tab-bar`, base `main` au lieu de `fix/484-hdvh-safe-area`) → **à fermer** sans merger.

## Décisions structurantes & pièges (résumé)

- **Racine web du build** : le client Vite sort dans `build/public/assets` (imposé par `@adonisjs/inertia/vite`), les metaFiles sont copiés **après** le build — d'où `outDir: 'build/public'` pour le SW et le précache manuel d'`offline.html`. Détail : `docs/frontend/pwa.md`.
- **File hors-ligne** : IndexedDB v2 (stores `actions` + `failed`), dédup par `dedupeKey`, conflits `_expectedUpdatedAt` (motif backend requis pour les PUT rejoués — l'étape « aucune modification backend » de la procédure ne vaut que pour les créations).
- **Push** : `subscribe()` uniquement sur geste utilisateur ; le SW appelle toujours `showNotification` (un endpoint muet est désabonné par le navigateur) ; 404/410 purgent l'abonnement, 429 laisse le retry du job.
- **Tests** : la suite `integration` tourne sous **transaction globale** — jamais de `truncate()` par test ; jamais deux `node ace test` concurrents (voir `docs/dev/testing.md` et `docs/changelog/`).
- **Tailwind** : les classes `pointer-coarse:` doivent être écrites en littéral complet (le scanner ne voit pas la concaténation) ; le viewport mobile des tests navigateur ne les active pas (pointeur émulé `fine`).

## Plan de merge

Le repo merge en **squash** : après chaque merge d'une base de pile, GitHub rebase la cible de la
PR enfant sur `main` automatiquement, mais **la branche enfant garde les commits d'origine du
parent** — il faut la rebaser (les patchs identiques sont sautés, le rebase est en général propre) :

```bash
git checkout <branche-enfant>
git fetch --prune
git rebase origin/main
git push --force-with-lease
```

### Étape 0 — préalables (dans cet ordre, avant tout le reste)

1. **Merger #557** (fix test IA) — le test échoue sur `main`, toutes les CI en dépendent.
2. **Fermer #558** (doublon de #559).

### Étape 1 — indépendantes (parallélisables, à tout moment)

3. #550 (photo), #551 (géoloc), #560 (replis carte), #562 (onglets) — bases `main`, aucun ordre entre elles.

### Étape 2 — pile socle + Web Push (l'épine dorsale, strictement dans l'ordre)

4. #547 → rebase #548 → merger #548
5. → rebase #563 → merger #563
6. → rebase #564 → merger #564
   - ⚠️ ajoute la dépendance `web-push` (`pnpm install` au déploiement) et la migration `1827…create_push_subscriptions` (s'exécute au déploiement).
7. → rebase #565 → merger #565

**Actions post-merge du lot** : générer les clés (`npx web-push generate-vapid-keys`) et poser
`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (+ `VAPID_SUBJECT` optionnel) sur l'environnement de
production. Sans elles, tout fonctionne mais le push reste désactivé.

### Étape 3 — pile shell mobile

8. #549 (h-dvh/safe-areas) → rebase #559 → merger #559
   - Le rebase de #559 fait disparaître le commit doublon du fix IA (patch identique à #557, sauté).
   - Vérification iPhone réel (Safari + PWA installée) recommandée à ce stade : bas de page atteignable sur `/boats/:id` et `/planning`.

### Étape 4 — pile hors-ligne (strictement dans l'ordre)

9. #552 → rebase #553 → merger → rebase #554 → merger → rebase #555 → merger → rebase #556 → merger → rebase #561 → merger.

### Étape 5 — finale

10. **#566 en dernier** (elle exige #559 **et** #560 dans `main`) : rebase sur `main` — les commits de #560 qu'elle embarque se dédupliquent — puis merger.

### Conflits attendus au fil des rebases (tous triviaux — garder les deux côtés)

| Fichier                                       | Piles concernées          | Résolution                                               |
| --------------------------------------------- | ------------------------- | -------------------------------------------------------- |
| `resources/lang/{en,fr}/common.json`          | hors-ligne × push         | conserver toutes les clés (`offline.*` **et** `push.*`)  |
| `docs/frontend/pwa.md`                        | socle × hors-ligne × push | sections adjacentes — conserver toutes                   |
| `inertia/layouts/default.vue`                 | #549/#559 × #565 × #561   | cumuler (safe-areas + bottom nav + PushOptInCard + 44px) |
| `tests/inertia/theme_safe_components.spec.ts` | #559 × #560               | déjà résolu dans #566 (garder toutes les entrées)        |
| `docs/changelog/*`                            | toutes                    | un fichier par PR, jamais de conflit réel                |

### Vérification après chaque étape

- CI verte sur la PR rebasée avant de merger (lint, build + `check:sw`, backend, frontend, e2e).
- Après l'étape 2 : `pnpm check:sw` passe en CI sur `main` ; après déploiement, DevTools → Application → Service Workers : scope `/`, état `activated`, `offline.html` dans le précache.
- Après l'étape 5 : `pnpm test:e2e` complet sur `main` (dont `mobile_field.spec.ts`).
