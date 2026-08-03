import { test } from '@japa/runner'
import OrganizationService from '#services/organization_service'
import Organization from '#models/organization'

test.group('OrganizationService (unit)', () => {
  // ── createForSignup ──────────────────────────────────────────────────────

  test("createForSignup crée l'org avec le nom saisi au formulaire", async ({ assert }) => {
    const svc = new OrganizationService()
    const org = await svc.createForSignup({ name: 'Marina Bleue' })

    assert.equal(org.name, 'Marina Bleue')
    assert.isString(org.slug)
    assert.include(org.slug, 'marina-bleue')
    assert.isNumber(org.id)
  })

  test('createForSignup persiste le type et la taille de flotte', async ({ assert }) => {
    const svc = new OrganizationService()
    const org = await svc.createForSignup({
      name: 'École de voile du Cotentin',
      type: 'school',
      fleetSize: '21-50',
    })

    const found = await Organization.findOrFail(org.id)
    assert.equal(found.type, 'school')
    assert.equal(found.fleetSize, '21-50')
  })

  test('createForSignup laisse type et taille de flotte à null quand ils sont absents', async ({
    assert,
  }) => {
    const svc = new OrganizationService()
    const org = await svc.createForSignup({ name: 'Sans profil' })

    const found = await Organization.findOrFail(org.id)
    assert.isNull(found.type)
    assert.isNull(found.fleetSize)
  })

  test('createForSignup trim le nom', async ({ assert }) => {
    const svc = new OrganizationService()
    const org = await svc.createForSignup({ name: '  Port Camargue  ' })

    assert.equal(org.name, 'Port Camargue')
  })

  test('createForSignup avec même slug de base génère un slug unique', async ({ assert }) => {
    const svc = new OrganizationService()

    const first = await svc.createForSignup({ name: 'John Smith' })
    const second = await svc.createForSignup({ name: 'John Smith' })

    assert.isString(first.slug)
    assert.isString(second.slug)
    assert.notEqual(first.slug, second.slug)

    // les deux orgs existent bien en DB
    const orgs = await Organization.query().whereIn('id', [first.id, second.id])
    assert.lengthOf(orgs, 2)
  })

  test('createForSignup normalise les accents dans le slug', async ({ assert }) => {
    const svc = new OrganizationService()
    const org = await svc.createForSignup({ name: 'Éléonore Château' })

    assert.notInclude(org.slug, 'é')
    assert.notInclude(org.slug, 'â')
    assert.include(org.slug, 'eleonore')
  })

  test("createForSignup persist l'org en DB", async ({ assert }) => {
    const svc = new OrganizationService()
    const org = await svc.createForSignup({ name: 'Persisté' })

    const found = await Organization.find(org.id)
    assert.isNotNull(found)
    assert.equal(found!.name, 'Persisté')
  })
})
