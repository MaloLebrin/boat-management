# 2026-06-14 — Benchmark anonymisé avec comparaison en pourcentage dans les résultats du simulateur (#13)

**Amélioration — Social proof dans SimulatorResultCard**

Affichage d'un encart comparatif sous le total estimé dans les résultats du simulateur. Le delta entre le coût de l'utilisateur et la moyenne anonymisée des bateaux similaires est calculé et présenté sous forme de message contextuel.

**Frontend (`inertia/components/marketing/simulator/SimulatorResultCard.vue`) :**

- Computed `benchmarkComparison` : calcule le pourcentage de différence entre `(totalMin+totalMax)/2` et `(benchmark.avgMin+benchmark.avgMax)/2`
- Trois clés utilisées selon le delta : `benchmark_above` (> +5%), `benchmark_below` (< −5%), `benchmark_similar` (±5%)
- La fourchette moyenne (avgMin – avgMax) reste affichée en secondaire

**i18n (FR + EN) :**

- Ajout des clés `benchmark_above`, `benchmark_below`, `benchmark_similar` avec params `{percent}` et `{count}`

**Tests (`tests/inertia/simulator_step_costs.spec.ts`) :** 4 nouveaux cas couvrant les trois branches de comparaison et l'absence du bloc quand aucun benchmark n'est fourni.
