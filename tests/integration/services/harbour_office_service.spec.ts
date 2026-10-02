import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import MarinaStay from '#models/marina_stay'
import MooringContract from '#models/mooring_contract'
import HarbourOfficeService from '#services/harbour_office_service'
import { BoatFactory } from '#database/factories/boat_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import { PortFactory } from '#database/factories/port_factory'
import { SpotFactory } from '#database/factories/spot_factory'

/**
 * Indicateurs de la capitainerie (#891). Le taux du mois compte des
 * place-nuits : une nuit couverte à la fois par un contrat et une escale ne
 * compte qu'une fois, sinon le taux dépasse ce que le port peut accueillir.
 */

async function port() {
  const org = await OrganizationFactory.create()
  const p = await PortFactory.merge({ organizationId: org.id }).create()
  const pontoon = await PontoonFactory.merge({ portId: p.id }).create()
  const spots = await SpotFactory.merge({
    organizationId: org.id,
    pontoonId: pontoon.id,
  }).createMany(4)
  return { org, port: p, spots }
}

const service = () => app.container.make(HarbourOfficeService)

test.group('HarbourOfficeService', () => {
  test('aujourd’hui : bateau amarré et escale arrivée occupent, une attendue non', async ({
    assert,
  }) => {
    const { org, port: p, spots } = await port()
    await BoatFactory.merge({ organizationId: org.id, spotId: spots[0].id }).create()
    for (const [spot, status] of [
      [spots[1], 'arrived'],
      [spots[2], 'expected'],
    ] as const) {
      await MarinaStay.create({
        organizationId: org.id,
        portId: p.id,
        spotId: spot.id,
        visitorName: 'V',
        arrivalOn: DateTime.fromISO('2026-07-10'),
        departureOn: DateTime.fromISO('2026-07-20'),
        status,
        nightlyRate: 0,
        services: [],
      })
    }

    const office = await service()
    const data = await office.forPort(p, DateTime.fromISO('2026-07-10'))

    assert.equal(data.occupancy.totalSpots, 4)
    assert.equal(data.occupancy.occupiedNow, 2)
    assert.equal(data.occupancy.rateNow, 50)
    // L'escale attendue arrive aujourd'hui : elle est dans les arrivées du jour.
    assert.lengthOf(data.arrivalsToday, 1)
  })

  test('le mois : une place-nuit couverte deux fois ne compte qu’une fois', async ({ assert }) => {
    const { org, port: p, spots } = await port()
    // Contrat sur tout juillet (31 nuits) + escale sur la même place.
    await MooringContract.create({
      organizationId: org.id,
      portId: p.id,
      spotId: spots[0].id,
      startsOn: DateTime.fromISO('2026-01-01'),
      endsOn: DateTime.fromISO('2026-12-31'),
      periodicity: 'monthly',
      amount: 100,
      status: 'active',
    })
    await MarinaStay.create({
      organizationId: org.id,
      portId: p.id,
      spotId: spots[0].id,
      visitorName: 'V',
      arrivalOn: DateTime.fromISO('2026-07-05'),
      departureOn: DateTime.fromISO('2026-07-08'),
      status: 'departed',
      nightlyRate: 0,
      services: [],
    })

    const office = await service()
    const data = await office.forPort(p, DateTime.fromISO('2026-07-15'))

    // 31 place-nuits sur 4 × 31 = 25 %.
    assert.equal(data.occupancy.rateMonth, 25)
    assert.lengthOf(data.contracts, 1)
    assert.lengthOf(data.stays, 1)
  })
})
