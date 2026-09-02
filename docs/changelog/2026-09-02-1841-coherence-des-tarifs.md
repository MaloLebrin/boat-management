# 2026-09-02 — Un seul barème, dérivé et confronté à Stripe (#612)

Troisième passe sur la cohérence des tarifs, après #401 (marketing ↔ app) et #454 (comparatif adossé à `PLAN_LIMITS`). Les deux précédentes corrigeaient des chiffres ; celle-ci s'attaque aux endroits où un montant pouvait encore être _saisi_ ailleurs que dans `shared/types/plan.ts` — et ajoute le seul contrôle qui manquait vraiment : la confrontation au catalogue Stripe.

## Le prix affiché face au prix facturé

- **Nouvelle commande `node ace pricing:check`** (`commands/check_pricing.ts` + `app/services/pricing_catalog_service.ts`). Elle lit les 10 prix Stripe configurés et compare montant, devise, intervalle et état (archivé) aux barèmes `PLAN_PRICES` / `MODULE_PRICES` / `ADDON_PRICES`, en sortant en code 1 au premier écart. Jusqu'ici, rien ne regardait les deux sources ensemble : le code affichait des montants, Stripe en facturait d'autres, et personne ne pouvait le savoir.
- Les prix **restent en dur** côté code : la page tarifs est publique et rendue en SSR sans clé Stripe (toutes les variables `STRIPE_*` sont `optional`), et les composants Vue importent le barème de façon synchrone. La vérification à la demande ferme la boucle sans rendre l'affichage dépendant du réseau.
- **Ce que la commande a immédiatement trouvé** : le total annuel Entreprise vaut bien **950 €** chez Stripe. C'est `annualMonthly: 79` qui est un arrondi d'affichage (950 / 12 = 79,17), pas `annualTotal` qui serait faux. L'invariant testé est donc `annualMonthly === Math.round(annualTotal / 12)`, et non l'égalité stricte à douze mensualités. Nouveau `tests/unit/plan_prices.spec.ts` : invariant d'arrondi sur les trois barèmes, remise annuelle ≥ 20 % (Entreprise donne 20,2 %, `extra_boats` 25 % — l'écart va toujours dans le sens du client), gratuité de Starter, progression des paliers. Le bloc redondant de `plan_modules.spec.ts` a été retiré.

## Un seul rendu de prix

- **`PricingTiersSection.vue`** rendait le nombre nu : « 20 / mois » sur les cartes, alors que le comparatif deux sections plus bas rendait « 20 € / mois ». Il passe par `formatPrice`, comme le reste de la page. Un socle gratuit affiche désormais son libellé (nouvelle prop `freeLabel`, alimentée par la clé existante `table_plan_starter_price`) au lieu d'un « 0 » — la carte Starter affichait un `0` nu en bascule annuelle, faute de `priceAnnual`.
- **`UpgradePlanModal.vue`** collait un `€` en dur à droite du montant, quelle que soit la locale — précisément ce que `formatPrice` (#465) avait supprimé partout ailleurs.
- **`SettingsBillingModules.vue` / `SettingsBillingExtraBoats.vue`** envoient un montant déjà formaté ; les clés `settings.json` ne portent plus le symbole. Cela résorbe au passage trois clés **anglaises** qui écrivaient `{amount} €/boat/month` à la française. `subscription.annualDiscount` s'aligne sur la graphie marketing (`−20 %` / `−20%`).

## Des montants dérivés, plus recopiés

- `PricingROISection.vue` chiffrait le coût FleetAi à `348 = 29 × 12` — un tarif Pro qui n'existe plus (le vrai est 20 €, soit 192 €/an) —, avec un seuil à 25 bateaux (le quota Pro est 8) et un « Enterprise estimate » à 1200. Le coût suit maintenant l'offre réellement vendue : Starter gratuit dans son quota, puis le socle Pro, puis Pro + un `extra_boats` par bateau au-delà, plafonné par le total annuel Entreprise.
- `pricing2.meta_description`, `hero_subtitle`, les sous-titres et features des trois cartes, `faq_a2` et `home.faq.item4` (fr **et** en) deviennent des patrons ICU alimentés par `PLAN_PRICES` / `PLAN_LIMITS` / `ADDON_PRICES` via un nouveau `MarketingController.pricingCopyParams(locale)` — les prix formatés avec la locale de la requête, jamais celle du serveur. La flotte de 15 bateaux citée par la FAQ home garde son chiffrage, mais celui-ci se **calcule** (`FAQ_EXAMPLE_FLEET_SIZE`) au lieu d'être écrit dans les deux JSON.

## Copy tarifaire mort supprimé

- Namespace **`marketing.pricing`** (v1) : plus lu par personne depuis le passage à `pricing2`, il annonçait encore « Jusqu'à 3 bateaux » en Starter (le quota est 2), « Illimité » en Pro (8), « si je dépasse 3 bateaux », « Économisez 2 mois » et « Tarifs indicatifs — la facturation peut être ajoutée ensuite ».
- Namespace **`marketing.home.sections`** : duplicat mort de `marketing.home`, avec sa propre copie figée de la FAQ tarifaire.
- **48 clés `pricing2` orphelines**, dont `tier_enterprise_price` (`"99"`, duplication silencieuse du prix), les groupes `table_g6_*` / `table_g7_*` jamais rendus et `extras_3_price` (880 €).
- Composants jamais importés : `PricingPlansGrid.vue` (qui affichait des prix en chaînes) et `PricingModulesSection.vue`, avec son spec et l'entrée correspondante de `theme_safe_components.spec.ts`.

Les doublons non tarifaires repérés au passage (`about`/`about2`, `contact`/`contact2`) sont laissés en l'état, hors périmètre.

## Tests

- `tests/unit/plan_prices.spec.ts` (4 cas) et `tests/unit/pricing_catalog.spec.ts` (8 cas : composition du catalogue attendu, couverture de chaque module/add-on, écart de montant, de devise, d'intervalle, prix archivé, prix introuvable, identifiant non configuré).
- `tests/inertia/pricing_roi_section.spec.ts` (4 cas sur les quatre régimes de coût) et `tests/inertia/upgrade_plan_modal.spec.ts` (3 cas) sont nouveaux ; `pricing_tiers_section.spec.ts` gagne le symbole monétaire dans les deux locales et le libellé « Gratuit » ; `settings_billing_modules` / `settings_billing_extra_boats` vérifient le passage par `formatPrice` en mensuel et en annuel.
- `tests/functional/marketing/pricing_claims.spec.ts` gagne un groupe de 7 cas × 2 locales : aucun placeholder ICU résiduel dans la copie rendue, meta description et cartes adossées aux barèmes, FAQ tarifs et FAQ home chiffrées au vrai prix, et absence de l'ancien tarif 29 €.

## Documentation

`docs/quotas.md` annonçait « Le plan est assigné manuellement en BDD … Pas de Stripe » (faux depuis le checkout) et « Entreprise : sur devis » (contredit par `PLAN_PRICES` et toute la page tarifs). `docs/billing-and-quotas.md` documente l'add-on `extra_boats` et les deux garde-fous du barème.
