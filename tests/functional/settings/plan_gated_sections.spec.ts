import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser } from '#tests/functional/helpers'

const AI_CUSTOMIZATION_FLASH =
  'Customising the AI prompt requires the Enterprise plan. AI and the Copilot are available on Pro, but the business context can only be tailored on Enterprise.'

/**
 * Sections de réglages fermées par un flag de plan (#456). `createAdminUser()`
 * crée un admin d'une organisation en plan **Pro** : `canCustomizeAI` et
 * `canWhiteLabel` y sont `false`.
 *
 * Le bug d'origine : la redirection était muette. Sur `/settings/ai` c'était
 * d'autant plus déroutant que la carte plan coche « IA / Copilot » en Pro —
 * l'IA *est* incluse, seule la personnalisation du prompt ne l'est pas.
 *
 * `.redirects(0)` partout : le flash est consommé par la page de destination
 * dès que le client suit la redirection.
 */
test.group('Plan-gated settings sections (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('the AI settings page opens for a Pro org (BYOK key lives there)', async ({ client }) => {
    // Depuis le copilote FleetAi, la page `/settings/ai` est ouverte dès
    // `canUseAI` : elle héberge la clé API Mistral (BYOK), outil de maîtrise
    // des coûts. La personnalisation prompt/modèle reste gardée par
    // `canCustomizeAI` (test suivant) et masquée côté front.
    const user = await createAdminUser()

    const response = await client.get('/settings/ai').loginAs(user)

    response.assertStatus(200)
  })

  test('updating AI settings on a Pro org is refused with the same explanation', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()

    const response = await client
      .put('/settings/ai')
      .loginAs(user)
      .form({ aiSystemPrompt: 'contexte injecté sans y avoir droit' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/settings/billing')
    response.assertFlashMessage('error', AI_CUSTOMIZATION_FLASH)

    // La garde doit bloquer l'écriture, pas seulement masquer l'écran.
    await user.load('organization')
    assert.isNull(user.organization.aiSystemPrompt)
  })

  test('branding redirects a Pro org to billing with an explicit flash', async ({ client }) => {
    const user = await createAdminUser()

    const response = await client.get('/settings/branding').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/settings/billing')
    response.assertFlashMessage(
      'error',
      'White labelling (logo and colours) requires the Enterprise plan.'
    )
  })

  test('an Enterprise org reaches both sections', async ({ client }) => {
    const user = await createAdminUser()
    await user.load('organization')
    user.organization.plan = 'enterprise'
    await user.organization.save()

    const ai = await client.get('/settings/ai').loginAs(user)
    ai.assertStatus(200)

    const branding = await client.get('/settings/branding').loginAs(user)
    branding.assertStatus(200)
  })
})
