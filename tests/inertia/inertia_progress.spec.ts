import { createInertiaApp } from '@inertiajs/vue3'
import { afterEach, describe, expect, it } from 'vitest'
import { inertiaProgressOptions } from '~/utils/inertia_progress'

/**
 * Barre de progression Inertia et CSP (#837).
 *
 * `createInertiaApp` (tel que l'appelle `inertia/app.ts`) délègue l'option
 * `progress` à `setupProgress` de `@inertiajs/core`, qui injecte par défaut
 * une balise `<style>` sans nonce dans `<head>` — refusée en production par
 * la CSP `style-src 'self' 'nonce-…'`. Les options de l'app doivent l'en
 * empêcher : le CSS vit dans `inertia/css/app.css`.
 *
 * L'app est démarrée sans montage (`setup` vide, page initiale fournie) :
 * seul le câblage de la barre nous intéresse ici.
 */
type ProgressOption = Parameters<typeof createInertiaApp>[0]['progress']

async function bootInertia(progress: ProgressOption): Promise<void> {
  await createInertiaApp({
    page: { component: 'probe', props: {}, url: '/en', version: null },
    resolve: () => ({ default: { render: () => null } }),
    setup: () => {},
    progress,
  })
}

function injectedProgressStyles(): HTMLStyleElement[] {
  return [...document.head.querySelectorAll('style')].filter((element) =>
    element.textContent.includes('#nprogress')
  )
}

describe('inertiaProgressOptions (#837)', () => {
  afterEach(() => {
    document.head.replaceChildren()
  })

  it("témoin : les options par défaut d'Inertia injectent un <style> #nprogress sans nonce", async () => {
    await bootInertia({})

    const styles = injectedProgressStyles()
    expect(styles).toHaveLength(1)
    expect(styles[0].getAttribute('nonce')).toBeNull()
  })

  it("les options de l'app n'injectent aucun <style> : le CSS est bundlé dans app.css", async () => {
    await bootInertia(inertiaProgressOptions)

    expect(injectedProgressStyles()).toHaveLength(0)
  })

  it('les options désactivent explicitement `includeCSS` et gardent la couleur brand', () => {
    expect(inertiaProgressOptions.includeCSS).toBe(false)
    expect(inertiaProgressOptions.color).toBe('var(--color-brand)')
  })
})
