import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'
import { BoatFuelLogFactory } from '#database/factories/boat_fuel_log_factory'
import BoatIncident from '#models/boat_incident'
import {
  createAdminUser,
  createBoatForUser,
  createMaintenanceEventForBoat,
} from '#tests/browser/helpers'

/**
 * #500 — écrans terrain en viewport mobile (épic #481, lots 2 et 4).
 *
 * Le `browserContext` de @japa/browser-client est créé sans options : pas de
 * `viewport`/`isMobile`/`hasTouch` au niveau contexte. On passe donc par
 * `page.setViewportSize()` — suffisant pour valider les breakpoints CSS,
 * insuffisant pour émuler le tactile (voir docs/dev/testing.md).
 */

const MOBILE = { width: 390, height: 844 }
const DESKTOP = { width: 1280, height: 800 }

const FIELD_SCREENS = [
  '/planning',
  '/maintenance/history',
  '/navigation/logbook',
  '/navigation/fuel',
  '/navigation/incidents',
]

async function seedFieldData() {
  const user = await createAdminUser()
  const boat = await createBoatForUser(user, { name: 'Mobile Field Boat' })
  await createMaintenanceEventForBoat(boat)
  await NavigationLogFactory.merge({
    boatId: boat.id,
    organizationId: user.organizationId!,
    status: 'completed',
    arrivedAt: null,
    departurePortName: 'Marseille',
    arrivalPortName: 'Cassis',
    distanceNm: 12,
  }).create()
  await BoatFuelLogFactory.merge({
    boatId: boat.id,
    organizationId: user.organizationId!,
    supplier: 'Total Marine',
  }).create()
  // Pas de factory incident : création directe par le modèle
  await BoatIncident.create({
    boatId: boat.id,
    organizationId: user.organizationId!,
    type: 'engine_failure',
    status: 'open',
    occurredAt: DateTime.now().minus({ days: 1 }),
    location: 'Cap Croisette',
    description: 'Surchauffe moteur',
    insuranceClaimed: false,
  })
  return { user, boat }
}

test.group('E2E · Écrans terrain en viewport mobile (#500)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('aucun débordement horizontal sur les écrans de terrain', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const { user, boat } = await seedFieldData()
    await browserContext.loginAs(user)

    const page = await visit('/dashboard')
    await page.setViewportSize(MOBILE)

    for (const url of [...FIELD_SCREENS, `/boats/${boat.id}`]) {
      await page.goto(url, { waitUntil: 'networkidle' })
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }))
      assert.isAtMost(
        scrollWidth,
        innerWidth,
        `${url} déborde horizontalement en mobile : scrollWidth=${scrollWidth} > innerWidth=${innerWidth}`
      )
    }
  })

  test('la bottom nav est visible sous lg et absente au-dessus (#492)', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await createAdminUser()
    await browserContext.loginAs(user)

    const page = await visit('/dashboard')
    const navSelector = 'nav[aria-label]:has(a[href="/dashboard"])'

    await page.setViewportSize(MOBILE)
    await page.goto('/dashboard', { waitUntil: 'networkidle' })
    const mobileNav = page.locator(navSelector)
    await mobileNav.waitFor({ state: 'visible', timeout: 5000 })
    const box = await mobileNav.boundingBox()
    assert.isNotNull(box, 'bottom nav absente du layout mobile')
    // Collée au bas du viewport, hauteur d'au moins 56 px
    assert.isAtLeast(box!.height, 56, `bottom nav trop basse : ${box!.height}px`)

    await page.setViewportSize(DESKTOP)
    assert.isFalse(
      await mobileNav.isVisible(),
      'la bottom nav doit disparaître au-dessus du breakpoint lg'
    )
  })

  test('les cartes remplacent la table en mobile sur les écrans navigation (#493)', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const { user } = await seedFieldData()
    await browserContext.loginAs(user)

    const page = await visit('/dashboard')

    for (const url of ['/navigation/logbook', '/navigation/fuel', '/navigation/incidents']) {
      await page.setViewportSize(MOBILE)
      await page.goto(url, { waitUntil: 'networkidle' })

      const state = await page.evaluate(() => {
        const table = document.querySelector('table')
        const cards = document.querySelector('.lg\\:hidden.space-y-3')
        const visible = (el: Element | null) =>
          el !== null && globalThis.getComputedStyle(el).display !== 'none'
        return {
          tableVisible: visible(table?.closest('div.hidden') ?? table),
          cardsVisible: visible(cards),
          cardCount: cards?.children.length ?? 0,
        }
      })

      assert.isTrue(state.cardsVisible, `${url} : les cartes mobiles ne rendent pas`)
      assert.isAbove(state.cardCount, 0, `${url} : aucune carte rendue`)
      assert.isFalse(state.tableVisible, `${url} : la table reste visible en mobile`)

      // Au-dessus de lg, la table revient et les cartes disparaissent
      await page.setViewportSize(DESKTOP)
      const desktop = await page.evaluate(() => {
        const table = document.querySelector('table')
        const cards = document.querySelector('.lg\\:hidden.space-y-3')
        const visible = (el: Element | null) =>
          el !== null && globalThis.getComputedStyle(el).display !== 'none'
        return { tableVisible: visible(table), cardsVisible: visible(cards) }
      })
      assert.isTrue(desktop.tableVisible, `${url} : la table doit revenir en desktop`)
      assert.isFalse(desktop.cardsVisible, `${url} : les cartes doivent disparaître en desktop`)
    }
  })

  test('le drawer reste atteignable en mobile', async ({ browserContext, visit, assert }) => {
    const user = await createAdminUser()
    await browserContext.loginAs(user)

    const page = await visit('/dashboard')
    await page.setViewportSize(MOBILE)
    await page.goto('/dashboard', { waitUntil: 'networkidle' })

    const hamburger = page.locator('button[aria-controls="auth-sidebar-drawer"]')
    await hamburger.waitFor({ state: 'visible', timeout: 5000 })
    await hamburger.click()

    const drawer = page.locator('#auth-sidebar-drawer')
    await drawer.waitFor({ state: 'visible', timeout: 5000 })
    const box = await drawer.boundingBox()
    assert.isNotNull(box, 'drawer non rendu après clic sur le hamburger')
    // Le drawer occupe toute la hauteur du viewport (h-dvh, #484)
    assert.isAtLeast(box!.height, MOBILE.height - 1, `drawer tronqué : ${box!.height}px`)
  })
})
