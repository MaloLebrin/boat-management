import { test } from '@japa/runner'
import OrganizationService from '#services/organization_service'
import Organization from '#models/organization'

test.group('OrganizationService (unit)', () => {
  // ── createForSignup ──────────────────────────────────────────────────────

  test("createForSignup avec email et fullName crée l'org avec le bon nom", async ({ assert }) => {
    const svc = new OrganizationService()
    const org = await svc.createForSignup({
      email: 'alice@example.com',
      fullName: 'Alice Dupont',
    })

    assert.equal(org.name, 'Alice Dupont')
    assert.isString(org.slug)
    assert.include(org.slug, 'alice-dupont')
    assert.isNumber(org.id)
  })

  test('createForSignup avec email seulement dérive le nom de la partie locale', async ({
    assert,
  }) => {
    const svc = new OrganizationService()
    const org = await svc.createForSignup({ email: 'skipper.pro@example.com' })

    assert.equal(org.name, 'skipper.pro')
    assert.include(org.slug, 'skipper-pro')
  })

  test("createForSignup avec fullName vide ou null dérive le nom de l'email", async ({
    assert,
  }) => {
    const svc = new OrganizationService()
    const org = await svc.createForSignup({
      email: 'bob@example.com',
      fullName: null,
    })

    assert.equal(org.name, 'bob')
  })

  test("createForSignup avec fullName whitespace dérive le nom de l'email", async ({ assert }) => {
    const svc = new OrganizationService()
    const org = await svc.createForSignup({
      email: 'carol@example.com',
      fullName: '   ',
    })

    assert.equal(org.name, 'carol')
  })

  test('createForSignup avec même slug de base génère un slug unique', async ({ assert }) => {
    const svc = new OrganizationService()

    const first = await svc.createForSignup({ email: 'john@example.com', fullName: 'John Smith' })
    const second = await svc.createForSignup({ email: 'john2@example.com', fullName: 'John Smith' })

    assert.isString(first.slug)
    assert.isString(second.slug)
    assert.notEqual(first.slug, second.slug)

    // les deux orgs existent bien en DB
    const orgs = await Organization.query().whereIn('id', [first.id, second.id])
    assert.lengthOf(orgs, 2)
  })

  test('createForSignup normalise les accents dans le slug', async ({ assert }) => {
    const svc = new OrganizationService()
    const org = await svc.createForSignup({ email: 'a@example.com', fullName: 'Éléonore Château' })

    assert.notInclude(org.slug, 'é')
    assert.notInclude(org.slug, 'â')
    assert.include(org.slug, 'eleonore')
  })

  test("createForSignup persist l'org en DB", async ({ assert }) => {
    const svc = new OrganizationService()
    const org = await svc.createForSignup({ email: 'persist@example.com' })

    const found = await Organization.find(org.id)
    assert.isNotNull(found)
    assert.equal(found!.name, 'persist')
  })
})
