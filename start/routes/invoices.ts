import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    // Lecture : reste accessible en lecture seule après résiliation du module
    // quand l'organisation possède déjà des factures (#332) — le contrôleur
    // décide (`loadOrgForRead`), pas la garde de module.
    router.get('invoices', [controllers.Invoices, 'index']).as('invoices.index')
    router.get('invoices/:id', [controllers.Invoices, 'show']).as('invoices.show')
    router.get('invoices/:id/pdf', [controllers.Invoices, 'downloadPdf']).as('invoices.pdf')

    // Écriture : module CRM & Facturation requis.
    router
      .group(() => {
        router.get('invoices/new', [controllers.Invoices, 'create']).as('invoices.create')
        router.post('invoices', [controllers.Invoices, 'store']).as('invoices.store')
        router
          .post('invoices/from-reservation/:reservationId', [
            controllers.Invoices,
            'createFromReservation',
          ])
          .as('invoices.fromReservation')
        router.get('invoices/:id/edit', [controllers.Invoices, 'edit']).as('invoices.edit')
        // Envoyer une facture met du courrier à notre nom dans la boîte d'un
        // client (#768).
        router
          .post('invoices/:id/send', [controllers.Invoices, 'send'])
          .as('invoices.send')
          .use(middleware.requireVerifiedEmail())
        router
          .post('invoices/:id/convert', [controllers.Invoices, 'convert'])
          .as('invoices.convert')
        router.post('invoices/:id/pay', [controllers.Invoices, 'markPaid']).as('invoices.pay')
        // Facture émise : seule écriture encore permise (#717).
        router
          .patch('invoices/:id/payment', [controllers.Invoices, 'updatePayment'])
          .as('invoices.payment')
        router.put('invoices/:id', [controllers.Invoices, 'update']).as('invoices.update')
        router.delete('invoices/:id', [controllers.Invoices, 'destroy']).as('invoices.destroy')
      })
      .use(middleware.requireModulePlan({ feature: 'invoices' }))
  })
  .use(middleware.auth())
