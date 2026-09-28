import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { DateTime } from 'luxon'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import { createAdminUser, createBoatForUser } from '#tests/browser/helpers'

/**
 * #869 — glisser-déposer du kanban `/planning`, de bout en bout : la carte
 * saisie par sa poignée et lâchée sur une colonne change d'échéance en base.
 *
 * Le contexte navigateur n'émule pas le tactile (voir `mobile_field.spec.ts`) :
 * le second test rejoue le geste en Pointer Events `pointerType: 'touch'`, le
 * chemin qu'emprunte un doigt — `usePointerDrag` n'écoute que ceux-là.
 */

const DESKTOP = { width: 1280, height: 900 }

async function seedTask() {
  const user = await createAdminUser()
  const boat = await createBoatForUser(user, { name: 'Drag Boat' })
  const task = await BoatMaintenanceTask.create({
    boatId: boat.id,
    subject: 'hull',
    title: 'Carénage à déplacer',
    status: 'open',
    dueAt: DateTime.fromISO(DateTime.now().plus({ days: 3 }).toISODate()!),
    dueEngineHours: null,
  })
  return { user, task }
}

const TOUCH_DRAG_JS = (taskId: number) => `(() => {
  const handle = document.querySelector('[data-testid="planning-task-card-${taskId}"] [data-testid="planning-task-drag-handle"]')
  const target = document.querySelector('[data-testid="planning-drop-undated"]')
  const from = handle.getBoundingClientRect()
  const to = target.getBoundingClientRect()
  const at = (x, y) => ({ clientX: x, clientY: y, pointerType: 'touch', isPrimary: true, button: 0, bubbles: true })
  const x0 = from.left + from.width / 2, y0 = from.top + from.height / 2
  const x1 = to.left + to.width / 2, y1 = to.top + 20
  handle.dispatchEvent(new PointerEvent('pointerdown', at(x0, y0)))
  window.dispatchEvent(new PointerEvent('pointermove', at(x0 + 10, y0 + 10)))
  window.dispatchEvent(new PointerEvent('pointermove', at(x1, y1)))
  window.dispatchEvent(new PointerEvent('pointerup', at(x1, y1)))
})()`

test.group('Planning — glisser-déposer (#869)', (group) => {
  group.each.setup(() => truncateDb())

  test('à la souris, une carte « Bientôt » lâchée sur « Planifiées » change d’échéance', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const { user, task } = await seedTask()
    await browserContext.loginAs(user)

    const page = await visit('/planning')
    await page.setViewportSize(DESKTOP)
    await page.goto('/planning', { waitUntil: 'networkidle' })

    const handle = page.locator(
      `[data-testid="planning-task-card-${task.id}"] [data-testid="planning-task-drag-handle"]`
    )
    const target = page.locator('[data-testid="planning-drop-planned"]')
    const from = (await handle.boundingBox())!
    const to = (await target.boundingBox())!

    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(from.x + 30, from.y + 30, { steps: 4 })
    await page.mouse.move(to.x + to.width / 2, to.y + 40, { steps: 8 })
    // La carte bouge d'abord en optimiste : on attend le rechargement qui suit le PATCH.
    const reloaded = page.waitForResponse(
      (r) => r.request().method() === 'GET' && r.url().endsWith('/planning')
    )
    await page.mouse.up()
    await reloaded

    await page
      .locator(
        `[data-testid="planning-drop-planned"] [data-testid="planning-task-card-${task.id}"]`
      )
      .waitFor()
    await page.waitForLoadState('networkidle')

    await task.refresh()
    assert.isTrue(task.dueAt! > DateTime.now().plus({ days: 30 }))
  })

  test('au doigt (Pointer Events touch), la carte lâchée sur « Non datées » perd son échéance', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const { user, task } = await seedTask()
    await browserContext.loginAs(user)

    const page = await visit('/planning')
    await page.setViewportSize(DESKTOP)
    await page.goto('/planning', { waitUntil: 'networkidle' })

    const reloaded = page.waitForResponse(
      (r) => r.request().method() === 'GET' && r.url().endsWith('/planning')
    )
    await page.evaluate(TOUCH_DRAG_JS(task.id))
    await reloaded
    await page
      .locator(
        `[data-testid="planning-drop-undated"] [data-testid="planning-task-card-${task.id}"]`
      )
      .waitFor()
    await page.waitForLoadState('networkidle')

    await task.refresh()
    assert.isNull(task.dueAt)
  })
})
