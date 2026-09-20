import { middleware } from '#start/kernel'
import {
  emailVerificationConfirmThrottle,
  emailVerificationResendThrottle,
  forgotPasswordThrottle,
  loginThrottle,
  resetPasswordThrottle,
  signupThrottle,
} from '#start/limiter'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store']).as('signup.store').use(signupThrottle)

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store']).as('login.store').use(loginThrottle)

    router.get('forgot-password', [controllers.PasswordReset, 'create']).as('password.forgot')
    router.post('forgot-password', [controllers.PasswordReset, 'store']).use(forgotPasswordThrottle)
    router.get('reset-password', [controllers.PasswordReset, 'edit']).as('password.reset')
    router.post('reset-password', [controllers.PasswordReset, 'update']).use(resetPasswordThrottle)
  })
  .use(middleware.guest())

router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])

    // Écran de rappel et renvoi du lien (#768). Le renvoi est throttlé — il
    // déclenche un e-mail sortant, comme le formulaire de contact.
    router
      .get('verify-email', [controllers.EmailVerification, 'show'])
      .as('email_verification.show')
    router
      .post('verify-email/resend', [controllers.EmailVerification, 'resend'])
      .as('email_verification.resend')
      .use(emailVerificationResendThrottle)
  })
  .use(middleware.auth())

/**
 * Consommation du lien : **publique** (#768). Le lien arrive par e-mail et
 * rien ne dit que la session est encore ouverte dans le navigateur qui
 * l'ouvre ; exiger d'être connecté renverrait sur `/login` en perdant le
 * jeton — le piège de #770. Le jeton prouve à lui seul la possession de
 * l'adresse.
 *
 * Hors du groupe `guest()` pour la même raison : un utilisateur déjà connecté
 * qui clique doit pouvoir confirmer, pas être redirigé vers son dashboard.
 */
router
  .get('verify-email/confirm', [controllers.EmailVerification, 'confirm'])
  .as('email_verification.confirm')
  .use(emailVerificationConfirmThrottle)
