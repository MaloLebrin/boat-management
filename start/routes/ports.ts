import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.get('ports', [controllers.Ports, 'index']).as('ports.index')
    router.get('ports/new', [controllers.Ports, 'create']).as('ports.create')
    router.post('ports', [controllers.Ports, 'store']).as('ports.store')
    router.get('ports/:id', [controllers.Ports, 'show']).as('ports.show')
    router.get('ports/:id/edit', [controllers.Ports, 'edit']).as('ports.edit')
    router.put('ports/:id', [controllers.Ports, 'update']).as('ports.update')
    router.delete('ports/:id', [controllers.Ports, 'destroy']).as('ports.destroy')

    router
      .post('ports/:portId/pontoons', [controllers.Pontoons, 'store'])
      .as('ports.pontoons.store')
    router
      .put('ports/:portId/pontoons/:pontoonId', [controllers.Pontoons, 'update'])
      .as('ports.pontoons.update')
    router
      .delete('ports/:portId/pontoons/:pontoonId', [controllers.Pontoons, 'destroy'])
      .as('ports.pontoons.destroy')

    router
      .post('ports/:portId/mouillages', [controllers.Mouillages, 'store'])
      .as('ports.mouillages.store')
    router
      .put('ports/:portId/mouillages/:mouillageId', [controllers.Mouillages, 'update'])
      .as('ports.mouillages.update')
    router
      .delete('ports/:portId/mouillages/:mouillageId', [controllers.Mouillages, 'destroy'])
      .as('ports.mouillages.destroy')

    router
      .patch('ports/:portId/pontoons/:pontoonId/position', [controllers.Pontoons, 'updatePosition'])
      .as('ports.pontoons.updatePosition')

    router
      .patch('ports/:portId/mouillages/:mouillageId/position', [
        controllers.Mouillages,
        'updatePosition',
      ])
      .as('ports.mouillages.updatePosition')

    // Spots for pontoons
    router
      .post('ports/:portId/pontoons/:pontoonId/spots', [controllers.Spots, 'storeForPontoon'])
      .as('ports.pontoons.spots.store')

    // Spots for mouillages
    router
      .post('ports/:portId/mouillages/:mouillageId/spots', [controllers.Spots, 'storeForMouillage'])
      .as('ports.mouillages.spots.store')

    // Spots CRUD (update/delete)
    router.put('spots/:id', [controllers.Spots, 'update']).as('spots.update')
    router.delete('spots/:id', [controllers.Spots, 'destroy']).as('spots.destroy')

    // Capitainerie (#891) : escales et contrats d'amarrage, toujours sous le
    // port de l'URL — le contrôleur vérifie que l'escale/le contrat est de ce port.
    router
      .post('ports/:portId/marina-stays', [controllers.MarinaStays, 'store'])
      .as('ports.marinaStays.store')
    router
      .patch('ports/:portId/marina-stays/:marinaStayId/status', [
        controllers.MarinaStays,
        'updateStatus',
      ])
      .as('ports.marinaStays.updateStatus')
    router
      .post('ports/:portId/marina-stays/:marinaStayId/invoice', [
        controllers.MarinaStays,
        'invoice',
      ])
      .as('ports.marinaStays.invoice')
    router
      .delete('ports/:portId/marina-stays/:marinaStayId', [controllers.MarinaStays, 'destroy'])
      .as('ports.marinaStays.destroy')
    router
      .post('ports/:portId/mooring-contracts', [controllers.MooringContracts, 'store'])
      .as('ports.mooringContracts.store')
    router
      .patch('ports/:portId/mooring-contracts/:contractId/terminate', [
        controllers.MooringContracts,
        'terminate',
      ])
      .as('ports.mooringContracts.terminate')
    router
      .delete('ports/:portId/mooring-contracts/:contractId', [
        controllers.MooringContracts,
        'destroy',
      ])
      .as('ports.mooringContracts.destroy')

    // Amarrage d'un bateau : l'URL est sous `/boats`, mais la route écrit
    // `boats.spot_id` et n'est appelée que depuis le plan de marina. Elle vit
    // donc ici, sous la garde de plan du groupe (#721).
    router.patch('boats/:id/assignment', [controllers.Boats, 'assign']).as('boats.assign')
  })
  // Cartographie de port réservée aux plans Pro et Entreprise (#604) : la garde
  // vient après `auth()`, dont elle dépend pour lire l'organisation de l'utilisateur.
  .use([middleware.auth(), middleware.requirePortsPlan()])
