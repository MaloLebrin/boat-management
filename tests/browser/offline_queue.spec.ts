import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import NavigationLog from '#models/navigation_log'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser, createBoatForUser } from '#tests/browser/helpers'
import type { Page } from 'playwright'
import type Boat from '#models/boat'
import type User from '#models/user'

/**
 * Le protocole hors-ligne, dans un vrai navigateur (#700).
 *
 * Pourquoi ici et pas en fonctionnel : le conflit se signale par un **flash
 * Inertia** (`conflictData` + `conflictType`) posé sur une 302, que
 * `drainQueue` relit dans `onSuccess`. Avec `SESSION_DRIVER=memory`, le flash
 * ne survit pas d'une requête à l'autre — c'est ce que dit l'en-tête de
 * `tests/unit/middleware/inertia_offline_protocol.spec.ts`, qui se rabat pour
 * cette raison sur un test unitaire du middleware. Dans un navigateur, le
 * cookie de session porte le flash et la couture devient observable.
 *
 * Les deux moitiés du protocole sont déjà prouvées séparément — ~39 cas Vitest
 * sur `use_offline_queue` avec `fake-indexeddb`, et le verrou optimiste côté
 * serveur par `tests/functional/navigation/offline_conflict_payload.spec.ts`.
 * Ce fichier ne les rejoue pas : il prouve **le raccord**, c'est-à-dire
 * `navigator.onLine` → IndexedDB → événement `online` → rejeu → base.
 *
 * Décor : `/boats/:id?tab=navigation-logs` porte à la fois le formulaire de
 * création et celui de clôture, et le layout y monte `OfflinePendingQueue` et
 * `ConflictResolutionModal` (`inertia/layouts/default.vue`). Un seul écran
 * suffit donc — ce qui compte, la suite tournant sur le Vite de dev où chaque
 * premier hit transpile.
 *
 * ⚠️ Ne jamais **naviguer** pendant la coupure : le service worker est
 * désactivé sous test (`vite.config.ts`, #496), donc aucune page n'est en
 * cache. `enqueue()` court côté client avant toute requête réseau, le parcours
 * n'en a pas besoin.
 */

const LOGS_TAB = (boatId: number) => `/boats/${boatId}/?tab=navigation-logs`

/**
 * Deux affordances mènent au même formulaire sur cet écran : l'encart
 * « Underway » de l'en-tête (`NavigationActiveCard`) et la liste de l'onglet.
 * Les boutons y portent le même libellé et les champs le même `id` — cibler
 * par rôle depuis la page tombe donc sur deux éléments. On ouvre par le
 * premier bouton, puis on ne parle plus qu'au formulaire réellement monté.
 */
function createForm(page: Page) {
  return page.locator('form').filter({ has: page.locator('#departedAt') })
}

function closeForm(page: Page) {
  return page.locator('form').filter({ has: page.locator('#arrivedAt') })
}

async function decor(): Promise<{ user: User; boat: Boat }> {
  const user = await createAdminUser()
  const boat = await createBoatForUser(user, {
    name: 'Offline Ketch',
    propulsionType: 'motorboat',
  })
  return { user, boat }
}

/** Une sortie en cours, la seule forme que le bouton « Close trip » accepte. */
function inProgressLog(user: User, boat: Boat) {
  return NavigationLogFactory.merge({
    boatId: boat.id,
    organizationId: user.organizationId!,
    status: 'in_progress',
    notes: 'Server notes',
  }).create()
}

test.group('E2E · Offline queue', (group) => {
  group.each.setup(() => truncateDb())

  test('an entry created offline goes to the queue and nothing is written', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const { user, boat } = await decor()
    await browserContext.loginAs(user)

    const page = await visit(LOGS_TAB(boat.id))
    await page.waitForLoadState('networkidle')

    await browserContext.setOffline(true)
    await page.getByRole('button', { name: '+ New trip' }).first().click()
    const form = createForm(page)
    await form.locator('#crewCount').fill('4')
    await form.getByRole('button', { name: 'Save', exact: true }).click()

    // La file est le seul témoin visible : le formulaire se referme sans requête.
    await page.locator('[data-test="queue-group"]').waitFor()
    await page.assertTextContains('[data-test="queue-group"]', 'New trip log')

    // Témoin en base : rien n'est parti (cf. la règle posée par #697).
    assert.lengthOf(await NavigationLog.all(), 0)
  })

  test('going back online replays the queue and writes the row', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const { user, boat } = await decor()
    await browserContext.loginAs(user)

    const page = await visit(LOGS_TAB(boat.id))
    await page.waitForLoadState('networkidle')

    await browserContext.setOffline(true)
    await page.getByRole('button', { name: '+ New trip' }).first().click()
    const form = createForm(page)
    await form.locator('#crewCount').fill('7')
    await form.getByRole('button', { name: 'Save', exact: true }).click()
    await page.locator('[data-test="queue-group"]').waitFor()

    // `use_network_status` écoute l'événement `online`, et `default.vue` le
    // relaie à `drainQueue` par un watch. C'est ce câblage-là qu'on mesure.
    await browserContext.setOffline(false)

    await page.locator('[data-test="queue-group"]').waitFor({ state: 'detached' })

    const logs = await NavigationLog.all()
    assert.lengthOf(logs, 1)
    assert.equal(logs[0].crewCount, 7)
    assert.equal(logs[0].boatId, boat.id)
  })

  test('the Sync now button drains the queue without an online event', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const { user, boat } = await decor()
    await browserContext.loginAs(user)

    const page = await visit(LOGS_TAB(boat.id))
    await page.waitForLoadState('networkidle')

    await browserContext.setOffline(true)
    await page.getByRole('button', { name: '+ New trip' }).first().click()
    const form = createForm(page)
    await form.locator('#crewCount').fill('2')
    await form.getByRole('button', { name: 'Save', exact: true }).click()
    await page.locator('[data-test="queue-group"]').waitFor()

    // Le bouton est l'autre voie de déclenchement, et il faut l'isoler de la
    // première : `setOffline(false)` émet l'événement `online`, que
    // `default.vue` relaie à `drainQueue`. On ferme donc la page **avant** de
    // rétablir le réseau — sans page montée, aucun watch ne reçoit la
    // transition. La file, elle, vit dans IndexedDB, qui est attaché au
    // contexte : elle survit à la fermeture.
    await page.close()
    await browserContext.setOffline(false)

    const relaunched = await visit(LOGS_TAB(boat.id))
    await relaunched.waitForLoadState('networkidle')
    await relaunched.locator('[data-test="queue-group"]').waitFor()
    // Le montage en ligne n'a rien vidé : c'est bien le bouton qu'on mesure.
    assert.lengthOf(await NavigationLog.all(), 0)

    await relaunched.getByRole('button', { name: 'Sync now' }).click()
    await relaunched.locator('[data-test="queue-group"]').waitFor({ state: 'detached' })
    assert.lengthOf(await NavigationLog.all(), 1)
  })

  test('a server-side edit during the outage opens the conflict modal', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const { user, boat } = await decor()
    const log = await inProgressLog(user, boat)
    await browserContext.loginAs(user)

    const page = await visit(LOGS_TAB(boat.id))
    await page.waitForLoadState('networkidle')

    await browserContext.setOffline(true)
    await page.getByRole('button', { name: 'Close trip', exact: true }).first().click()
    const form = closeForm(page)
    await form.locator('#distanceNm').fill('42')
    await form.getByRole('button', { name: 'Close trip', exact: true }).click()
    await page.locator('[data-test="queue-group"]').waitFor()

    // Quelqu'un d'autre touche la sortie pendant la coupure : `updatedAt`
    // avance, et le `_expectedUpdatedAt` enfilé par le formulaire devient périmé.
    log.notes = 'Changed by someone else'
    log.updatedAt = DateTime.now().plus({ minutes: 5 })
    await log.save()

    await browserContext.setOffline(false)

    await page.getByRole('heading', { name: 'Conflict detected' }).waitFor()
    // La file est en pause tant que l'arbitrage n'est pas rendu.
    await page.assertExists('[data-test="queue-group"]')

    const fresh = await NavigationLog.findOrFail(log.id)
    assert.equal(fresh.status, 'in_progress')
    assert.isNull(fresh.distanceNm)
  })

  test('“Use server version” drops the queued action and leaves the row alone', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const { user, boat } = await decor()
    const log = await inProgressLog(user, boat)
    await browserContext.loginAs(user)

    const page = await visit(LOGS_TAB(boat.id))
    await page.waitForLoadState('networkidle')

    await browserContext.setOffline(true)
    await page.getByRole('button', { name: 'Close trip', exact: true }).first().click()
    const form = closeForm(page)
    await form.locator('#distanceNm').fill('42')
    await form.getByRole('button', { name: 'Close trip', exact: true }).click()
    await page.locator('[data-test="queue-group"]').waitFor()

    log.updatedAt = DateTime.now().plus({ minutes: 5 })
    await log.save()
    await browserContext.setOffline(false)
    await page.getByRole('heading', { name: 'Conflict detected' }).waitFor()

    await page.getByRole('button', { name: 'Use server version' }).click()

    await page.locator('[data-test="queue-group"]').waitFor({ state: 'detached' })
    const fresh = await NavigationLog.findOrFail(log.id)
    assert.equal(fresh.status, 'in_progress')
    assert.isNull(fresh.distanceNm)
  })

  test('“Keep my changes” re-queues with the fresh version and the closure lands', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const { user, boat } = await decor()
    const log = await inProgressLog(user, boat)
    await browserContext.loginAs(user)

    const page = await visit(LOGS_TAB(boat.id))
    await page.waitForLoadState('networkidle')

    await browserContext.setOffline(true)
    await page.getByRole('button', { name: 'Close trip', exact: true }).first().click()
    const form = closeForm(page)
    await form.locator('#distanceNm').fill('42')
    await form.getByRole('button', { name: 'Close trip', exact: true }).click()
    await page.locator('[data-test="queue-group"]').waitFor()

    log.updatedAt = DateTime.now().plus({ minutes: 5 })
    await log.save()
    await browserContext.setOffline(false)
    await page.getByRole('heading', { name: 'Conflict detected' }).waitFor()

    // `resolveConflict('local')` ré-enfile l'action avec le `updatedAt` du
    // serveur : le second passage franchit le verrou optimiste.
    await page.getByRole('button', { name: 'Keep my changes' }).click()

    await page.locator('[data-test="queue-group"]').waitFor({ state: 'detached' })
    const fresh = await NavigationLog.findOrFail(log.id)
    assert.equal(fresh.status, 'completed')
    assert.equal(Number(fresh.distanceNm), 42)
  })
})
