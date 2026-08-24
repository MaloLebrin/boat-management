# 2026-07-22 — Formats numériques et devises cohérents par locale (#409)

Audit UX du 2026-07-19 : les nombres et devises étaient formatés de façon incohérente — « 0.0 L » (point) juste au-dessus de « 0,00 € » (virgule) sur `/navigation/fuel`, « 0 sur 1000000 » non séparé sur `/settings/billing`, et une devise en dollars (« $1,200 ») sur la home EN alors que les prix sont en euros.

- **Nouveau composable `use_number_format`** (`inertia/composables/use_number_format.ts`) : `formatNumber(value, options?)` et `formatCurrency(value)` locale-aware (`Intl.NumberFormat(locale.value, …)`, EUR), sur le modèle de `use_date_format`.
- **`/navigation/fuel`** : le total de litres passe par `formatNumber` (1 décimale) au lieu de `.toFixed(1)` — séparateur décimal aligné sur la locale (« 0,0 L » en FR) ; total et coûts par ligne factorisés sur `formatCurrency` ; le compteur de litres par ligne formate aussi le nombre.
- **`/settings/billing`** (`SettingsBillingUsageGauge.vue`) : les quotas numériques (tokens IA, bateaux, membres) sont séparés par milliers (« 1 000 000 » au lieu de « 1000000 ») via `formatNumber` ; le formatage octets reste inchangé.
- **Home marketing** : normalisation de la devise sur `home.problem.item2_stat` — `€1,200` en EN (au lieu de `$1,200`) et `1 200 €` en FR (au lieu de `1 200 EUR`).
