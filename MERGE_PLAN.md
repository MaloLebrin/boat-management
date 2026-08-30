# Plan de merge — épic PWA terrain (#481)

> Checklist opérationnelle, à cocher au fil des merges. **Fichier local non commité** — la version
> durable (avec le récap des livraisons et les décisions) est dans la PR
> [#567](https://github.com/MaloLebrin/boat-management/pull/567) →
> `docs/architecture/pwa-terrain-epic-481.md`.
>
> Le repo merge en **squash** : après chaque merge d'une base de pile, rebaser la PR enfant :
>
> ```bash
> git checkout <branche-enfant> && git fetch --prune && git rebase origin/main && git push --force-with-lease
> ```
>
> Les patchs identiques sont sautés au rebase — en général propre. Avant chaque merge : CI verte
> sur la PR rebasée.

## Étape 0 — préalables

- [x] **#557** — fix du test IA flaky → **mergée le 2026-08-26** (`3547a8fd`), test 12/12 vert sur `main`.
- [x] **Fermer #558** — doublon de #559 (même branche `feat/492-bottom-tab-bar`, mauvaise base). Ne pas merger.
- [x] **#567** — doc récapitulative (doc seule, base `main`, zéro conflit) — mergeable tout de suite.

## Étape 1 — indépendantes (parallélisables, à tout moment)

- [x] **#550** — bouton « Prendre une photo » (#485)
- [x] **#551** — bouton « Ma position actuelle » (#486)
- [x] **#560** — replis carte des tableaux terrain (#493)
- [x] **#562** — onglets scrollables + inspection en onglets (#495)

## Étape 2 — pile socle + Web Push (strictement dans l'ordre)

- [x] **#547** — SW : scope `/` + offline.html précaché (#482) — mergée le 2026-08-26
- [x] rebase #548 → **#548** — garde-fou `pnpm check:sw` en CI (#483) — mergée le 2026-08-26
- [x] rebase #563 → **#563** — bascule injectManifest + SW custom (#496) — mergée le 2026-08-26
      (+ fix en passant : `devOptions.enabled` coupé sous `node ace test`, le SW actif en e2e rendait `dark_mode.spec.ts` flaky)
- [x] rebase #564 → **#564** — socle backend Web Push (#497) — mergée le 2026-08-26
      ⚠️ apporte la dépendance `web-push` (`pnpm install` au déploiement) et la migration `1827…create_push_subscriptions`.
- [x] rebase #565 → **#565** — opt-in front, entonnoir iOS, gestion des appareils (#498) — mergée le 2026-08-26
- [ ] **Post-pile** : `npx web-push generate-vapid-keys` puis poser `VAPID_PUBLIC_KEY` /
      `VAPID_PRIVATE_KEY` (+ `VAPID_SUBJECT` optionnel, défaut `mailto:MAIL_FROM_ADDRESS`) en prod.
      Sans les clés, tout fonctionne mais le push reste désactivé.
- [ ] **Check déploiement** : DevTools → Application → Service Workers — scope `/`, état
      `activated`, `offline.html` dans le précache.

## Étape 3 — pile shell mobile

- [x] **#549** — h-dvh + viewport-fit=cover + safe-areas (#484)
- [ ] rebase #559 → **#559** — bottom tab bar (#492) — **PAS encore mergée**.
      Re-rebasée sur `main` le 2026-08-27 (conflits `theme_safe_components.spec.ts` et
      `ui-map.md` résolus, vieux commits #549 retirés — arbre identique à `main`).
      ⚠️ **#559 embarque désormais #566** : la PR #566 (tests viewport mobile, #500) a été
      squash-mergée dans `feat/492-bottom-tab-bar` le 2026-08-27 — merger #559 livre les deux.
- [ ] **Vérif iPhone réel** (attendue par #484) : bas de page atteignable sur `/boats/:id` et
      `/planning`, en Safari **et** en PWA installée.

## Étape 4 — pile hors-ligne (strictement dans l'ordre)

- [x] **#552** — refus 4xx conservés, store `failed`, IndexedDB v2 (#487)
- [x] rebase #553 → **#553** — heures moteur hors-ligne (#488)
- [x] rebase #554 → **#554** — incidents hors-ligne (#489)
- [x] rebase #555 → **#555** — fiches d'entretien : dédup + optimiste + conflit backend (#490)
- [x] rebase #556 → **#556** — défauts d'inspection hors-ligne (#491) — mergée le 2026-08-27
- [x] rebase #561 → **#561** — cibles tactiles ≥ 44 px (#494) — mergée le 2026-08-27

## Étape 5 — finale

- [x] ~~rebase #566 sur `main`~~ — **#566 mergée dans la branche de #559** le 2026-08-27
      (base `feat/492-bottom-tab-bar`) : elle arrivera sur `main` avec le merge de #559.
- [ ] `pnpm test:e2e` complet sur `main` (dont `mobile_field.spec.ts`)
- [ ] Fermer l'épic **#481**

## Conflits attendus aux rebases (tous triviaux — cumuler les deux côtés)

| Fichier                                       | Croisement                | Résolution                                               |
| --------------------------------------------- | ------------------------- | -------------------------------------------------------- |
| `resources/lang/{en,fr}/common.json`          | hors-ligne × push         | garder toutes les clés (`offline.*` **et** `push.*`)     |
| `docs/frontend/pwa.md`                        | socle × hors-ligne × push | sections adjacentes — garder toutes                      |
| `inertia/layouts/default.vue`                 | #549/#559 × #565 × #561   | cumuler (safe-areas + bottom nav + PushOptInCard + 44px) |
| `tests/inertia/theme_safe_components.spec.ts` | #559 × #560               | garder toutes les entrées (déjà résolu dans #566)        |
| `docs/changelog/*`                            | toutes                    | un fichier par PR — jamais de vrai conflit               |
