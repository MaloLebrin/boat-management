import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    // Lecture et export RGPD : accessibles en lecture seule après résiliation
    // du module quand l'organisation possède déjà des fiches (#332) — le
    // contrôleur décide (`loadOrgForRead`), pas la garde de module.
    router.get('clients', [controllers.Clients, 'index']).as('clients.index')
    router.get('clients/:id', [controllers.Clients, 'show']).as('clients.show')
    router.get('clients/:id/export', [controllers.Clients, 'exportData']).as('clients.export')

    // Documents (CRM 2/4 — #274) : `ClientMedia` porte sa propre garde.
    router
      .post('clients/:id/documents', [controllers.ClientMedia, 'storeDocument'])
      .as('clients.documents.store')
    router
      .delete('clients/:id/media/:mediaId', [controllers.ClientMedia, 'destroy'])
      .as('clients.media.destroy')
    router
      .get('clients/:id/media/:mediaId/download', [controllers.ClientMedia, 'downloadMedia'])
      .as('clients.media.download')

    // Écriture : module CRM & Facturation requis.
    router
      .group(() => {
        router.post('clients', [controllers.Clients, 'store']).as('clients.store')
        router.put('clients/:id', [controllers.Clients, 'update']).as('clients.update')
        router.delete('clients/:id', [controllers.Clients, 'destroy']).as('clients.destroy')
        // RGPD (CRM 4/4 — #276)
        router
          .post('clients/:id/anonymize', [controllers.Clients, 'anonymize'])
          .as('clients.anonymize')
      })
      .use(middleware.requireModulePlan({ feature: 'clients' }))
  })
  .use(middleware.auth())
