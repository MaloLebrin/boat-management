import { test } from '@japa/runner'
import Boat from '#models/boat'
import User from '#models/user'
import { truncateDb } from '#tests/utils/db'
import { DEFAULT_PASSWORD } from '#tests/browser/helpers'
import type { Page } from 'playwright'

/**
 * Le chemin d'acquisition, du simulateur public à la fiche du bateau (#700).
 *
 * Ce que ce fichier prouve et que rien d'autre ne prouve :
 *
 * 1. **L'orchestration du stepper.** Le nombre d'étapes est calculé
 *    (`simulator.vue`, `needsEngineStep` / `needsRiggingStep`) : six pour un
 *    voilier à moteur, cinq pour un bateau à moteur. Les tests Vitest montent
 *    chaque étape isolément, jamais la séquence.
 * 2. **L'enchaînement des auto-avances.** Les étapes d'usure n'ont pas de
 *    bouton « Suivant » : `SimulatorStepWear` émet `next` 320 ms après le clic.
 *    `simulator_step_wear.spec.ts` prouve un `emit` isolé ; personne ne prouve
 *    que trois ou quatre d'affilée aboutissent au résultat.
 * 3. **La jointure de session entre deux contrôleurs** —
 *    `new_account_controller.ts` : s'il reste un `simulatorBoat` en session au
 *    moment de l'inscription, le bateau est créé et l'utilisateur atterrit sur
 *    sa fiche au lieu du tableau de bord. `grep -rn "simulatorBoat" tests/` ne
 *    renvoyait que le POST amont : ce bloc n'était exercé nulle part.
 *
 * Le contre-exemple de (3) est déjà dans la suite : « a visitor creates an
 * account through the real /signup form » (`auth.spec.ts`) atterrit sur
 * `/dashboard`. Un atterrissage inconditionnel sur `/boats/:id` le ferait
 * tomber — inutile de le redoubler ici.
 */

const SIMULATOR = '/en/maintenance-cost-simulator'

/** Étape 1 : le seul écran du wizard qui demande une saisie. */
async function fillBoatStep(
  page: Page,
  options: { type: string; lengthM: string; yearBuilt: string }
) {
  await page.locator(`[aria-label="${options.type}"]`).click()
  await page.locator('#lengthM').fill(options.lengthM)
  await page.locator('#yearBuilt').fill(options.yearBuilt)
  await page.locator('[aria-label="B - Coastal (waves <= 4m)"]').click()
  await page.getByRole('button', { name: 'Next →' }).click()
}

/**
 * Les étapes d'usure ne portent pas de bouton : la carte choisie déclenche
 * `emit('next')` après 320 ms. On attend donc la disparition de la carte
 * plutôt qu'un changement d'URL — le wizard ne navigue pas.
 */
async function pickWear(page: Page, label: string) {
  const card = page.locator(`[aria-label="${label} : Good condition"]`)
  await card.click()
  await card.waitFor({ state: 'detached' })
}

test.group('E2E · Simulator to signup', (group) => {
  group.each.setup(() => truncateDb())

  test('a sailboat gets the rigging step, a motorboat does not', async ({ visit, assert }) => {
    const page = await visit(SIMULATOR)
    await page.waitForLoadState('networkidle')

    await page.locator('[aria-label="Sailboat"]').click()
    // Le gréement n'apparaît au stepper que pour un voilier ou un catamaran.
    assert.equal(await page.getByText('Rigging', { exact: true }).count(), 1)

    await page.locator('[aria-label="Motorboat"]').click()
    assert.equal(await page.getByText('Rigging', { exact: true }).count(), 0)
    // La propulsion, elle, reste : un bateau à moteur en a forcément une.
    assert.equal(await page.getByText('Propulsion', { exact: true }).count(), 1)
  })

  test('the wear steps chain their auto-advance up to the estimate', async ({ visit }) => {
    const page = await visit(SIMULATOR)
    await page.waitForLoadState('networkidle')

    await fillBoatStep(page, { type: 'Sailboat', lengthM: '11', yearBuilt: '2010' })
    await page.locator('[aria-label="Under cover"]').click()
    await page.getByRole('button', { name: 'Next →' }).click()

    // Quatre auto-avances d'affilée — hull, engine, safety, rigging.
    await pickWear(page, 'Hull condition')
    await pickWear(page, 'Engine condition')
    await pickWear(page, 'Safety equipment condition')
    await pickWear(page, 'Rigging condition')

    await page.getByRole('heading', { name: 'Your annual budget estimate' }).waitFor()
  })

  test('signing up from the simulator lands on the pre-created boat', async ({ visit, assert }) => {
    const page = await visit(SIMULATOR)
    await page.waitForLoadState('networkidle')

    await fillBoatStep(page, { type: 'Motorboat', lengthM: '8.5', yearBuilt: '2015' })
    await page.locator('[aria-label="Outdoors"]').click()
    await page.getByRole('button', { name: 'Next →' }).click()
    await pickWear(page, 'Hull condition')
    await pickWear(page, 'Engine condition')
    await pickWear(page, 'Safety equipment condition')

    // Le CTA anonyme pose le bateau en session et envoie vers l'inscription.
    await page.getByRole('button', { name: 'Create my account and register my boat' }).click()
    await page.waitForURL('**/signup?from=simulator')
    // La page est contextualisée : c'est la prop `fromSimulator` qui le dit.
    await page.assertTextContains('body', 'Your boat will be automatically added')

    await page.locator('#firstName').fill('Simone')
    await page.locator('#lastName').fill('Ocean')
    await page.locator('#email').fill('simone.simulator@example.com')
    await page.locator('#password').fill(DEFAULT_PASSWORD)
    await page.locator('#organizationName').fill('Simulator Marina')
    await page.locator('#organizationType').selectOption('marina')
    await page.locator('#fleetSize').selectOption('1-4')
    await page.locator('#acceptTerms').check()
    await page.locator('button[type="submit"]').click()

    // Le trou que #700 nomme : on n'atterrit pas sur /dashboard.
    await page.waitForURL(/\/boats\/\d+$/)

    const user = await User.findByOrFail('email', 'simone.simulator@example.com')
    const boats = await Boat.query().where('organizationId', user.organizationId!)
    assert.lengthOf(boats, 1)
    assert.equal(boats[0].propulsionType, 'motorboat')
    assert.equal(Number(boats[0].lengthM), 8.5)
    assert.include(page.url(), `/boats/${boats[0].id}`)
  })
})
