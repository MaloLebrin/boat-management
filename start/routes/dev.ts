import env from '#start/env'
import router from '@adonisjs/core/services/router'

if (env.get('NODE_ENV') !== 'production') {
  const MailPreviewsController = () => import('#controllers/dev/mail_previews_controller')
  const PdfPreviewsController = () => import('#controllers/dev/pdf_previews_controller')
  const SignalkProbeController = () => import('#controllers/dev/signalk_probe_controller')

  router
    .group(() => {
      router.get('/mails', [MailPreviewsController, 'index'])
      router.get('/mails/:name', [MailPreviewsController, 'show'])
      router.get('/pdfs', [PdfPreviewsController, 'index'])
      router.get('/pdfs/:id', [PdfPreviewsController, 'show'])
      // Spike instruments de bord (#985) : sonde Signal K, voir docs/dev/signalk.md
      router.get('/signalk-probe', [SignalkProbeController, 'show'])
    })
    .prefix('/dev')
}
