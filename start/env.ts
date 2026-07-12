/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // Database (PostgreSQL)
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string(),
  DB_DATABASE: Env.schema.string(),

  // App
  APP_NAME: Env.schema.string(),
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string(),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // Queue
  QUEUE_DRIVER: Env.schema.enum(['sync', 'database', 'redis'] as const),

  // AI
  AI_PROVIDER: Env.schema.string(),
  AI_MODEL: Env.schema.string.optional(),
  MISTRAL_API_KEY: Env.schema.secret(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: Env.schema.string(),
  CLOUDINARY_API_KEY: Env.schema.string(),
  CLOUDINARY_API_SECRET: Env.schema.secret(),

  // Stripe
  STRIPE_SECRET_KEY: Env.schema.string.optional(),
  STRIPE_WEBHOOK_SECRET: Env.schema.string.optional(),
  STRIPE_PRO_MONTHLY_PRICE_ID: Env.schema.string.optional(),
  STRIPE_PRO_ANNUAL_PRICE_ID: Env.schema.string.optional(),
  STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: Env.schema.string.optional(),
  STRIPE_ENTERPRISE_ANNUAL_PRICE_ID: Env.schema.string.optional(),
  // Modules add-ons (épic #327) — items d'abonnement additionnels sur le socle Pro
  STRIPE_MODULE_CHARTER_MONTHLY_PRICE_ID: Env.schema.string.optional(),
  STRIPE_MODULE_CHARTER_ANNUAL_PRICE_ID: Env.schema.string.optional(),
  STRIPE_MODULE_CRM_INVOICING_MONTHLY_PRICE_ID: Env.schema.string.optional(),
  STRIPE_MODULE_CRM_INVOICING_ANNUAL_PRICE_ID: Env.schema.string.optional(),
  // Add-ons quantitatifs (épic #333) — item d'abonnement facturé à la quantité
  STRIPE_ADDON_EXTRA_BOATS_MONTHLY_PRICE_ID: Env.schema.string.optional(),
  STRIPE_ADDON_EXTRA_BOATS_ANNUAL_PRICE_ID: Env.schema.string.optional(),
  STRIPE_PUBLIC_KEY: Env.schema.string.optional(),
  STRIPE_CUSTOMER_PORTAL_ID: Env.schema.string.optional(),

  // Mail (SMTP)
  SMTP_HOST: Env.schema.string({ format: 'host' }),
  SMTP_PORT: Env.schema.number(),
  SMTP_SECURE: Env.schema.boolean(),
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),
  MAIL_FROM_ADDRESS: Env.schema.string(),
  MAIL_FROM_NAME: Env.schema.string(),
})
