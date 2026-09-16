# 2026-09-16 — Helper de montage Vitest partagé (refactorisation, vague 0.2)

Chaque spec Vitest redéclarait son propre `vi.mock('@inertiajs/vue3', …)` (148
fois), son `useT` identité (79 fois) et ses doublons de composants `base/*`
(59 `BaseButton`, tous différents : certains transmettaient `disabled`, `type`
ou `@click`, d'autres non). Le même composant se comportait donc différemment
selon la spec qui tournait.

- **`tests/inertia/helpers/inertia_mock.ts`.** Un seul doublon de `@inertiajs/vue3` : `routerSpies` (`visit`, `get`, `post`…), `formSpies` (`post`, `put`, `reset`…), `forms` (chaque `useForm()` créé, avec `data()`), `pageState` (ce que `usePage()` rend). Le vrai `useT()` tourne par-dessus : `appT` vide, `t(clé)` renvoie la clé, `locale` suit les props partagées — plus besoin de mocker `~/composables/use_t`.
- **`tests/inertia/helpers/mount.ts`.** `mountWithStubs(component, { props, pageProps, locale, stubs, slots })` monte avec un jeu **uniforme** de doublons `base/*` (`BaseButton`, `BaseInput`, `BaseSelect`, `BaseTextarea`, `BaseCard`, `BaseModal`, `BaseConfirmModal`, `BaseBadge`, `BaseAlert`, `BaseHeading`, `BaseEmptyState`, `BaseSegmentedControl`), chacun rendant la sémantique minimale du vrai composant (attributs, `v-model`, événements, slots) et repérable par `data-base-*`. `stubs: { BaseBadge: false }` rend le vrai composant sur un point précis. Les espions sont remis à zéro à chaque montage.
- **Migration.** Sept specs migrées pour établir le motif : `settings_me_cards`, `budget_entry_form`, `budget_entry_list`, `ports_show_delete`, `new_boat_button`, `navigation_logbook_empty_action`, `boat_show_tab_equipment_actions` (48 tests, assertions inchangées à un sélecteur près). Les autres suivront au fil de la vague 3.
- **Tests.** `tests/inertia/helpers/mount.spec.ts` (5 tests) garantit que les doublons transmettent bien `type`/`disabled`/`click`, le `v-model` des champs, le `t()` identité et la locale, la capture des appels `router.*`, et la désactivation d'un doublon.
- **Aucun changement** de code applicatif.
