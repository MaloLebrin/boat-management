import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.get('crew', [controllers.CrewMembers, 'index']).as('crew.index')
    router.post('crew', [controllers.CrewMembers, 'store']).as('crew.store')
    // Fiche équipier (#883) : ouverte à tous les plans, comme la liste.
    router.get('crew/:id', [controllers.CrewMembers, 'show']).as('crew.show')
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

// Planning d'équipage (#883) : calendrier et indisponibilités reposent sur les
// réservations — même garde de module que `/reservations`.
router
  .group(() => {
    router.get('crew/planning', [controllers.CrewPlanning, 'index']).as('crew.planning.index')
    router
      .post('crew/:id/unavailabilities', [controllers.CrewPlanning, 'storeUnavailability'])
      .as('crew.unavailabilities.store')
    router
      .delete('crew/:id/unavailabilities/:unavailabilityId', [
        controllers.CrewPlanning,
        'destroyUnavailability',
      ])
      .as('crew.unavailabilities.destroy')
  })
  .use([middleware.auth(), middleware.requireModulePlan({ feature: 'reservations' })])
