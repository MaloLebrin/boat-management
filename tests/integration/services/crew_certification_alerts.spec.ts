import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import CrewCertification from '#models/crew_certification'
import CrewService from '#services/crew_service'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { CrewMemberFactory } from '#database/factories/crew_member_factory'

const inDays = (days: number) => DateTime.now().startOf('day').plus({ days })

async function seed() {
  const org = await OrganizationFactory.create()
  const [alice, bruno, chloe] = await Promise.all(
    ['Alice', 'Bruno', 'Chloé'].map((firstName) =>
      CrewMemberFactory.merge({ organizationId: org.id, firstName, lastName: 'Marin' }).create()
    )
  )
  await CrewCertification.createMany([
    { crewMemberId: alice!.id, type: 'medical_certificate', expiresAt: inDays(-10) },
    { crewMemberId: alice!.id, type: 'vhf', expiresAt: inDays(200) },
    { crewMemberId: bruno!.id, type: 'stcw_basic', expiresAt: inDays(12) },
    { crewMemberId: bruno!.id, type: 'crr', expiresAt: null },
    { crewMemberId: chloe!.id, type: 'coastal_permit', expiresAt: inDays(61) },
  ])
  // Autre organisation : jamais listée.
  const other = await OrganizationFactory.create()
  const stranger = await CrewMemberFactory.merge({ organizationId: other.id }).create()
  await CrewCertification.create({ crewMemberId: stranger.id, type: 'vhf', expiresAt: inDays(-1) })
  return { org, alice: alice!, bruno: bruno!, chloe: chloe! }
}

// Suite `integration` : une transaction globale, pas de troncature — chaque
// test crée sa propre organisation et ne lit qu'elle.
test.group('CrewService — certifications à renouveler (#882)', () => {
  test('lists expired then soon-expiring certifications, own organization only', async ({
    assert,
  }) => {
    const { org } = await seed()

    const summary = await new CrewService().getDashboardCertifications(org.id)

    assert.equal(summary.expiredCount, 1)
    assert.equal(summary.expiringSoonCount, 1)
    assert.deepEqual(
      summary.items.map((item) => [
        item.crewMemberName,
        item.type,
        item.status,
        item.expiresInDays,
      ]),
      [
        ['Alice Marin', 'medical_certificate', 'expired', -10],
        ['Bruno Marin', 'stcw_basic', 'expiring_soon', 12],
      ]
    )
  })

  test('the crew list and the logbook picker carry each member’s worst status', async ({
    assert,
  }) => {
    const { org, alice, bruno, chloe } = await seed()
    const service = new CrewService()

    const rows = await service.listForOrganization(org)
    const byId = new Map(rows.map((row) => [row.id, row]))
    assert.equal(byId.get(alice.id)!.certificationStatus, 'expired')
    assert.equal(byId.get(bruno.id)!.certificationStatus, 'expiring_soon')
    assert.equal(byId.get(chloe.id)!.certificationStatus, 'valid')
    assert.deepEqual(
      byId
        .get(bruno.id)!
        .certifications.map((c) => c.status)
        .sort(),
      ['expiring_soon', 'undated']
    )

    const options = await service.listOptionsForOrganization(org)
    assert.deepEqual(
      options.map((o) => [o.id, o.certificationStatus]),
      [
        [alice.id, 'expired'],
        [bruno.id, 'expiring_soon'],
        [chloe.id, 'valid'],
      ]
    )
  })
})
