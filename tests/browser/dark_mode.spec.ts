import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import type { Page } from 'playwright'
import { createAdminUser } from '#tests/browser/helpers'

/**
 * Thème sombre (#416) — vérification des **vraies couleurs**.
 *
 * Les tests Vitest tournent en happy-dom sans aucune feuille de style : ils ne
 * peuvent qu'assertir des noms de classes. C'est ici, et seulement ici, que le
 * CSS est réellement appliqué et que l'on peut mesurer ce que l'utilisateur
 * voit — luminance des surfaces et contraste du texte.
 */

/** Luminance relative WCAG d'une couleur CSS `rgb()` / `rgba()`. */
const LUMINANCE_FN = `(css) => {
  const parts = css.match(/[\\d.]+/g)
  if (!parts) return null
  const [r, g, b] = parts.map(Number)
  const channel = (v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}`

function bodyLuminance(page: Page): Promise<number | null> {
  return page.evaluate(
    `(() => {
      const lum = ${LUMINANCE_FN}
      return lum(getComputedStyle(document.body).backgroundColor)
    })()`
  ) as Promise<number | null>
}

/**
 * Contraste texte/fond d'un sélecteur, en remontant les ancêtres jusqu'au
 * premier fond opaque — un élément de texte hérite presque toujours du fond
 * d'un parent.
 */
function contrastOf(page: Page, selector: string): Promise<number | null> {
  return page.evaluate(
    `((selector) => {
      const lum = ${LUMINANCE_FN}
      const el = document.querySelector(selector)
      if (!el) return null

      const fg = lum(getComputedStyle(el).color)
      let node = el
      let bg = null
      while (node) {
        const value = lum(getComputedStyle(node).backgroundColor)
        const alpha = getComputedStyle(node).backgroundColor.match(/[\\d.]+/g)
        const opaque = !alpha || alpha.length < 4 || Number(alpha[3]) > 0.9
        if (value !== null && opaque) { bg = value; break }
        node = node.parentElement
      }
      if (fg === null || bg === null) return null
      return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)
    })(${JSON.stringify(selector)})`
  ) as Promise<number | null>
}

/**
 * Sélecteurs stables de `/design-system`, le banc d'essai qui rend toute la
 * palette et tous les composants `base`.
 *
 * Liste volontairement curée plutôt qu'un balayage de la page : un scan
 * générique se noie dans les fonds en dégradé et les couleurs à alpha des
 * bandeaux marketing, et produirait un test instable.
 */
const CONTRAST_TARGETS = [
  { name: 'titre de page', selector: 'h1' },
  { name: 'texte courant', selector: '[data-theme-probe="body-text"]' },
  { name: 'texte sourdine', selector: '[data-theme-probe="muted-text"]' },
]

test.group('E2E · Thème sombre (#416)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('les pages publiques résolvent data-theme selon la préférence système', async ({
    visit,
    assert,
  }) => {
    const page = await visit('/en')

    for (const [scheme, expected] of [
      ['dark', 'dark'],
      ['light', 'light'],
    ] as const) {
      await page.emulateMedia({ colorScheme: scheme })
      await page.reload({ waitUntil: 'networkidle' })

      assert.equal(
        await page.getAttribute('html', 'data-theme'),
        expected,
        `prefers-color-scheme: ${scheme} doit résoudre data-theme="${expected}"`
      )
    }
  })

  test('le fond de page bascule réellement, pas seulement l’attribut', async ({
    visit,
    assert,
  }) => {
    const page = await visit('/en')

    await page.emulateMedia({ colorScheme: 'dark' })
    await page.reload({ waitUntil: 'networkidle' })
    const dark = await bodyLuminance(page)
    assert.isNotNull(dark, 'fond du body illisible en sombre')
    assert.isBelow(dark!, 0.1, `le fond devrait être sombre, luminance mesurée ${dark}`)

    await page.emulateMedia({ colorScheme: 'light' })
    await page.reload({ waitUntil: 'networkidle' })
    const light = await bodyLuminance(page)
    assert.isNotNull(light, 'fond du body illisible en clair')
    assert.isAbove(light!, 0.7, `le fond devrait être clair, luminance mesurée ${light}`)
  })

  test('l’app authentifiée bascule elle aussi', async ({ browserContext, visit, assert }) => {
    const user = await createAdminUser()
    await browserContext.loginAs(user)

    const page = await visit('/dashboard')
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.reload({ waitUntil: 'networkidle' })

    assert.equal(await page.getAttribute('html', 'data-theme'), 'dark')
    const luminance = await bodyLuminance(page)
    assert.isBelow(luminance!, 0.1, `fond du dashboard trop clair : ${luminance}`)
  })

  test('le texte du design system reste lisible dans les deux thèmes', async ({
    visit,
    assert,
  }) => {
    const page = await visit('/design-system')

    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme })
      await page.reload({ waitUntil: 'networkidle' })

      for (const target of CONTRAST_TARGETS) {
        const ratio = await contrastOf(page, target.selector)
        assert.isNotNull(ratio, `${target.name} introuvable en thème ${scheme}`)
        assert.isAbove(
          ratio!,
          4.5,
          `${target.name} en thème ${scheme} : contraste ${ratio?.toFixed(2)}:1, en dessous du seuil AA`
        )
      }
    }
  })

  test('un choix explicite survit au rechargement, sans repasser par le client', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await createAdminUser()
    await browserContext.loginAs(user)

    // OS en sombre : sans choix explicite, la page suit le système.
    const page = await visit('/settings/me')
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.reload({ waitUntil: 'networkidle' })
    assert.equal(await page.getAttribute('html', 'data-theme'), 'dark')

    // L'utilisateur force « Clair » depuis la carte Apparence.
    await page.locator('[aria-labelledby="theme-label"] button').nth(1).click()
    await page.waitForFunction("document.documentElement.getAttribute('data-theme') === 'light'")

    // Rechargement complet, OS toujours en sombre : la préférence doit venir du
    // serveur. Si `data-theme` était posé après hydratation, la page afficherait
    // d'abord le thème système — c'est exactement le flash qu'on veut exclure.
    await page.reload({ waitUntil: 'commit' })
    assert.equal(
      await page.getAttribute('html', 'data-theme'),
      'light',
      'le thème forcé doit être rendu par le serveur, avant tout script'
    )
  })
})
