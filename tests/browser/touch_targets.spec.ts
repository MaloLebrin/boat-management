import { test } from '@japa/runner'
import type { Assert } from '@japa/assert'
import type { Browser, BrowserContext } from 'playwright'
import { truncateDb } from '#tests/utils/db'
import { BoatMaintenanceTaskFactory } from '#database/factories/boat_maintenance_task_factory'
import { createAdminUser, createBoatForUser } from '#tests/browser/helpers'

/**
 * #736 — mesurer les cibles tactiles de #494 là où un doigt les atteint.
 *
 * Le `browserContext` injecté par @japa/browser-client est créé une fois pour
 * toute la suite : ses `contextOptions` valent pour tous les specs, on ne peut
 * donc pas y activer `isMobile`/`hasTouch` sans émuler un téléphone partout.
 * Conséquence connue (#700) : les variantes `pointer-coarse:` ne s'activent
 * jamais dans `mobile_field.spec.ts`, qui ne valide que les breakpoints CSS.
 *
 * Ce fichier ouvre donc **son propre contexte**, le temps d'un test. Pas un
 * second `chromium.launch()` comme l'esquissait #736 : le navigateur de la
 * suite est déjà injecté (`browser`), et ses décorateurs sont posés par
 * `browser.newContext()` — le contexte dédié hérite donc de `loginAs()` et de
 * `visit()`. Il ne reste à ce fichier que son propre `close()`, en `finally`
 * (`forceExit: true` masquerait la fuite).
 */

const TOUCH_VIEWPORT = { width: 390, height: 844 }

/** Seuil Apple HIG retenu par #494. */
const MIN_TOUCH_TARGET = 44

const BASE_URL = `http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || '3333'}`

/**
 * Un contexte tactile : viewport de téléphone, `isMobile` (méta viewport) et
 * `hasTouch` (c'est lui qui bascule `(pointer: coarse)`).
 */
function newTouchContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    baseURL: BASE_URL,
    viewport: TOUCH_VIEWPORT,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  })
}

// Évalué comme string (pas de callback) : le tsconfig backend n'embarque pas la lib DOM
const POINTER_CAPABILITIES_JS = `({
  coarsePointer: window.matchMedia('(pointer: coarse)').matches,
  noHover: window.matchMedia('(hover: none)').matches,
  maxTouchPoints: navigator.maxTouchPoints,
})`

interface PointerCapabilities {
  coarsePointer: boolean
  noHover: boolean
  maxTouchPoints: number
}

interface TouchTarget {
  label: string
  visualWidth: number
  visualHeight: number
  width: number
  height: number
  reachable: boolean
}

/**
 * Mesure la cible tactile réelle de chaque élément d'un sélecteur.
 *
 * `getBoundingClientRect()` ne voit que la boîte visible : la pseudo-zone de
 * #494 est un `::before` absolu, invisible et hors de cette boîte. On lit donc
 * aussi `getComputedStyle(el, '::before')` — les utilitaires `-inset-*` la
 * centrent sur le contrôle, la cible est l'union des deux boîtes concentriques.
 *
 * `reachable` est le contrôle qui empêche la mesure de se confirmer elle-même :
 * les quatre bords de cette union sont interrogés par `elementFromPoint`. Une
 * pseudo-zone recouverte par un voisin, ou neutralisée par `pointer-events`,
 * mesurerait 44 px sans qu'un doigt n'atteigne rien.
 */
function touchTargetsJs(selector: string): string {
  return `(() => {
    const nodes = Array.from(document.querySelectorAll(${JSON.stringify(selector)}))

    const pseudoSize = (el) => {
      const style = window.getComputedStyle(el, '::before')
      if (!style || style.content === 'none' || style.position !== 'absolute') return null
      const width = Number.parseFloat(style.width)
      const height = Number.parseFloat(style.height)
      if (!Number.isFinite(width) || !Number.isFinite(height)) return null
      return { width, height }
    }

    const hits = (el, x, y) => {
      const found = document.elementFromPoint(x, y)
      return found !== null && (found === el || el.contains(found))
    }

    return nodes.map((el) => {
      const rect = el.getBoundingClientRect()
      const pseudo = pseudoSize(el)
      const width = Math.max(rect.width, pseudo ? pseudo.width : 0)
      const height = Math.max(rect.height, pseudo ? pseudo.height : 0)
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2

      return {
        label: (el.getAttribute('aria-label') || el.textContent || el.tagName)
          .trim()
          .replace(/\\s+/g, ' ')
          .slice(0, 40),
        visualWidth: rect.width,
        visualHeight: rect.height,
        width,
        height,
        reachable:
          hits(el, cx, cy - height / 2 + 1) &&
          hits(el, cx, cy + height / 2 - 1) &&
          hits(el, cx - width / 2 + 1, cy) &&
          hits(el, cx + width / 2 - 1, cy),
      }
    })
  })()`
}

function assertTouchTarget(assert: Assert, target: TouchTarget, context: string) {
  assert.isAtLeast(
    target.height,
    MIN_TOUCH_TARGET,
    `${context} — « ${target.label} » : cible haute de ${target.height}px (visuel ${target.visualHeight}px), minimum ${MIN_TOUCH_TARGET}px`
  )
  assert.isAtLeast(
    target.width,
    MIN_TOUCH_TARGET,
    `${context} — « ${target.label} » : cible large de ${target.width}px (visuel ${target.visualWidth}px), minimum ${MIN_TOUCH_TARGET}px`
  )
  assert.isTrue(
    target.reachable,
    `${context} — « ${target.label} » : les bords de la cible de ${target.width}×${target.height}px ne reçoivent pas le doigt (zone recouverte ou pointer-events neutralisé)`
  )
}

test.group('E2E · Cibles tactiles en contexte tactile dédié (#736)', (group) => {
  group.each.setup(() => truncateDb())

  /**
   * La raison d'être du fichier, et sa date de péremption : le jour où le
   * contexte de la suite émule le tactile, la seconde moitié de ce test tombe
   * — il n'y a alors plus qu'à mesurer depuis `mobile_field.spec.ts` et à
   * supprimer ce fichier.
   */
  test('le contexte dédié émule un pointeur grossier, celui de la suite non', async ({
    browser,
    browserContext,
    visit,
    assert,
  }) => {
    const user = await createAdminUser()

    const context = await newTouchContext(browser)
    try {
      await context.loginAs(user)
      const page = await context.visit('/dashboard')
      const touch = (await page.evaluate(POINTER_CAPABILITIES_JS)) as PointerCapabilities

      assert.isTrue(touch.coarsePointer, 'le contexte dédié devrait matcher (pointer: coarse)')
      assert.isTrue(touch.noHover, 'le contexte dédié devrait matcher (hover: none)')
      assert.isAbove(
        touch.maxTouchPoints,
        0,
        'le contexte dédié devrait déclarer des points de contact'
      )
    } finally {
      await context.close()
    }

    await browserContext.loginAs(user)
    const suitePage = await visit('/dashboard')
    const suite = (await suitePage.evaluate(POINTER_CAPABILITIES_JS)) as PointerCapabilities

    assert.isFalse(
      suite.coarsePointer,
      'le contexte de @japa/browser-client émule désormais le tactile : mesurer depuis mobile_field.spec.ts et supprimer ce fichier'
    )
  })

  test('les onglets de la bottom nav font au moins 44 px sous le doigt (#492)', async ({
    browser,
    assert,
  }) => {
    const user = await createAdminUser()

    const context = await newTouchContext(browser)
    try {
      await context.loginAs(user)
      const page = await context.visit('/dashboard')
      await page.waitForLoadState('networkidle')

      const navSelector = 'nav[aria-label]:has(a[href="/dashboard"])'
      await page.locator(navSelector).waitFor({ state: 'visible', timeout: 5000 })

      const tabs = (await page.evaluate(touchTargetsJs(`${navSelector} a`))) as TouchTarget[]

      assert.isAbove(tabs.length, 0, 'aucun onglet mesuré dans la bottom nav')
      for (const tab of tabs) {
        assertTouchTarget(assert, tab, 'bottom nav')
      }
    } finally {
      await context.close()
    }
  })

  /**
   * `size="sm"` mesure 32 px de haut : sans la pseudo-zone `pointer-coarse:`
   * de #494, la cible resterait 12 px sous le seuil. C'est le contrôle de
   * saisie d'une sortie en mer, utilisé debout sur un pont qui bouge.
   */
  test("le bouton de saisie d'une sortie en mer offre 44 px malgré ses 32 px visuels (#494)", async ({
    browser,
    assert,
  }) => {
    const user = await createAdminUser()
    await createBoatForUser(user, { name: 'Touch Target Boat' })

    const context = await newTouchContext(browser)
    try {
      await context.loginAs(user)
      const page = await context.visit('/navigation/logbook')
      await page.waitForLoadState('networkidle')

      const selector = '[data-testid="logbook-quick-add"]'
      await page.locator(selector).waitFor({ state: 'visible', timeout: 5000 })

      const [button] = (await page.evaluate(touchTargetsJs(selector))) as TouchTarget[]

      assert.isDefined(button, 'bouton de saisie rapide introuvable sur /navigation/logbook')
      // Le visuel garde sa densité : c'est la pseudo-zone qui porte les 44 px.
      assert.isBelow(
        button.visualHeight,
        MIN_TOUCH_TARGET,
        `le bouton mesure désormais ${button.visualHeight}px de haut : la pseudo-zone n'est plus ce qui le porte au seuil, ce test ne prouve plus rien`
      )
      assertTouchTarget(assert, button, 'saisie de sortie en mer')
    } finally {
      await context.close()
    }
  })

  /**
   * #828 — sur le tableau de bord, chaque ligne de maintenance urgente est un
   * lien pleine largeur et les « Voir tout / Voir le planning » portent
   * `min-h-11` : mesurés ici sous le doigt, pas seulement en classes CSS.
   */
  test('les lignes urgentes et les liens « voir tout » du dashboard font 44 px (#828)', async ({
    browser,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await createBoatForUser(user, { name: 'Touch Dashboard Boat' })
    await BoatMaintenanceTaskFactory.merge({ boatId: boat.id }).apply('overdue').createMany(2)

    const context = await newTouchContext(browser)
    try {
      await context.loginAs(user)
      const page = await context.visit('/dashboard')
      await page.waitForLoadState('networkidle')

      // Scopé à la colonne principale : `a[href="/planning"]` seul attraperait
      // aussi l'entrée « Planning » de la sidebar, masquée (0 px) en mobile.
      const selector = [
        '[data-testid="dashboard-urgent-row"]',
        '[data-testid="dashboard-view-all"]',
        '[data-testid="dashboard-main-column"] a[href="/planning"]',
      ].join(', ')
      await page.locator('[data-testid="dashboard-urgent-row"]').first().waitFor({
        state: 'visible',
        timeout: 5000,
      })

      // `elementFromPoint` ne voit que le viewport : la carte « Vos bateaux »
      // est sous la ligne de flottaison d'un téléphone, chaque cible est donc
      // amenée à l'écran avant sa mesure (le scroll vit dans `<main>`, #484).
      const locator = page.locator(selector)
      const count = await locator.count()
      assert.isAtLeast(count, 3, 'lignes urgentes ou liens du dashboard introuvables')

      for (let i = 0; i < count; i++) {
        await locator.nth(i).scrollIntoViewIfNeeded()
        const targets = (await page.evaluate(touchTargetsJs(selector))) as TouchTarget[]
        assertTouchTarget(assert, targets[i], 'dashboard')
      }
    } finally {
      await context.close()
    }
  })
})
