import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.get('organization/members', [controllers.OrganizationMembers, 'index']).as('organization.members.index')
    router.post('organization/members', [controllers.OrganizationMembers, 'store']).as('organization.members.store')
    router.put('organization/members/:id', [controllers.OrganizationMembers, 'update']).as('organization.members.update')
    router.delete('organization/members/:id', [controllers.OrganizationMembers, 'destroy']).as('organization.members.destroy')
  })
  .use(middleware.auth())
