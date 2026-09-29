import { test } from '@japa/runner'
import {
  inspectionReportChanges,
  inspectionReportSections,
  inspectionReportTally,
  isInspectionItemDegraded,
} from '#shared/helpers/inspection_report'

test.group('inspection report (#889)', () => {
  test('a point is degraded only when it gets worse', ({ assert }) => {
    assert.isTrue(isInspectionItemDegraded('ok', 'damage'))
    assert.isTrue(isInspectionItemDegraded('remark', 'damage'))
    assert.isFalse(isInspectionItemDegraded('damage', 'ok'))
    assert.isFalse(isInspectionItemDegraded('ok', 'ok'))
    assert.isFalse(isInspectionItemDegraded(null, 'damage'))
    assert.isFalse(isInspectionItemDegraded('ok', null))
  })

  test('sections follow the boat category and carry each finding', ({ assert }) => {
    const sections = inspectionReportSections('rib', [
      { itemKey: 'hull_deck.hull_condition', state: 'damage', note: 'Rayure' },
    ])

    const keys = sections.map((section) => section.key)
    assert.notInclude(keys, 'rigging')
    assert.notInclude(keys, 'interior')

    const hull = sections.find((section) => section.key === 'hull_deck')!
    assert.deepEqual(hull.rows[0], {
      itemKey: 'hull_deck.hull_condition',
      labelKey: 'inspections.checklist.sections.hull_deck.items.hull_condition',
      state: 'damage',
      note: 'Rayure',
    })
    assert.isNull(hull.rows[1].state)
  })

  test('a finding outside the category is kept at the end of its section', ({ assert }) => {
    // Un semi-rigide n'a pas de hublots ; le constat existe quand même.
    const sections = inspectionReportSections('rib', [
      { itemKey: 'hull_deck.windows_hatches', state: 'remark', note: 'Joint sec' },
    ])

    const hull = sections.find((section) => section.key === 'hull_deck')!
    const last = hull.rows.at(-1)!
    assert.equal(last.itemKey, 'hull_deck.windows_hatches')
    assert.equal(last.state, 'remark')
  })

  test('tally counts not-inspected points', ({ assert }) => {
    const sections = inspectionReportSections('rib', [
      { itemKey: 'hull_deck.hull_condition', state: 'ok', note: null },
      { itemKey: 'safety.lifejackets', state: 'damage', note: 'Manque 2' },
    ])
    const total = sections.reduce((count, section) => count + section.rows.length, 0)

    const tally = inspectionReportTally(sections)
    assert.equal(tally.ok, 1)
    assert.equal(tally.damage, 1)
    assert.equal(tally.remark, 0)
    assert.equal(tally.notInspected, total - 2)
  })

  test('changes list what moved between checkout and checkin', ({ assert }) => {
    const checkout = inspectionReportSections(null, [
      { itemKey: 'hull_deck.hull_condition', state: 'ok', note: null },
      { itemKey: 'engine.engine_oil', state: 'remark', note: 'Bas' },
    ])
    const checkin = inspectionReportSections(null, [
      { itemKey: 'hull_deck.hull_condition', state: 'damage', note: 'Choc au ponton' },
      { itemKey: 'engine.engine_oil', state: 'ok', note: null },
    ])

    const changes = inspectionReportChanges(checkout, checkin)

    assert.deepEqual(
      changes.map((change) => [change.itemKey, change.before, change.after, change.degraded]),
      [
        ['hull_deck.hull_condition', 'ok', 'damage', true],
        ['engine.engine_oil', 'remark', 'ok', false],
      ]
    )
    assert.equal(changes[0].note, 'Choc au ponton')
  })

  test('identical inspections have no change', ({ assert }) => {
    const items = [{ itemKey: 'safety.flares', state: 'ok' as const, note: null }]
    assert.lengthOf(
      inspectionReportChanges(
        inspectionReportSections(null, items),
        inspectionReportSections(null, items)
      ),
      0
    )
  })
})
