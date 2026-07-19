import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Boat from '#models/boat'
import OrganizationMembership from '#models/organization_membership'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser, createBoatForUser } from '#tests/browser/helpers'

/**
 * Creates a plain member (role 'member') attached to the same organization
 * as the given admin — the non-admin counterpart used throughout these specs.
 */
async function createMemberInSameOrg(orgId: number) {
  const member = await UserFactory.merge({ organizationId: orgId }).create()
  await OrganizationMembership.create({ userId: member.id, organizationId: orgId, role: 'member' })
  return member
}

test.group('E2E · Permissions (admin vs member)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('admin sees member-management controls on /settings/members', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await createMemberInSameOrg(admin.organizationId!)
    await browserContext.loginAs(admin)

    const page = await visit('/settings/members')
    await page.waitForLoadState('networkidle')

    // Only an org admin can invite new members and remove existing ones.
    await page.assertTextContains('body', 'Invite a member')
    await page.assertTextContains('body', 'Remove')
    // Sanity check: the member created above is indeed listed on the page.
    const bodyText = await page.locator('body').innerText()
    assert.include(bodyText, member.email)
  })

  test('member sees a read-only members list, no invite or remove controls', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await createMemberInSameOrg(admin.organizationId!)
    await browserContext.loginAs(member)

    const page = await visit('/settings/members')
    await page.waitForLoadState('networkidle')

    // .innerText() reflects only rendered/visible DOM — unlike page.content(),
    // it is not polluted by the full i18n catalog embedded in Inertia's page JSON.
    const bodyText = await page.locator('body').innerText()
    assert.notInclude(bodyText, 'Invite a member')
    assert.notInclude(bodyText, 'Remove')
    // Roles are still visible, just as static badges rather than editable selects.
    assert.include(bodyText, 'Admin')
  })

  test('member does not see the delete button on /boats/:id/edit (no boats.delete capability, #397)', async ({
    browserContext,
    visit,
  }) => {
    const admin = await createAdminUser()
    const member = await createMemberInSameOrg(admin.organizationId!)
    const boat = await createBoatForUser(admin, {
      name: 'Permission-Guarded Sloop',
      propulsionType: 'motorboat',
    })
    await browserContext.loginAs(member)

    const page = await visit(`/boats/${boat.id}/edit`)
    await page.waitForLoadState('networkidle')

    const deleteButtonCount = await page
      .getByRole('button', { name: 'Delete', exact: true })
      .count()
    if (deleteButtonCount !== 0) {
      throw new Error('Delete button should be hidden for a member without boats.delete (#397)')
    }

    // Backend guarantee (defense in depth, covered independently of the UI):
    // tests/functional/boats/boats.spec.ts — "DELETE /boats/:id is denied to a
    // plain member (boats.delete is admin-only)".
    const stillExists = await Boat.find(boat.id)
    if (!stillExists) {
      throw new Error('The boat should not have been deleted')
    }
  })

  test('admin can delete a boat through the edit page', async ({ browserContext, visit }) => {
    const admin = await createAdminUser()
    const boat = await createBoatForUser(admin, {
      name: 'Admin-Deletable Dinghy',
      propulsionType: 'motorboat',
    })
    await browserContext.loginAs(admin)

    const page = await visit(`/boats/${boat.id}/edit`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click()

    await page.waitForURL('**/boats')
    const deleted = await Boat.find(boat.id)
    if (deleted) {
      throw new Error('Expected the admin to be able to delete the boat')
    }
  })
})
