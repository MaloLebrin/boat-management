import app from '@adonisjs/core/services/app'
import AiService, { type AiChatMessage } from '#services/ai_service'
import { CloudinaryService, type CloudinaryUploadResult } from '#services/cloudinary_service'
import StripeService from '#services/stripe_service'
import type { AiChatOptions, AiProvider, AiToolCall, AiToolDefinition } from '#shared/types/ai'
import type Stripe from 'stripe'

/**
 * Fakes partagés des services externes (Cloudinary, IA) pour les suites Japa.
 *
 * Avant ce module, chaque spec redéclarait son propre `app.container.swap(...)`
 * (17 copies pour Cloudinary, 8 pour l'IA) avec des shapes légèrement
 * différents. Ici : un seul fake par service, qui capture tout ce que les
 * specs ont besoin d'asserter, et un `restore*()` explicite.
 *
 * Usage type :
 *
 * ```ts
 * group.each.teardown(() => restoreCloudinary())
 * test('…', async ({ client, assert }) => {
 *   const cloud = swapFakeCloudinary()
 *   …
 *   assert.lengthOf(cloud.uploaded, 1)
 * })
 * ```
 */

// ── Cloudinary ──────────────────────────────────────────────────────────────

export interface FakeCloudinaryOptions {
  /** Préfixe des `publicId` générés (`fake-upload` par défaut). */
  prefix?: string
  /**
   * Rang (à partir de 1) de l'upload qui doit échouer, tous types confondus —
   * simule une panne Cloudinary au milieu d'un lot.
   */
  failUploadAt?: number
}

export interface FakeCloudinary {
  /** `publicId` de chaque upload réussi, dans l'ordre. */
  uploaded: string[]
  /** Dossier Cloudinary ciblé par chaque upload réussi, dans l'ordre. */
  uploadedFolders: string[]
  /** `publicId` passés à `deleteFile`, dans l'ordre. */
  deletedPublicIds: string[]
  /** Appels à `deleteFile` avec leur `resourceType` (`image` par défaut). */
  deletedFiles: Array<{ publicId: string; resourceType: 'image' | 'raw' }>
  /** Dossiers passés à `deleteFolder`, dans l'ordre. */
  deletedFolders: string[]
  restore(): void
}

function fakeUploadResult(publicId: string, kind: 'image' | 'document'): CloudinaryUploadResult {
  if (kind === 'image') {
    return {
      publicId,
      url: `http://res.cloudinary.com/${publicId}.jpg`,
      secureUrl: `https://res.cloudinary.com/${publicId}.jpg`,
      format: 'jpg',
      resourceType: 'image',
      bytes: 1024,
      originalFilename: 'photo',
      width: 800,
      height: 600,
    }
  }
  return {
    publicId,
    url: `http://res.cloudinary.com/${publicId}.pdf`,
    secureUrl: `https://res.cloudinary.com/${publicId}.pdf`,
    format: 'pdf',
    resourceType: 'raw',
    bytes: 2048,
    originalFilename: 'doc',
  }
}

/**
 * Remplace `CloudinaryService` par un fake en mémoire. Aucun appel réseau :
 * les uploads renvoient un résultat plausible, les suppressions sont
 * enregistrées, `downloadAsBuffer` renvoie un PDF minimal.
 */
export function swapFakeCloudinary(options: FakeCloudinaryOptions = {}): FakeCloudinary {
  const prefix = options.prefix ?? 'fake-upload'
  const state: FakeCloudinary = {
    uploaded: [],
    uploadedFolders: [],
    deletedPublicIds: [],
    deletedFiles: [],
    deletedFolders: [],
    restore: restoreCloudinary,
  }
  let attempts = 0

  const upload = (folder: string, kind: 'image' | 'document') => {
    attempts += 1
    if (options.failUploadAt === attempts) {
      throw new Error('Cloudinary upload failed')
    }
    const publicId = `${prefix}-${state.uploaded.length}`
    state.uploaded.push(publicId)
    state.uploadedFolders.push(folder)
    return fakeUploadResult(publicId, kind)
  }

  app.container.swap(
    CloudinaryService,
    () =>
      ({
        uploadImage: async (_file: unknown, folder: string) => upload(folder, 'image'),
        uploadDocument: async (_file: unknown, folder: string) => upload(folder, 'document'),
        deleteFile: async (publicId: string, resourceType: 'image' | 'raw' = 'image') => {
          state.deletedPublicIds.push(publicId)
          state.deletedFiles.push({ publicId, resourceType })
        },
        deleteFolder: async (folder: string) => {
          state.deletedFolders.push(folder)
        },
        downloadAsBuffer: async () => ({
          buffer: Buffer.from('%PDF-1.4 fake'),
          contentType: 'application/pdf',
        }),
      }) as unknown as CloudinaryService
  )

  return state
}

export function restoreCloudinary(): void {
  app.container.restore(CloudinaryService)
}

// ── IA ──────────────────────────────────────────────────────────────────────

/** Une réponse scriptée du fake — une string = réponse finale sans appel d'outil. */
export interface FakeAiTurn {
  content?: string
  toolCalls?: AiToolCall[]
  tokensUsed?: number
}

/** Un appel capturé à `AiService.chat`, options incluses. */
export interface FakeAiCall {
  messages: AiChatMessage[]
  provider: AiProvider | null
  model: string | null
  apiKey: string | null
  tools: AiToolDefinition[] | null
}

/**
 * Remplace `AiService` par un fake qui capture chaque appel (messages,
 * fournisseur, modèle, clé BYOK, outils proposés) et répond selon `script`.
 *
 * `script` est une file de réponses (#642) : chaque appel consomme la
 * suivante, la dernière est répétée — ce qui simule « appel d'outil puis
 * réponse finale ». Une simple string reste le cas d'un tour sans outil.
 *
 * Retourne le tableau (vivant) des appels : `calls[0].messages[1].content`.
 */
export function swapAiService(
  script: string | Array<string | FakeAiTurn> = '',
  tokensUsed = 42
): FakeAiCall[] {
  const turns: FakeAiTurn[] = (Array.isArray(script) ? script : [script]).map((turn) =>
    typeof turn === 'string' ? { content: turn } : turn
  )
  const calls: FakeAiCall[] = []

  app.container.swap(
    AiService,
    () =>
      ({
        chat: async (messages: AiChatMessage[], options: AiChatOptions = {}) => {
          calls.push({
            messages,
            provider: options.provider ?? null,
            model: options.model ?? null,
            apiKey: options.apiKey ?? null,
            tools: options.tools ?? null,
          })
          const turn = turns[Math.min(calls.length - 1, turns.length - 1)]
          return {
            content: turn.content ?? '',
            toolCalls: turn.toolCalls ?? [],
            tokensUsed: turn.tokensUsed ?? tokensUsed,
          }
        },
      }) as unknown as AiService
  )

  return calls
}

export function restoreAiService(): void {
  app.container.restore(AiService)
}

// ── Stripe ──────────────────────────────────────────────────────────────────

/** Ce qu'un test peut asserter après coup sur les appels au faux Stripe. */
export interface FakeStripe {
  /** `subscriptionId` de chaque `retrieveSubscription`, dans l'ordre. */
  retrievedSubscriptionIds: string[]
  restore(): void
}

/**
 * Remplace `StripeService` pour le seul appel réseau du chemin webhook :
 * `checkout.session.completed` va chercher l'abonnement complet chez Stripe
 * (`SubscriptionService.syncFromCheckoutSession`).
 *
 * `constructWebhookEvent` **reste la vraie implémentation** : la vérification
 * de signature est l'unique défense d'une route publique, un test ne doit
 * jamais la court-circuiter. Seule la lecture distante est simulée.
 *
 * `moduleForPriceId` / `addonForPriceId` sont eux aussi délégués au vrai
 * service — ils lisent `env`, pas le réseau, et la réconciliation des modules
 * en dépend.
 */
export function swapStripeService(
  options: { subscription?: Stripe.Subscription } = {}
): FakeStripe {
  const real = new StripeService()
  const state: FakeStripe = {
    retrievedSubscriptionIds: [],
    restore: restoreStripeService,
  }

  app.container.swap(
    StripeService,
    () =>
      ({
        constructWebhookEvent: (rawBody: string, signature: string) =>
          real.constructWebhookEvent(rawBody, signature),
        moduleForPriceId: (priceId: string) => real.moduleForPriceId(priceId),
        addonForPriceId: (priceId: string) => real.addonForPriceId(priceId),
        retrieveSubscription: async (subscriptionId: string) => {
          state.retrievedSubscriptionIds.push(subscriptionId)
          if (!options.subscription) {
            throw new Error('swapStripeService: aucun abonnement fourni à retrieveSubscription')
          }
          return options.subscription
        },
      }) as unknown as StripeService
  )

  return state
}

export function restoreStripeService(): void {
  app.container.restore(StripeService)
}
