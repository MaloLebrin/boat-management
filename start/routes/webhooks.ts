import router from '@adonisjs/core/services/router'

const BillingController = () => import('#controllers/billing_controller')

router.post('/webhooks/stripe', [BillingController, 'webhook']).as('webhooks.stripe')

// Événements des comptes Stripe connectés des organisations (#876) : endpoint
// distinct, signé par `STRIPE_CONNECT_WEBHOOK_SECRET`.
router
  .post('/webhooks/stripe/connect', [BillingController, 'connectWebhook'])
  .as('webhooks.stripe.connect')
