import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.get('clients', [controllers.Clients, 'index']).as('clients.index')
    router.get('clients/:id', [controllers.Clients, 'show']).as('clients.show')
    router.post('clients', [controllers.Clients, 'store']).as('clients.store')
    router.put('clients/:id', [controllers.Clients, 'update']).as('clients.update')
    router.delete('clients/:id', [controllers.Clients, 'destroy']).as('clients.destroy')
  })
  .use(middleware.auth())
