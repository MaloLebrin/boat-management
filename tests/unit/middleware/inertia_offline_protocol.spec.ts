import { test } from '@japa/runner'
import InertiaMiddleware from '#middleware/inertia_middleware'
import type { HttpContext } from '@adonisjs/core/http'
import type { BrandingService } from '#services/branding_service'
import type NotificationService from '#services/notification_service'
import type OrganizationModuleService from '#services/organization_module_service'
import type PermissionService from '#services/permission_service'
import type DemoService from '#services/demo_service'
import type AssistantChatService from '#services/assistant_chat_service'
import type AssistantStarterService from '#services/assistant_starter_service'
import type AiTokenQuotaService from '#services/ai_token_quota_service'

/**
 * Le maillon manquant du protocole de file hors-ligne (#696).
 *
 * Cinq clés de flash portent ce protocole — `conflictData`, `conflictType`,
 * `rejectedType`, `createdResourceType`, `createdResourceId`. Quatre specs
 * fonctionnelles prouvent déjà que les contrôleurs les **posent**
 * (`inspections.spec.ts`, `maintenance_sheets.spec.ts`,
 * `navigation_logs.spec.ts`, `inspection_equipment_actions.spec.ts`).
 *
 * Personne ne prouvait qu'elles **arrivent**. Le bloc `flash` de
 * `InertiaMiddleware.share()` recopie les cinq à la main, et aucun test ne le
 * regardait : en retirer une laisse toute la suite verte pendant que la modale
 * de conflit ne s'ouvre plus jamais. C'est le trou que ce fichier ferme.
 *
 * ⚠️ Pourquoi au niveau du middleware et non par deux requêtes HTTP : en test,
 * `SESSION_DRIVER=memory`, et un flash **ne survit pas** d'un appel client au
 * suivant — même en reportant le cookie de session, `page.props.flash` revient
 * vide. La traversée se teste donc là où elle est observable. Détaillé dans
 * `docs/dev/testing.md`.
 */

/** Les cinq clés, nommées une par une : c'est la liste qui doit tomber. */
const PROTOCOL_KEYS = [
  'conflictData',
  'conflictType',
  'rejectedType',
  'createdResourceType',
  'createdResourceId',
] as const

/** Les quatre clés de toast, partagées par le même objet `flash`. */
const TOAST_KEYS = ['error', 'errorAction', 'success', 'info'] as const

function makeMiddleware() {
  const stub = {} as never

  return new InertiaMiddleware(
    stub as BrandingService,
    stub as NotificationService,
    stub as OrganizationModuleService,
    // Seul service appelé sans condition quand personne n'est authentifié.
    {
      sharedProps: async () => ({ role: null, capabilities: [] }),
    } as unknown as PermissionService,
    { isDemoUser: () => false } as unknown as DemoService,
    stub as AssistantChatService,
    stub as AssistantStarterService,
    stub as AiTokenQuotaService
  )
}

interface ShareResult {
  shared: Record<string, unknown>
  /** Les props passées par `inertia.always()`, dans l'ordre d'appel. */
  alwaysValues: unknown[]
}

/**
 * Joue `share()` sur un contexte anonyme dont la session porte `flashes`.
 *
 * Sans utilisateur authentifié, tous les résolveurs de plan, de branding, de
 * notifications et d'assistant se court-circuitent : il ne reste que ce qui
 * nous intéresse. `inertia.always` est l'identité **et** un mouchard, pour
 * qu'on puisse vérifier que `flash` passe bien par lui.
 */
async function share(flashes: Record<string, string>): Promise<ShareResult> {
  const alwaysValues: unknown[] = []

  const ctx = {
    session: {
      // Le second argument compte : `getValidationErrors` du middleware de base
      // appelle `get('inputErrorsBag', {})` et fait un `Object.entries` sur le
      // résultat — rendre `undefined` ici fait tomber tout le fichier sur une
      // cause qui n'a rien à voir avec le protocole.
      flashMessages: { get: (key: string, fallback?: unknown) => flashes[key] ?? fallback },
      get: () => undefined,
    },
    auth: { user: undefined },
    i18n: { locale: 'fr', localeTranslations: {} },
    request: {
      url: () => '/boats/1',
      header: () => undefined,
      cookie: () => undefined,
    },
    inertia: {
      always: (value: unknown) => {
        alwaysValues.push(value)
        return value
      },
      // Les props paresseuses ne sont pas évaluées ici — c'est ce qui rend ce
      // test possible sans monter les services de l'assistant.
      optional: (resolver: unknown) => resolver,
    },
  } as unknown as HttpContext

  const shared = (await makeMiddleware().share(ctx)) as unknown as Record<string, unknown>
  return { shared, alwaysValues }
}

function flashOf(result: ShareResult): Record<string, unknown> {
  return result.shared.flash as Record<string, unknown>
}

test.group('Protocole hors-ligne — les cinq clés traversent le middleware', () => {
  for (const key of PROTOCOL_KEYS) {
    test(`« ${key} » posée en flash ressort dans les props`, async ({ assert }) => {
      const result = await share({ [key]: `valeur-${key}` })

      assert.equal(
        flashOf(result)[key],
        `valeur-${key}`,
        `« ${key} » n'est pas transmise par InertiaMiddleware.share() — ` +
          `la file hors-ligne ne la verra jamais, quel que soit ce que le contrôleur flashe`
      )
    })
  }

  test('les cinq voyagent ensemble sur une même réponse', async ({ assert }) => {
    // Le cas réel : un rejeu refusé pose plusieurs marqueurs à la fois.
    const result = await share({
      conflictData: '{"windForceBeaufort":7}',
      conflictType: 'update-navigation-log',
      rejectedType: 'create-inspection',
      createdResourceType: 'create-inspection',
      createdResourceId: '42',
    })

    assert.deepEqual(flashOf(result), {
      error: undefined,
      errorAction: undefined,
      success: undefined,
      info: undefined,
      conflictData: '{"windForceBeaufort":7}',
      conflictType: 'update-navigation-log',
      rejectedType: 'create-inspection',
      createdResourceType: 'create-inspection',
      createdResourceId: '42',
    })
  })

  test('sans flash, les clés existent et valent `undefined`', async ({ assert }) => {
    // `drainQueue` lit `flash?.conflictType` : une clé absente et une clé vide
    // se comportent pareil côté front, mais la forme de l'objet doit rester
    // stable — c'est elle qui est typée dans `SharedProps`.
    const flash = flashOf(await share({}))

    for (const key of [...PROTOCOL_KEYS, ...TOAST_KEYS]) {
      assert.isTrue(key in flash, `« ${key} » a disparu de l'objet flash`)
      assert.isUndefined(flash[key])
    }
  })

  test('le flash est une prop `always`, pas une prop ordinaire', async ({ assert }) => {
    // Un rejeu de file se termine souvent par un rechargement partiel
    // (`router.visit(..., { only: [...] })`). Une prop ordinaire disparaîtrait
    // de la réponse, et `drainQueue` ne verrait jamais son marqueur — le
    // symptôme serait « la modale ne s'ouvre que parfois ».
    const result = await share({ conflictType: 'update-navigation-log' })

    assert.isTrue(
      result.alwaysValues.includes(result.shared.flash),
      "l'objet flash n'est pas passé par inertia.always()"
    )
  })
})
