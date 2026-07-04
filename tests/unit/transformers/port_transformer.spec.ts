import { test } from '@japa/runner'
import { toPortFormOptions } from '#transformers/port_transformer'
import type Port from '#models/port'
import type Pontoon from '#models/pontoon'
import type Mouillage from '#models/mouillage'
import type Spot from '#models/spot'

function makeSpot(id: number, name: string): Spot {
  return { id, name } as unknown as Spot
}

function makePontoon(id: number, name: string, spots: Spot[] = []): Pontoon {
  return { id, name, spots } as unknown as Pontoon
}

function makeMouillage(id: number, name: string, spots: Spot[] = []): Mouillage {
  return { id, name, spots } as unknown as Mouillage
}

function makePort(overrides: Partial<Port> & { id: number; name: string }): Port {
  return {
    pontoons: [],
    mouillages: [],
    ...overrides,
  } as unknown as Port
}

test.group('toPortFormOptions', () => {
  test('empty ports array returns empty array', ({ assert }) => {
    const result = toPortFormOptions([])
    assert.deepEqual(result, [])
  })

  test('maps port with no pontoons and no mouillages', ({ assert }) => {
    const port = makePort({ id: 1, name: 'Port de Nice' })
    const result = toPortFormOptions([port])

    assert.lengthOf(result, 1)
    assert.equal(result[0]!.id, 1)
    assert.equal(result[0]!.name, 'Port de Nice')
    assert.deepEqual(result[0]!.pontoons, [])
    assert.deepEqual(result[0]!.mouillages, [])
  })

  test('maps pontoons with spots correctly', ({ assert }) => {
    const spot1 = makeSpot(10, 'A1')
    const spot2 = makeSpot(11, 'A2')
    const pontoon = makePontoon(20, 'Pontoon A', [spot1, spot2])
    const port = makePort({
      id: 1,
      name: 'Port',
      pontoons: [pontoon] as unknown as Port['pontoons'],
    })
    const result = toPortFormOptions([port])

    assert.lengthOf(result[0]!.pontoons, 1)
    assert.equal(result[0]!.pontoons[0]!.id, 20)
    assert.equal(result[0]!.pontoons[0]!.name, 'Pontoon A')
    assert.lengthOf(result[0]!.pontoons[0]!.spots, 2)
    assert.equal(result[0]!.pontoons[0]!.spots[0]!.id, 10)
    assert.equal(result[0]!.pontoons[0]!.spots[1]!.name, 'A2')
  })

  test('maps mouillages with spots correctly', ({ assert }) => {
    const spot = makeSpot(30, 'M1')
    const mouillage = makeMouillage(40, 'Mouillage Nord', [spot])
    const port = makePort({
      id: 2,
      name: 'Port Est',
      mouillages: [mouillage] as unknown as Port['mouillages'],
    })
    const result = toPortFormOptions([port])

    assert.lengthOf(result[0]!.mouillages, 1)
    assert.equal(result[0]!.mouillages[0]!.id, 40)
    assert.equal(result[0]!.mouillages[0]!.name, 'Mouillage Nord')
    assert.lengthOf(result[0]!.mouillages[0]!.spots, 1)
    assert.equal(result[0]!.mouillages[0]!.spots[0]!.id, 30)
  })

  test('pontoon with empty spots maps to empty spots array', ({ assert }) => {
    const pontoon = makePontoon(20, 'Pontoon A', [])
    const port = makePort({
      id: 1,
      name: 'Port',
      pontoons: [pontoon] as unknown as Port['pontoons'],
    })
    const result = toPortFormOptions([port])

    assert.deepEqual(result[0]!.pontoons[0]!.spots, [])
  })

  test('maps multiple ports', ({ assert }) => {
    const portA = makePort({ id: 1, name: 'Port A' })
    const portB = makePort({ id: 2, name: 'Port B' })
    const result = toPortFormOptions([portA, portB])
    assert.lengthOf(result, 2)
    assert.equal(result[1]!.name, 'Port B')
  })
})
