/**
 * Options de la barre de progression d'Inertia (`createInertiaApp`, #837).
 *
 * Par défaut, `@inertiajs/core` (`setupProgress` → `injectCSS`) crée à
 * l'initialisation une balise `<style>` sans `nonce` : en production, la CSP
 * de `config/shield.ts` (`style-src 'self' 'nonce-…'`) la refuse et la barre
 * n'a aucun style. `includeCSS: false` désactive cette injection ; les règles
 * `#nprogress` sont bundlées dans `inertia/css/app.css`, servi same-origin et
 * couvert par `'self'`. La couleur y est lue via `var(--color-brand)`, et
 * `color` n'est donc plus lu par Inertia — il est conservé pour documenter
 * l'intention et rester cohérent si `includeCSS` était réactivé.
 *
 * Isolé dans ce module pour être rejoué tel quel par le test Vitest
 * (`tests/inertia/inertia_progress.spec.ts`) via `setupProgress`.
 */
export const inertiaProgressOptions = {
  color: 'var(--color-brand)',
  includeCSS: false,
} as const
