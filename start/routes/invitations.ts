import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

// Public route - show invitation acceptance page
router.get('invitations/accept', [controllers.OrganizationInvitations, 'show']).as('invitations.show')

// Protected route - accept invitation
router
  .post('invitations/accept', [controllers.OrganizationInvitations, 'accept'])
  .as('invitations.accept')
  .use(middleware.auth())
