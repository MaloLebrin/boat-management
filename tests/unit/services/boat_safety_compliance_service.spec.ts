import BoatSafetyComplianceService from '#services/boat_safety_compliance_service'
import { DIVISION_240_TEXT_VERSION } from '#shared/constants/safety/division240_content'
import type {
  SafetyComplianceInput,
  SafetyComplianceIssue,
  SafetyComplianceIssueKind,
  SafetyComplianceItemInput,
} from '#shared/types/safety'
import { test } from '@japa/runner'

const TODAY = '2026-06-15'

function makeService() {
  return new BoatSafetyComplianceService()
}

function buildReport(overrides: Partial<SafetyComplianceInput> = {}) {
  return makeService().buildReport({
    armamentZone: 'coastal',
    maxPersons: 4,
    propulsionType: 'motorboat',
    items: [],
    today: TODAY,
    ...overrides,
  })
}

/** Inventaire couvrant l'armement basique + côtier pour 4 personnes. */
function coastalInventory(): SafetyComplianceItemInput[] {
  return [
    { id: 1, equipmentType: 'life_jacket', quantity: 4, expiryDate: null, purchasedAt: null },
    { id: 2, equipmentType: 'bilge_pump', quantity: 1, expiryDate: null, purchasedAt: null },
    { id: 3, equipmentType: 'anchor', quantity: 1, expiryDate: null, purchasedAt: null },
    {
      id: 4,
      equipmentType: 'fire_extinguisher',
      quantity: 1,
      expiryDate: '2030-01-01',
      purchasedAt: null,
    },
    { id: 5, equipmentType: 'flare', quantity: 3, expiryDate: '2030-01-01', purchasedAt: null },
    { id: 6, equipmentType: 'compass', quantity: 1, expiryDate: null, purchasedAt: null },
  ]
}

function issuesOfKind(issues: SafetyComplianceIssue[], kind: SafetyComplianceIssueKind) {
  return issues.filter((issue) => issue.kind === kind)
}

test.group('BoatSafetyComplianceService — zone non renseignée', () => {
  test('ne produit aucun contrôle et aucun score', ({ assert }) => {
    const report = buildReport({
      armamentZone: null,
      items: [
        // Un équipement franchement périmé : il ne doit rien déclencher tant que
        // la zone n'est pas déclarée (comportement d'avant #582).
        { id: 1, equipmentType: 'flare', quantity: 3, expiryDate: '2020-01-01', purchasedAt: null },
      ],
    })

    assert.isNull(report.zone)
    assert.isNull(report.score)
    assert.equal(report.requirementCount, 0)
    assert.isEmpty(report.issues)
    assert.isEmpty(report.untrackedItemKeys)
    assert.equal(report.textVersion, DIVISION_240_TEXT_VERSION)
  })

  test('traite une zone inconnue comme non renseignée', ({ assert }) => {
    const report = buildReport({ armamentZone: 'transatlantic' as never })

    assert.isNull(report.zone)
    assert.isEmpty(report.issues)
  })
})

test.group('BoatSafetyComplianceService — exigences de la zone', () => {
  test('signale les équipements absents de l’inventaire', ({ assert }) => {
    const report = buildReport({ items: [] })

    const missing = issuesOfKind(report.issues, 'missing').map((issue) => issue.equipmentType)
    assert.includeMembers(missing, [
      'life_jacket',
      'bilge_pump',
      'anchor',
      'fire_extinguisher',
      'flare',
      'compass',
    ])
    assert.equal(report.satisfiedCount, 0)
    assert.equal(report.score, 0)
  })

  test('un inventaire complet couvre toutes les exigences', ({ assert }) => {
    const report = buildReport({ items: coastalInventory() })

    assert.isEmpty(report.issues)
    assert.equal(report.satisfiedCount, report.requirementCount)
    assert.equal(report.score, 100)
    assert.isNotEmpty(report.untrackedItemKeys)
  })

  test('les gilets se comptent par personne embarquée', ({ assert }) => {
    const items = coastalInventory()
    items[0].quantity = 2

    const report = buildReport({ maxPersons: 6, items })
    const issue = issuesOfKind(report.issues, 'insufficient_quantity')[0]

    assert.equal(issue.equipmentType, 'life_jacket')
    assert.equal(issue.requiredQuantity, 6)
    assert.equal(issue.currentQuantity, 2)
    assert.equal(issue.requirementKey, 'basic.life_jacket')
  })

  test('sans maxPersons, une exigence par personne se contente d’une unité', ({ assert }) => {
    const items = coastalInventory()
    items[0].quantity = 1

    const report = buildReport({ maxPersons: null, items })

    assert.isEmpty(issuesOfKind(report.issues, 'insufficient_quantity'))
  })

  test('la zone hauturière cumule les exigences des zones plus proches', ({ assert }) => {
    const coastal = buildReport({ armamentZone: 'coastal' })
    const offshore = buildReport({ armamentZone: 'offshore' })

    assert.isAbove(offshore.requirementCount, coastal.requirementCount)
    const offshoreTypes = offshore.issues.map((issue) => issue.equipmentType)
    assert.includeMembers(offshoreTypes, ['life_jacket', 'flare', 'life_raft', 'epirb'])
  })

  test('le harnais n’est exigé que sur un voilier', ({ assert }) => {
    const motor = buildReport({ armamentZone: 'semi_offshore', propulsionType: 'motorboat' })
    const sail = buildReport({ armamentZone: 'semi_offshore', propulsionType: 'sailboat' })

    assert.notInclude(
      motor.issues.map((issue) => issue.equipmentType),
      'harness'
    )
    assert.include(
      sail.issues.map((issue) => issue.equipmentType),
      'harness'
    )
    assert.equal(sail.requirementCount, motor.requirementCount + 1)
  })
})

test.group('BoatSafetyComplianceService — échéances', () => {
  test('signale une date de péremption saisie et dépassée', ({ assert }) => {
    const items = coastalInventory()
    items[4].expiryDate = '2026-01-01'

    const report = buildReport({ items })
    const issue = issuesOfKind(report.issues, 'expired')[0]

    assert.equal(issue.equipmentType, 'flare')
    assert.equal(issue.dueDate, '2026-01-01')
    assert.equal(issue.dueDateSource, 'declared')
    // L'exigence correspondante n'est plus satisfaite.
    assert.equal(report.satisfiedCount, report.requirementCount - 1)
  })

  test('applique la durée de vie du corpus quand la date d’achat est seule connue', ({
    assert,
  }) => {
    const items = coastalInventory()
    items[4].expiryDate = null
    items[4].purchasedAt = '2020-01-01' // fusées : 3 ans

    const report = buildReport({ items })
    const issue = issuesOfKind(report.issues, 'expired')[0]

    assert.equal(issue.equipmentType, 'flare')
    assert.equal(issue.dueDate, '2023-01-01')
    assert.equal(issue.dueDateSource, 'default')
  })

  test('une révision échue est distinguée d’une péremption', ({ assert }) => {
    const items = coastalInventory()
    items[3].expiryDate = null
    items[3].purchasedAt = '2020-01-01' // extincteur : vérification annuelle

    const report = buildReport({ items })

    assert.equal(issuesOfKind(report.issues, 'review_due')[0].equipmentType, 'fire_extinguisher')
  })

  test('une échéance proche alerte sans invalider l’exigence', ({ assert }) => {
    const items = coastalInventory()
    items[4].expiryDate = '2026-07-01' // dans la fenêtre de 30 jours

    const report = buildReport({ items })

    assert.equal(issuesOfKind(report.issues, 'expiring_soon')[0].equipmentType, 'flare')
    assert.equal(report.satisfiedCount, report.requirementCount)
  })

  test('une échéance lointaine ne produit aucune ligne', ({ assert }) => {
    const report = buildReport({ items: coastalInventory() })

    assert.isEmpty(report.issues)
  })

  test('un équipement hors exigences de la zone reste suivi sur sa péremption', ({ assert }) => {
    const items = [
      ...coastalInventory(),
      {
        id: 9,
        equipmentType: 'life_raft',
        quantity: 1,
        expiryDate: '2020-01-01',
        purchasedAt: null,
      },
    ]

    const report = buildReport({ items })
    const issue = issuesOfKind(report.issues, 'expired')[0]

    assert.equal(issue.equipmentType, 'life_raft')
    // Le radeau n'est pas exigé en zone côtière : le score reste plein.
    assert.equal(report.score, 100)
  })

  test('les écarts sont triés du plus grave au plus anodin', ({ assert }) => {
    const items = coastalInventory()
    items[4].expiryDate = '2026-07-01'
    items.splice(5, 1) // plus de compas

    const report = buildReport({ items })

    assert.equal(report.issues[0].kind, 'missing')
    assert.equal(report.issues[report.issues.length - 1].kind, 'expiring_soon')
  })
})
