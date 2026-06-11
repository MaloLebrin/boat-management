import env from '#start/env'
import router from '@adonisjs/core/services/router'

if (env.get('NODE_ENV') !== 'production') {
  const MailPreviewsController = () => import('#controllers/dev/mail_previews_controller')

  router
    .group(() => {
      router.get('/mails', [MailPreviewsController, 'index'])
      router.get('/mails/:name', [MailPreviewsController, 'show'])
    })
    .prefix('/dev')
}
