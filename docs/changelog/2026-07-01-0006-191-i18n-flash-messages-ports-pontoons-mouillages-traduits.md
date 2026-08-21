# 2026-07-01 — [#191] i18n : flash messages ports/pontoons/mouillages traduits via i18n.t()

**Correction des flash messages hardcodés (raw keys) dans les controllers ports/pontoons/mouillages**

- `app/controllers/ports_controller.ts` : `session.flash('error', 'port_has_boats')` → `i18n.t('flash.ports.hasBoats')`
- `app/controllers/pontoons_controller.ts` : `session.flash('error', 'pontoon_has_boats')` → `i18n.t('flash.pontoons.hasBoats')`
- `app/controllers/mouillages_controller.ts` : `session.flash('error', 'mouillage_has_boats')` → `i18n.t('flash.mouillages.hasBoats')`
- `resources/lang/fr/flash.json` et `resources/lang/en/flash.json` : ajout des clés `ports.hasBoats`, `pontoons.hasBoats`, `mouillages.hasBoats`
- `tests/functional/ports/ports.spec.ts` : test du cas `PortHasBoatsError` → redirection avec flash
- `tests/functional/ports/pontoons.spec.ts` : tests delete nominal + `PontoonHasBoatsError`
- `tests/functional/ports/mouillages.spec.ts` : tests delete nominal + `MouillageHasBoatsError`
