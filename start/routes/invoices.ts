import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
import { invoicePaymentThrottle } from '#start/limiter'

const InvoicePaymentLinksController = () => import('#controllers/invoice_payment_links_controller')

router
  .group(() => {
    // Lecture : reste accessible en lecture seule après résiliation du module
    // quand l'organisation possède déjà des factures (#332) — le contrôleur
    // décide (`loadOrgForRead`), pas la garde de module.
    router.get('invoices', [controllers.Invoices, 'index']).as('invoices.index')
    // Exports comptables (#879) : journal des ventes et FEC. Déclarés avant
    // `invoices/:id` par lisibilité — le matcher numérique les distingue déjà.
    router.get('invoices/export.csv', [controllers.FleetExports, 'invoices']).as('invoices.export')
    router.get('invoices/export/fec', [controllers.FleetExports, 'fec']).as('invoices.export.fec')
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
        // Lien de paiement en ligne d'une facture envoyée avant la connexion
        // du compte Stripe (#876).
        router
          .post('invoices/:id/payment-link', [controllers.Invoices, 'createPaymentLink'])
          .as('invoices.paymentLink')
        // Avoirs (#877) : une facture émise ne se corrige pas, elle s'avoire.
        router
          .get('invoices/:id/credit-note', [controllers.CreditNotes, 'create'])
          .as('invoices.creditNotes.create')
        router
          .post('invoices/:id/credit-notes', [controllers.CreditNotes, 'store'])
          .as('invoices.creditNotes.store')
        // Relances des factures en retard (#878) : « Relancer maintenant » écrit
        // au client en notre nom, comme l'envoi de la facture (#768).
        router
          .post('invoices/:id/reminders', [controllers.InvoiceReminders, 'store'])
          .as('invoices.reminders.store')
          .use(middleware.requireVerifiedEmail())
        router
          .patch('invoices/:id/reminders', [controllers.InvoiceReminders, 'update'])
          .as('invoices.reminders.update')
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

// Page publique de paiement d'une facture (#876) : sans login, le jeton opaque
// fait office d'autorisation.
router
  .get('pay/:token', [InvoicePaymentLinksController, 'show'])
  .as('invoices.pay.public.show')
  .use(invoicePaymentThrottle)
router
  .post('pay/:token/checkout', [InvoicePaymentLinksController, 'checkout'])
  .as('invoices.pay.public.checkout')
  .use(invoicePaymentThrottle)
