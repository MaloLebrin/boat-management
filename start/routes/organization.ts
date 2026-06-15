import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.get('organization', ({ response }) =>
      response.redirect().toPath('/organization/members')
    )

    router
      .get('organization/members', [controllers.OrganizationMembers, 'index'])
      .as('organization.members.index')
    router
      .post('organization/members', [controllers.OrganizationMembers, 'store'])
      .as('organization.members.store')
    router
      .put('organization/members/:id', [controllers.OrganizationMembers, 'update'])
      .as('organization.members.update')
    router
      .delete('organization/members/:id', [controllers.OrganizationMembers, 'destroy'])
      .as('organization.members.destroy')

    router
      .post('organization/invitations', [controllers.OrganizationInvitations, 'store'])
      .as('organization.invitations.store')
    router
      .delete('organization/invitations/:id', [controllers.OrganizationInvitations, 'destroy'])
      .as('organization.invitations.destroy')
  })
  .use(middleware.auth())
