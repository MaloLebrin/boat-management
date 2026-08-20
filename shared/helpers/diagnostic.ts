/**
 * Un moteur est éligible aux checklists de diagnostic panne (#515) s'il est
 * hors-bord et 2 temps : le contenu (mélange 50:1, clapets, power pack,
 * link & sync) est spécifique à cette famille. Valeurs issues de
 * `ENGINE_KIND_OPTIONS` et `engineStrokeTypes`.
 */
export function isDiagnosticEligibleEngine(engine: {
  kind: string
  strokeType: string | null
}): boolean {
  return engine.kind === 'outboard' && engine.strokeType === '2_stroke'
}
