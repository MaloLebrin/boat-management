# 2026-07-03 — [#170] Facturation : bornes de période lues depuis Stripe

**Corrige A-07 : `getPeriodBounds()` recalculait la période de facturation à partir de `billing_cycle_anchor` avec une boucle `while`. Ce recalcul divergeait de Stripe dans les cas particuliers (trials, pauses, ajustements mid-cycle)**

- `app/services/subscription_service.ts` : `getPeriodBounds()` lit désormais directement les bornes autoritaires de Stripe. Dans la version d'API du SDK utilisé (stripe v22), `current_period_start` / `current_period_end` vivent sur l'item de souscription (`stripeSub.items.data[0]`), pas sur la souscription — le correctif les lit à cet endroit
- Test ajouté : `tests/functional/billing/subscription_service.spec.ts` (un anchor 2020 avec une période Stripe 2030 : la période stockée doit être 2030, prouvant que les valeurs Stripe sont utilisées telles quelles et non recalculées)
