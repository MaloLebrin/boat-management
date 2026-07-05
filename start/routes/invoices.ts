import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.get('invoices', [controllers.Invoices, 'index']).as('invoices.index')
    router.get('invoices/new', [controllers.Invoices, 'create']).as('invoices.create')
    router.post('invoices', [controllers.Invoices, 'store']).as('invoices.store')
    router.get('invoices/:id', [controllers.Invoices, 'show']).as('invoices.show')
    router.get('invoices/:id/edit', [controllers.Invoices, 'edit']).as('invoices.edit')
    router.put('invoices/:id', [controllers.Invoices, 'update']).as('invoices.update')
    router.delete('invoices/:id', [controllers.Invoices, 'destroy']).as('invoices.destroy')
  })
  .use(middleware.auth())
