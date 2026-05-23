import router from '@adonisjs/core/services/router'

const BillingController = () => import('#controllers/billing_controller')

router.post('/webhooks/stripe', [BillingController, 'webhook']).as('webhooks.stripe')
