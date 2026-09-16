import { test } from '@japa/runner'
import RequireModulePlanMiddleware from '#middleware/require_module_plan_middleware'
import { QuotaExceededError } from '#exceptions/quota_errors'
import { BILLING_SETTINGS_PATH } from '#shared/constants/billing'
import type QuotaService from '#services/quota_service'
import type { ModulePlanFeature } from '#shared/types/plan'

const organization = { id: 7, plan: 'pro' }

function makeCtx() {
  const flashes: Array<[string, string]> = []
  const redirects: string[] = []
  const user = {
    organizationId: 7,
    organization,
    load: async () => {},
  }
  return {
    flashes,
    redirects,
    ctx: {
      auth: { getUserOrFail: () => user },
      session: {
        flash: (key: string, value: string) => {
          flashes.push([key, value])
        },
      },
      i18n: { t: (key: string) => `t:${key}` },
      response: {
        redirect: (target: string) => {
          redirects.push(target)
        },
      },
    } as never,
  }
}

function makeMiddleware(denied: ModulePlanFeature[] = []) {
  const asserted: Array<[ModulePlanFeature, unknown]> = []
  const deny = (feature: ModulePlanFeature) => async (org: unknown) => {
    asserted.push([feature, org])
    if (denied.includes(feature)) {
      throw new QuotaExceededError(feature, { limit: null, current: 0, upgradeTo: 'enterprise' })
    }
  }
  const quotaService = {
    assertCanManageClients: deny('clients'),
    assertCanManageInvoices: deny('invoices'),
    assertCanManagePricing: deny('pricing'),
    assertCanManageReservations: deny('reservations'),
  } as unknown as QuotaService
  return { middleware: new RequireModulePlanMiddleware(quotaService), asserted }
}

test.group('RequireModulePlanMiddleware (unit)', () => {
  for (const feature of ['clients', 'invoices', 'pricing', 'reservations'] as const) {
    test(`lets the request through when the ${feature} module is available`, async ({ assert }) => {
      const { middleware, asserted } = makeMiddleware()
      const { ctx, redirects, flashes } = makeCtx()
      let nextCalled = 0

      await middleware.handle(
        ctx,
        async () => {
          nextCalled++
        },
        { feature }
      )

      assert.equal(nextCalled, 1)
      assert.deepEqual(asserted, [[feature, organization]])
      assert.deepEqual(redirects, [])
      assert.deepEqual(flashes, [])
    })

    test(`redirects to billing with the ${feature} message when the module is missing`, async ({
      assert,
    }) => {
      const { middleware } = makeMiddleware([feature])
      const { ctx, redirects, flashes } = makeCtx()
      let nextCalled = 0

      await middleware.handle(
        ctx,
        async () => {
          nextCalled++
        },
        { feature }
      )

      assert.equal(nextCalled, 0)
      assert.deepEqual(redirects, [BILLING_SETTINGS_PATH])
      assert.deepEqual(flashes, [['error', `t:flash.quota.${feature}Exceeded`]])
    })
  }

  test('lets any other error bubble up', async ({ assert }) => {
    const quotaService = {
      assertCanManageClients: async () => {
        throw new TypeError('boom')
      },
    } as unknown as QuotaService
    const middleware = new RequireModulePlanMiddleware(quotaService)
    const { ctx, redirects } = makeCtx()

    await assert.rejects(
      () => middleware.handle(ctx, async () => {}, { feature: 'clients' }),
      TypeError
    )
    assert.deepEqual(redirects, [])
  })
})
