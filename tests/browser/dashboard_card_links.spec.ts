import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { DateTime } from 'luxon'
import { BoatMaintenanceTaskFactory } from '#database/factories/boat_maintenance_task_factory'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'
import { createAdminUser, createBoatForUser } from '#tests/browser/helpers'

test.group('E2E · Dashboard card links', (group) => {
  group.each.setup(() => truncateDb())

  test('the KPI cards lead to the fleet, the logbook, the planning and the incidents (#832)', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await createBoatForUser(user, { name: 'Pulse Boat' })
    await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      status: 'completed',
      arrivedAt: DateTime.now().minus({ days: 1 }),
      distanceNm: '18',
    }).create()

    await browserContext.loginAs(user)

    const page = await visit('/dashboard')
    await page.waitForLoadState('networkidle')

    await page.assertExists('[data-testid="dashboard-kpi-boats"][href="/boats"]')
    await page.assertExists('[data-testid="dashboard-kpi-tasks"][href="/planning"]')
    await page.assertExists('[data-testid="dashboard-kpi-incidents"][href="/navigation/incidents"]')
    // Plus de cartes équipement ni de carte « équipement vide » (#419 remplacée)
    await page.assertNotExists('a[href="/boats?hasEngine=true"]')
    await page.assertNotExists('[data-testid="equipment-empty-card"]')

    const trips = page.locator('[data-testid="dashboard-kpi-trips"]')
    assert.include(await trips.textContent(), '1')
    await trips.click()
    await page.waitForURL(/\/navigation\/logbook$/)
  })

  test('the attention list is capped, counts every task and opens the planning on a row (#832)', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await createBoatForUser(user, { name: 'Busy Boat' })
    // 8 tâches en retard : 6 affichées (ATTENTION_DISPLAY_CAP), toutes comptées
    await BoatMaintenanceTaskFactory.merge({ boatId: boat.id }).apply('overdue').createMany(8)

    await browserContext.loginAs(user)

    const page = await visit('/dashboard')
    await page.waitForLoadState('networkidle')

    const rows = page.locator('[data-testid="dashboard-attention-row"]')
    assert.equal(await rows.count(), 6, 'la liste « À traiter » doit être plafonnée à 6 lignes')
    const chip = page.locator('[data-testid="dashboard-attention-chip-maintenance"]')
    await chip.waitFor({ state: 'visible', timeout: 5000 })
    assert.include(await chip.textContent(), '8')
    await page.assertExists('[data-testid="dashboard-attention-more"]')

    await rows.first().click()
    await page.waitForURL(/\/planning\?task=\d+/)
  })
})
