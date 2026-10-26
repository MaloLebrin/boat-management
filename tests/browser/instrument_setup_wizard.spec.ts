import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser, createBoatForUser } from '#tests/browser/helpers'

/**
 * Assistant « Connecter mon bateau » (#1023) — chemin plugin.
 *
 * L'adresse enregistrée est celle du service compose `signalk`
 * (`pnpm signalk:up`, http://localhost:3000) ; le plugin lui-même n'est pas
 * installé : un `POST /api/instruments/ingest` simulé joue son premier lot et
 * fait passer l'étape de connexion.
 */
test.group('E2E · Assistant de connexion Signal K', (group) => {
  group.each.setup(() => truncateDb())

  test('plugin : adresse, jeton, commande puis premier lot reçu', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await createBoatForUser(user, { name: 'Assistant Cutter' })
    await browserContext.loginAs(user)

    const page = await visit(`/boats/${boat.id}?tab=instruments`)
    await page.waitForLoadState('networkidle')

    await page.locator('[data-testid="instrument-setup-hardware-signalk"]').click()
    await page.locator('[data-testid="instrument-setup-path-plugin"]').click()
    await page.locator('input[name="setupBaseUrl"]').fill('http://localhost:3000')
    // Première source : rechargement complet (CSP par document) ; on l'attend
    // avant de générer le jeton, sinon le flash serait perdu avec la page.
    await Promise.all([
      page.waitForNavigation(),
      page.locator('[data-testid="instrument-setup-plugin"] form button[type="submit"]').click(),
    ])
    await page.waitForLoadState('networkidle')
    await page.locator('[data-testid="instrument-setup-generate"]').click()
    const code = page.locator('[data-testid="base-code-block"] code')
    await code.filter({ hasText: /FLEETAI_TOKEN=fai_ing_[A-Za-z0-9_-]+/ }).waitFor()
    const token = /FLEETAI_TOKEN=(fai_ing_[A-Za-z0-9_-]+)/.exec(await code.innerText())?.[1]
    assert.isDefined(token, 'la commande porte le jeton généré')

    const response = await page.request.post('/api/instruments/ingest', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        batchId: 'e2e-1',
        samples: [
          { path: 'navigation.speedOverGround', recordedAt: new Date().toISOString(), value: 2.5 },
        ],
      },
    })
    assert.isTrue(response.ok())

    // Le sondage `router.reload` (10 s) voit le lot : l'assistant passe à « Terminé ».
    await page
      .locator('[data-testid="instrument-setup-done"]')
      .waitFor({ state: 'visible', timeout: 40_000 })
  }).timeout(90_000)
})
