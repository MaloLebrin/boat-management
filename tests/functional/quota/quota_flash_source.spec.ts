import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import OrganizationMembership from '#models/organization_membership'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import type { PlanTier } from '#shared/types/plan'

const AI_EXCEEDED =
  'AI features are not available on your current plan. Upgrade to Pro or Enterprise.'
const EXPORT_EXCEEDED =
  'Export is not available on your current plan. Upgrade to Pro or Enterprise.'
const PRICING_EXCEEDED =
  'Seasonal pricing is part of the Charter module — included with Enterprise, or available as an add-on on the Pro plan.'

async function starterAdmin() {
  const user = await UserFactory.with('organization', 1, (org) =>
    org.merge({ plan: 'starter' as PlanTier })
  ).create()
  await OrganizationMembership.create({
    userId: user.id,
    organizationId: user.organizationId!,
    role: 'admin',
  })
  return user
}

async function starterAdminWithBoat() {
  const user = await starterAdmin()
  const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
  return { user, boat }
}

/**
 * Refus de quota sur un plan `starter` : message et action d'upsell.
 *
 * Un seul endroit décide désormais des deux — la branche `QuotaExceededError`
 * du handler global. Les contrôleurs qui réinterceptaient l'erreur rendaient
 * le même message mais perdaient `errorAction` vers /settings/billing (#418) :
 * ces cinq routes proposaient donc un refus sans porte de sortie. Le premier
 * commit de cette PR fige cet état, celui-ci le corrige.
 */
test.group('Refus de quota — message et upsell (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test("POST /ai/chat refuse l'IA en proposant les offres", async ({ client }) => {
    const user = await starterAdmin()

    const response = await client
      .post('/ai/chat')
      .json({ messages: [{ role: 'user', content: 'Bonjour' }] })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', AI_EXCEEDED)
    response.assertFlashMessage('errorAction', '/settings/billing')
  })

  test("l'export CSV refuse en proposant les offres", async ({ client }) => {
    const { user, boat } = await starterAdminWithBoat()

    const response = await client
      .get(`/boats/${boat.id}/export/maintenance.csv`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', EXPORT_EXCEEDED)
    response.assertFlashMessage('errorAction', '/settings/billing')
  })

  test('le PDF de carnet de maintenance refuse en proposant les offres', async ({ client }) => {
    const { user, boat } = await starterAdminWithBoat()

    const response = await client
      .get(`/boats/${boat.id}/maintenance-log.pdf`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', EXPORT_EXCEEDED)
    response.assertFlashMessage('errorAction', '/settings/billing')
  })

  test("le PDF d'historique de maintenance refuse en proposant les offres", async ({ client }) => {
    const user = await starterAdmin()

    const response = await client.get('/maintenance/history.pdf').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', EXPORT_EXCEEDED)
    response.assertFlashMessage('errorAction', '/settings/billing')
  })

  test('les périodes tarifaires refusent en proposant les offres', async ({ client }) => {
    const { user, boat } = await starterAdminWithBoat()

    const response = await client
      .put(`/boats/${boat.id}/pricing`)
      .json({ periods: [] })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', PRICING_EXCEEDED)
    response.assertFlashMessage('errorAction', '/settings/billing')
  })

  test('le quota bateaux propose les offres, comme avant', async ({ client }) => {
    const user = await starterAdmin()
    await BoatFactory.merge({ organizationId: user.organizationId! }).createMany(2)

    const response = await client
      .post('/boats')
      .loginAs(user)
      .form({ name: 'Overflow', propulsionType: 'motorboat' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('errorAction', '/settings/billing')
  })
})
