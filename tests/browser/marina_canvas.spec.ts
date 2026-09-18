import { test } from '@japa/runner'
import Boat from '#models/boat'
import Pontoon from '#models/pontoon'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import { SpotFactory } from '#database/factories/spot_factory'
import { truncateDb } from '#tests/utils/db'
import {
  createEnterpriseAdminUser,
  createBoatForUser,
  createPortForUser,
} from '#tests/browser/helpers'
import type { Page } from 'playwright'
import type Spot from '#models/spot'
import type User from '#models/user'

/**
 * Le plan de port : le glisser-déposer et l'affectation depuis le plan (#700).
 *
 * `tests/functional/ports/layout_positions.spec.ts` (#695) prouve déjà les deux
 * routes de position, leur isolation inter-organisations et les bornes exactes
 * du canvas. Ce fichier ne les rejoue pas : il prouve que **le geste** atteint
 * la route, ce qu'aucun appel HTTP direct ne peut établir.
 *
 * Le rendu est du SVG inline — `<g>`, `<rect>`, `<text>` sont de vrais nœuds
 * DOM — et non un `<canvas>`, qui aurait rendu le parcours inadressable.
 *
 * Deux pièges mesurés :
 *
 * 1. **`locator.dragTo()` ne marche pas ici.** Il émet `mousedown/mousemove/
 *    mouseup` ; `MarinaCanvas` écoute `pointerdown/pointermove/pointerup`. Il
 *    faut passer par `page.mouse`, que Chromium traduit en événements pointeur.
 * 2. **Le geste est gardé par le mode édition** (`if (!props.editMode) return`),
 *    d'où le contre-exemple : sans lui, un drag sans effet se lirait comme un
 *    test vert.
 *
 * Le gating de plan (#604) impose `createEnterpriseAdminUser()`.
 */

/** Position de départ, choisie loin des bords pour que le déplacement tienne
 * dans le canvas (1400×900) sans être écrêté par le bornage. */
const START = { x: 120, y: 120 }
const DELTA = { x: 260, y: 140 }

async function decor(): Promise<{ user: User; pontoon: Pontoon; spot: Spot; boat: Boat }> {
  const user = await createEnterpriseAdminUser()
  const port = await createPortForUser(user, 'Port Test')
  const pontoon = await PontoonFactory.merge({
    portId: port.id,
    name: 'Pontoon Alpha',
    positionX: START.x,
    positionY: START.y,
  }).create()
  const spot = await SpotFactory.merge({
    organizationId: user.organizationId!,
    pontoonId: pontoon.id,
    name: 'A7',
  }).create()
  const boat = await createBoatForUser(user, { name: 'Dragged Sloop', propulsionType: 'motorboat' })
  return { user, pontoon, spot, boat }
}

/** Ouvre l'onglet « Port plan » : c'est un `ref` local, pas un paramètre d'URL. */
async function openPlanTab(page: Page) {
  await page.getByRole('button', { name: 'Port plan' }).click()
}

/** Un vrai geste de souris : Chromium en dérive les événements pointeur. */
async function dragBy(page: Page, testId: string, delta: { x: number; y: number }) {
  const box = await page.locator(`[data-testid="${testId}"]`).boundingBox()
  if (box === null) throw new Error(`${testId} n'a pas de boîte englobante`)
  const from = { x: box.x + 10, y: box.y + 10 }
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  // Un seul pas intermédiaire suffit, mais il est indispensable : sans
  // `pointermove`, `onSvgPointerUp` n'a aucune position à émettre.
  await page.mouse.move(from.x + delta.x / 2, from.y + delta.y / 2)
  await page.mouse.move(from.x + delta.x, from.y + delta.y)
  await page.mouse.up()
}

test.group('E2E · Marina plan', (group) => {
  group.each.setup(() => truncateDb())

  test('dragging a pontoon in edit mode persists its position', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const { user, pontoon } = await decor()
    await browserContext.loginAs(user)

    const page = await visit(`/ports/${pontoon.portId}`)
    await page.waitForLoadState('networkidle')
    await openPlanTab(page)
    await page.getByRole('button', { name: 'Edit layout' }).click()

    await dragBy(page, `marina-pontoon-${pontoon.id}`, DELTA)

    // La position part en PATCH : on attend que la base bouge plutôt que de
    // mesurer des pixels, qui dépendraient de la mise en page du canvas.
    await page.waitForResponse(
      (r) => r.url().includes(`/pontoons/${pontoon.id}/position`) && r.status() < 400
    )

    const moved = await Pontoon.findOrFail(pontoon.id)
    assert.notEqual(moved.positionX, START.x)
    assert.notEqual(moved.positionY, START.y)
    assert.isAtLeast(moved.positionX!, 0)
    assert.isAtMost(moved.positionX!, 1400)
    assert.isAtMost(moved.positionY!, 900)
  })

  test('the same drag outside edit mode moves nothing', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const { user, pontoon } = await decor()
    await browserContext.loginAs(user)

    const page = await visit(`/ports/${pontoon.portId}`)
    await page.waitForLoadState('networkidle')
    await openPlanTab(page)
    // Pas de bascule : le plan reste en lecture.
    await page.assertExists('button:has-text("Edit layout")')

    // Lire la base juste après le geste ne prouve rien : le PATCH mettrait une
    // seconde à arriver et l'assertion passerait même si la garde disparaissait
    // (mesuré). On observe donc les requêtes, ce qui ne dépend d'aucun délai.
    const positionCalls: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/position')) positionCalls.push(r.url())
    })

    await dragBy(page, `marina-pontoon-${pontoon.id}`, DELTA)
    // Un aller-retour réseau quelconque : si un PATCH devait partir, il serait
    // déjà parti quand celui-ci revient.
    await page.evaluate(() => fetch('/ports').then(() => undefined))

    assert.deepEqual(positionCalls, [])
    const untouched = await Pontoon.findOrFail(pontoon.id)
    assert.equal(untouched.positionX, START.x)
    assert.equal(untouched.positionY, START.y)
  })

  test('assigning a boat to a berth from the plan writes the mooring', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const { user, pontoon, spot, boat } = await decor()
    await browserContext.loginAs(user)

    const page = await visit(`/ports/${pontoon.portId}`)
    await page.waitForLoadState('networkidle')
    await openPlanTab(page)

    await page.locator(`[data-testid="marina-spot-${spot.id}"]`).click()

    // `BaseModal` rend son titre dans un `<p>` et le reporte en `aria-label`
    // du `role="dialog"` : c'est par le nom accessible de la modale qu'on la
    // reconnaît, pas par un `heading`.
    const modal = page.getByRole('dialog', { name: 'Assign a boat — Berth A7' })
    await modal.waitFor()
    await modal.getByRole('radio', { name: 'Dragged Sloop' }).check()
    await modal.getByRole('button', { name: 'Assign' }).click()

    await page.waitForResponse(
      (r) => r.url().includes(`/boats/${boat.id}/assignment`) && r.status() < 400
    )

    const moored = await Boat.findOrFail(boat.id)
    assert.equal(moored.spotId, spot.id)
  })
})
