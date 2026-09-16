import { test } from '@japa/runner'
import BoatContextService from '#services/boat_context_service'
import { BoatNotFoundError } from '#exceptions/boat_errors'
import type BoatHullService from '#services/boat_hull_service'
import type BoatReservationService from '#services/boat_reservation_service'

const user = { id: 1, organizationId: 7 }
const boat = { id: 42, organizationId: 7 }
const reservation = { id: 9, boatId: 42 }

function makeCtx(params: Record<string, string>) {
  const redirects: string[] = []
  return {
    redirects,
    ctx: {
      auth: { getUserOrFail: () => user },
      params,
      response: {
        redirect: (target: string) => {
          redirects.push(target)
        },
      },
    } as never,
  }
}

function makeService(options: { boatFound?: boolean; reservationFound?: boolean } = {}) {
  const calls: Array<[string, unknown[]]> = []
  const boatService = {
    getForUserOrFail: async (...args: unknown[]) => {
      calls.push(['boat', args])
      if (options.boatFound === false) throw new BoatNotFoundError()
      return boat
    },
  } as unknown as BoatHullService
  const reservationService = {
    findForBoat: async (...args: unknown[]) => {
      calls.push(['reservation', args])
      return options.reservationFound === false ? null : reservation
    },
  } as unknown as BoatReservationService
  return { service: new BoatContextService(boatService, reservationService), calls }
}

test.group('BoatContextService (unit)', () => {
  test('resolveBoat returns the user and the boat of the route', async ({ assert }) => {
    const { service, calls } = makeService()
    const { ctx, redirects } = makeCtx({ boatId: '42' })

    const resolved = await service.resolveBoat(ctx)

    assert.deepEqual(resolved, { user, boat } as never)
    assert.deepEqual(calls, [['boat', [user, 42]]])
    assert.deepEqual(redirects, [])
  })

  test('resolveBoat reads another route parameter when asked', async ({ assert }) => {
    const { service, calls } = makeService()
    const { ctx } = makeCtx({ id: '42' })

    await service.resolveBoat(ctx, 'id')

    assert.deepEqual(calls, [['boat', [user, 42]]])
  })

  test('resolveBoat redirects to /boats and returns null for a foreign or missing boat', async ({
    assert,
  }) => {
    const { service } = makeService({ boatFound: false })
    const { ctx, redirects } = makeCtx({ boatId: '42' })

    const resolved = await service.resolveBoat(ctx)

    assert.isNull(resolved)
    assert.deepEqual(redirects, ['/boats'])
  })

  test('resolveBoat lets any other error bubble up', async ({ assert }) => {
    const boatService = {
      getForUserOrFail: async () => {
        throw new TypeError('boom')
      },
    } as unknown as BoatHullService
    const service = new BoatContextService(boatService, {} as BoatReservationService)
    const { ctx, redirects } = makeCtx({ boatId: '42' })

    await assert.rejects(() => service.resolveBoat(ctx), TypeError)
    assert.deepEqual(redirects, [])
  })

  test('resolveBoatAndReservation returns the reservation of the route', async ({ assert }) => {
    const { service, calls } = makeService()
    const { ctx, redirects } = makeCtx({ boatId: '42', reservationId: '9' })

    const resolved = await service.resolveBoatAndReservation(ctx)

    assert.deepEqual(resolved, { user, boat, reservation } as never)
    assert.deepEqual(calls[1], ['reservation', [user, boat, 9]])
    assert.deepEqual(redirects, [])
  })

  test('resolveBoatAndReservation redirects to the reservations list when it is missing', async ({
    assert,
  }) => {
    const { service } = makeService({ reservationFound: false })
    const { ctx, redirects } = makeCtx({ boatId: '42', reservationId: '9' })

    const resolved = await service.resolveBoatAndReservation(ctx)

    assert.isNull(resolved)
    assert.deepEqual(redirects, ['/boats/42/reservations'])
  })

  test('resolveBoatAndReservation stops at the boat redirect without looking up the reservation', async ({
    assert,
  }) => {
    const { service, calls } = makeService({ boatFound: false })
    const { ctx, redirects } = makeCtx({ boatId: '42', reservationId: '9' })

    const resolved = await service.resolveBoatAndReservation(ctx)

    assert.isNull(resolved)
    assert.deepEqual(redirects, ['/boats'])
    assert.lengthOf(calls, 1)
  })
})
