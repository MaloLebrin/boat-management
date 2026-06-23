import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.get('crew', [controllers.CrewMembers, 'index']).as('crew.index')
    router.post('crew', [controllers.CrewMembers, 'store']).as('crew.store')
    router.put('crew/:id', [controllers.CrewMembers, 'update']).as('crew.update')
    router.delete('crew/:id', [controllers.CrewMembers, 'destroy']).as('crew.destroy')

    router
      .post('crew/:memberId/certifications', [controllers.CrewCertifications, 'store'])
      .as('crew.certifications.store')
    router
      .delete('crew/:memberId/certifications/:certId', [controllers.CrewCertifications, 'destroy'])
      .as('crew.certifications.destroy')
  })
  .use(middleware.auth())
