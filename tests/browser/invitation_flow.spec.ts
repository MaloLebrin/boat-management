import { test } from '@japa/runner'
import { createHash } from 'node:crypto'
import OrganizationInvitation from '#models/organization_invitation'
import OrganizationMembership from '#models/organization_membership'
import User from '#models/user'
import { UserFactory } from '#database/factories/user_factory'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser } from '#tests/browser/helpers'

/**
 * Rejoindre une organisation, en un seul navigateur (#700).
 *
 * Le domaine est saturé côté HTTP — 5 cas sur l'acceptation, 8 sur le refus
 * (`invitations.spec.ts`, `invitation_decline.spec.ts`), 4 sur l'envoi, 12 sur
 * la gestion des membres — et la suite browser prouve déjà la visibilité des
 * contrôles admin vs member (`permissions.spec.ts`). Un seul cas manque : le
 * **raccord**, et surtout la bascule d'organisation telle que l'utilisateur la
 * voit.
 *
 * ⚠️ Le jeton est **haché en base** (`sha256`) et son clair n'existe qu'au
 * moment de l'envoi, dans la valeur de retour du service. Un test navigateur ne
 * peut donc pas le lire après coup : on re-clé la ligne avec un clair connu
 * pour poursuivre le parcours. C'est un artifice de test assumé — il ne
 * court-circuite ni la création de l'invitation par le vrai formulaire, ni son
 * acceptation par le vrai bouton.
 */

const KNOWN_TOKEN = 'e2e-invitation-plain-token'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

test.group('E2E · Invitation flow', (group) => {
  group.each.setup(() => truncateDb())

  test('an invited user joins the organization and lands on its members page', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const admin = await createAdminUser()
    // L'invité existe déjà et vit hors de l'organisation : accepter doit l'y
    // faire basculer, pas seulement lui créer une adhésion.
    const invitee = await UserFactory.merge({ email: 'joiner@example.com' }).create()

    await browserContext.loginAs(admin)
    const adminPage = await visit('/settings/members')
    await adminPage.waitForLoadState('networkidle')

    await adminPage.getByRole('button', { name: 'Invite a member' }).click()
    await adminPage.locator('input[name="email"]').fill('joiner@example.com')
    await adminPage.locator('select[name="role"]').selectOption('member')
    await adminPage.getByRole('button', { name: 'Send invitation' }).click()
    // Attendre l'effet visible, pas seulement le clic : sans cela la lecture en
    // base court avant la fin du POST, et l'invité n'apparaît nulle part.
    await adminPage.getByText('joiner@example.com').first().waitFor()

    const invitation = await OrganizationInvitation.findByOrFail('email', 'joiner@example.com')
    assert.equal(invitation.organizationId, admin.organizationId)
    assert.equal(invitation.status, 'pending')

    invitation.token = sha256(KNOWN_TOKEN)
    await invitation.save()

    await adminPage.close()
    await browserContext.loginAs(invitee)
    const inviteePage = await visit(`/invitations/accept?token=${KNOWN_TOKEN}`)
    await inviteePage.waitForLoadState('networkidle')

    await inviteePage.getByRole('button', { name: 'Accept invitation' }).click()
    await inviteePage.waitForURL('**/settings/members')

    const membership = await OrganizationMembership.query()
      .where('userId', invitee.id)
      .where('organizationId', admin.organizationId!)
      .firstOrFail()
    assert.equal(membership.role, 'member')

    // La bascule de contexte : l'invité n'est plus rattaché à son organisation
    // d'origine, et l'écran qu'il voit est celui de la nouvelle.
    const refreshed = await User.findOrFail(invitee.id)
    assert.equal(refreshed.organizationId, admin.organizationId)
    assert.include(await inviteePage.locator('body').innerText(), 'joiner@example.com')
  })
})
