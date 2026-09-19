import type { HttpContext } from '@adonisjs/core/http'

/**
 * Faux `HttpContext` pour les specs unit de middleware (#690).
 *
 * Extrait de `tests/unit/middleware/require_module_plan_middleware.spec.ts`, où
 * il vivait en local : les quatre middlewares ajoutés ici en auraient fait
 * autant de copies divergentes. Un middleware ne consomme qu'une poignée de
 * propriétés du contexte — les fournir en littéral évite de démarrer un serveur
 * HTTP pour tester une redirection.
 *
 * Le contexte **enregistre** ce qu'on lui fait (flashes, redirections, appels
 * d'authentification) au lieu de l'exécuter : les assertions portent sur ces
 * journaux, ce qui rend visible aussi bien ce qui a été fait que ce qui ne
 * l'a pas été.
 */

export interface FakeRedirect {
  target: string
  /**
   * Report de la query string sur la destination.
   *
   * Vaut le 2ᵉ argument de `response.redirect(target, forward)` pour la forme
   * courte, ou l'argument de `.withQs(forward)` pour la forme fluide. `true`
   * **conserve** la query string, `false` la jette — l'inverse de ce que
   * laissait entendre l'ancien nom du champ (#770).
   */
  forwardQs?: boolean
}

export interface FakeCtxOptions {
  /** Utilisateur rendu par `auth.getUserOrFail()`. */
  user?: unknown
  /** Réponse de `auth.use(guard).check()` et de `auth.check()`. */
  authenticated?: boolean
  /** Garde par défaut, tel que `ctx.auth.defaultGuard` l'expose. */
  defaultGuard?: string
  /** Erreur levée par `auth.authenticateUsing()`. */
  authenticateError?: Error
}

export interface FakeCtx {
  ctx: HttpContext
  /** Couples `[clé, message]` passés à `session.flash()`. */
  flashes: Array<[string, string]>
  /** Cibles passées à `response.redirect()`, dans l'ordre. */
  redirects: string[]
  /** Idem, avec le report de query string — le `false` de `GuestMiddleware` compte. */
  redirectCalls: FakeRedirect[]
  /** Compteur d'appels à `session.reflash()` — objet mutable, pas un nombre figé. */
  reflash: { reflashCount: number }
  /** Gardes passées à `auth.use()`. */
  checkedGuards: Array<string | undefined>
  /** Arguments reçus par `auth.authenticateUsing()`. */
  authenticateCalls: Array<{ guards: unknown; options: unknown }>
}

export function makeCtx(options: FakeCtxOptions = {}): FakeCtx {
  const flashes: Array<[string, string]> = []
  const redirects: string[] = []
  const redirectCalls: FakeRedirect[] = []
  const checkedGuards: Array<string | undefined> = []
  const authenticateCalls: Array<{ guards: unknown; options: unknown }> = []
  const state = { reflashCount: 0 }

  const ctx = {
    auth: {
      defaultGuard: options.defaultGuard ?? 'web',
      getUserOrFail: () => options.user,
      user: options.authenticated ? options.user : undefined,
      check: async () => options.authenticated ?? false,
      use: (guard?: string) => {
        checkedGuards.push(guard)
        return { check: async () => options.authenticated ?? false }
      },
      authenticateUsing: async (guards: unknown, authOptions: unknown) => {
        authenticateCalls.push({ guards, options: authOptions })
        if (options.authenticateError) throw options.authenticateError
      },
    },
    session: {
      flash: (key: string, value: string) => {
        flashes.push([key, value])
      },
      reflash: () => {
        state.reflashCount++
      },
    },
    i18n: { t: (key: string) => `t:${key}` },
    response: {
      /**
       * Les deux formes de `response.redirect()` : la forme courte
       * `redirect(target, forward)` et la forme fluide
       * `redirect().withQs(forward).toPath(target)` que `GuestMiddleware`
       * utilise depuis #770. Les deux alimentent le même journal.
       */
      redirect: (target?: string, forwardQs?: boolean) => {
        if (typeof target === 'string') {
          redirects.push(target)
          redirectCalls.push({ target, forwardQs })
          return
        }

        let pendingForwardQs: boolean | undefined
        const builder = {
          withQs: (forward?: boolean) => {
            pendingForwardQs = forward
            return builder
          },
          status: () => builder,
          clearQs: () => {
            pendingForwardQs = false
            return builder
          },
          toPath: (path: string) => {
            redirects.push(path)
            redirectCalls.push({ target: path, forwardQs: pendingForwardQs })
          },
          back: () => {
            redirects.push('back')
            redirectCalls.push({ target: 'back', forwardQs: pendingForwardQs })
          },
        }
        return builder
      },
    },
  } as never as HttpContext

  // Tous les journaux sont des références vivantes, jamais des accesseurs : un
  // spec les déstructure (`const { ctx, redirects } = makeCtx()`), ce qui
  // figerait la valeur d'un getter au moment de la déstructuration — le tableau
  // resterait vide quoi que fasse le middleware, et le test passerait au vert
  // pour de mauvaises raisons. `reflashCount` est un compteur, donc porté par
  // un objet mutable plutôt que par un nombre.
  return {
    ctx,
    flashes,
    redirects,
    redirectCalls,
    reflash: state,
    checkedGuards,
    authenticateCalls,
  }
}

/**
 * Organisation minimale, telle que les middlewares de plan la lisent : ils la
 * passent entière au `QuotaService`, sans en toucher le détail.
 */
export function fakeOrganization(overrides: Record<string, unknown> = {}) {
  return { id: 7, plan: 'pro', type: 'rental', ...overrides }
}

/** Utilisateur porteur d'une organisation, avec le `load()` que les middlewares appellent. */
export function fakeUserWithOrganization(organization: Record<string, unknown>) {
  return { organizationId: organization.id, organization, load: async () => {} }
}
