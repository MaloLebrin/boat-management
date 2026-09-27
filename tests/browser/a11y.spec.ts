import { test } from '@japa/runner'
import { AxeBuilder } from '@axe-core/playwright'
import type { Page } from 'playwright'
import { truncateDb } from '#tests/utils/db'
import { createBoatForUser, createCharterAdminUser } from '#tests/browser/helpers'

/**
 * Accessibilité (#861) — axe-core sur les écrans clés et sur une modale ouverte.
 *
 * Règles WCAG 2.1 A/AA ; aucune violation `serious` ni `critical` tolérée. Les
 * violations `minor`/`moderate` ne bloquent pas encore : cette spec pose le
 * socle qui rend l'audit écran par écran mesurable, pas l'audit lui-même.
 */

/**
 * Expressions évaluées dans la page, passées en chaîne : ce fichier est typé
 * sans la lib `dom`.
 */
const FOCUS_IN_DIALOG = `document.querySelector('[role="dialog"]')?.contains(document.activeElement) === true`

const BLOCKING_IMPACTS = new Set(['serious', 'critical'])

async function blockingViolations(page: Page, include?: string) {
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  if (include) builder.include(include)
  const { violations } = await builder.analyze()
  return violations
    .filter((v) => BLOCKING_IMPACTS.has(v.impact ?? ''))
    .map((v) => ({
      rule: v.id,
      impact: v.impact,
      nodes: v.nodes.slice(0, 5).map((n) => `${n.target.join(' ')} — ${n.failureSummary ?? ''}`),
    }))
}

test.group('E2E · Accessibilité (axe)', (group) => {
  group.each.setup(() => truncateDb())

  for (const scheme of ['light', 'dark'] as const) {
    test(`aucune violation serious/critical sur les écrans clés (${scheme})`, async ({
      browserContext,
      visit,
      assert,
    }) => {
      const user = await createCharterAdminUser()
      const boat = await createBoatForUser(user, { propulsionType: 'motorboat' })
      await browserContext.loginAs(user)

      for (const url of ['/dashboard', `/boats/${boat.id}`, '/planning', '/settings/billing']) {
        const page = await visit(url)
        await page.emulateMedia({ colorScheme: scheme })
        await page.reload({ waitUntil: 'networkidle' })
        assert.equal(await page.getAttribute('html', 'data-theme'), scheme)

        assert.deepEqual(await blockingViolations(page), [], `${url} (${scheme})`)
      }
    })
  }

  test('aucune violation serious/critical dans une modale ouverte', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await createCharterAdminUser()
    const boat = await createBoatForUser(user, { propulsionType: 'motorboat' })
    await browserContext.loginAs(user)

    const page = await visit(`/boats/${boat.id}/edit`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('dialog').waitFor()

    assert.deepEqual(await blockingViolations(page, '[role="dialog"]'), [])
  })
})

test.group('E2E · Accessibilité (clavier)', (group) => {
  group.each.setup(() => truncateDb())

  test('le focus entre dans la modale, y reste, puis revient au déclencheur', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await createCharterAdminUser()
    const boat = await createBoatForUser(user, { propulsionType: 'motorboat' })
    await browserContext.loginAs(user)

    const page = await visit(`/boats/${boat.id}/edit`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Delete', exact: true }).focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await dialog.waitFor()

    const focusInDialog = () => page.evaluate<boolean>(FOCUS_IN_DIALOG)
    await page.waitForFunction(FOCUS_IN_DIALOG)

    // Plus de Tab qu'il n'y a de boutons : le focus boucle sans jamais sortir.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      assert.isTrue(await focusInDialog(), `Tab n°${i + 1} est sorti de la modale`)
    }
    await page.keyboard.press('Shift+Tab')
    assert.isTrue(await focusInDialog(), 'Maj+Tab est sorti de la modale')

    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'detached' })
    assert.equal(
      await page.evaluate<string>('document.activeElement?.textContent?.trim()'),
      'Delete',
      'le focus doit revenir sur le bouton qui a ouvert la modale'
    )
  })

  test('le lien d’évitement est le premier arrêt de Tab et mène au contenu', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await createCharterAdminUser()
    await browserContext.loginAs(user)

    const page = await visit('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to content' })
    assert.equal(
      await page.evaluate<string>(`document.activeElement?.getAttribute('href')`),
      '#main'
    )
    assert.isTrue(await skip.isVisible(), 'le lien doit apparaître quand il a le focus')

    await page.keyboard.press('Enter')
    assert.equal(await page.evaluate<string>('document.activeElement?.id'), 'main')
  })
})
