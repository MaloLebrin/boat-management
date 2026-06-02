import Boat from '#models/boat'
import Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import User from '#models/user'
import UserService from '#services/user_service'
import type { PlanTier } from '#shared/types/plan'
import app from '@adonisjs/core/services/app'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

const TEST_PASSWORD = 'Password1!'

/**
 * Ensures a user + org exist for the given email.
 * On first run: creates via signupWithOrganization then patches the plan.
 * On subsequent runs: updates the plan only.
 */
async function ensureOwner(
  email: string,
  fullName: string,
  plan: PlanTier
): Promise<{ user: User; org: Organization }> {
  let user = await User.query().where('email', email).first()

  if (!user) {
    const userService = await app.container.make(UserService)
    const result = await userService.signupWithOrganization({
      email,
      password: TEST_PASSWORD,
      fullName,
    })
    user = result.user
    await result.organization.merge({ plan }).save()
    return { user, org: result.organization }
  }

  const org = await Organization.findOrFail(user.organizationId!)
  if (org.plan !== plan) {
    await org.merge({ plan }).save()
  }
  return { user, org }
}

/**
 * Creates a team member user directly attached to a given org.
 * Skips if a user with that email already exists.
 */
async function ensureTeamMember(
  email: string,
  fullName: string,
  orgId: number,
  role: 'admin' | 'member'
): Promise<void> {
  const existing = await User.query().where('email', email).first()

  let userId: number
  if (!existing) {
    const member = await User.create({
      email,
      password: TEST_PASSWORD,
      fullName,
      organizationId: orgId,
    })
    userId = member.id
  } else {
    userId = existing.id
  }

  const hasMembership = await OrganizationMembership.query()
    .where('userId', userId)
    .where('organizationId', orgId)
    .first()

  if (!hasMembership) {
    await OrganizationMembership.create({ userId, organizationId: orgId, role })
  }
}

/**
 * Creates a boat if none with that name exists in the org.
 */
async function ensureBoat(
  orgId: number,
  name: string,
  extra: Partial<Parameters<typeof Boat.create>[0]> = {}
): Promise<void> {
  const exists = await Boat.query().where('organizationId', orgId).where('name', name).first()
  if (!exists) {
    await Boat.create({ organizationId: orgId, name, ...extra })
  }
}

export default class TestPlansSeeder extends BaseSeeder {
  static environment = ['development', 'test']

  async run() {
    // ─── 1. malolebrin@gmail.com → Enterprise ────────────────────────────────
    const adminEmail = process.env.ADMIN_EMAIL ?? 'malolebrin@gmail.com'
    const adminUser = await User.query().where('email', adminEmail).first()
    if (adminUser?.organizationId) {
      const adminOrg = await Organization.findOrFail(adminUser.organizationId)
      if (adminOrg.plan !== 'enterprise') {
        await adminOrg.merge({ plan: 'enterprise' }).save()
        console.log(`✓ ${adminEmail} → enterprise`)
      } else {
        console.log(`  ${adminEmail} already enterprise`)
      }
    } else {
      console.log(`  ${adminEmail} not found, skipping`)
    }

    // ─── 2. Starter org ──────────────────────────────────────────────────────
    const { org: starterOrg } = await ensureOwner('starter@test.local', 'Alice Starter', 'starter')
    console.log(`✓ starter@test.local (org #${starterOrg.id}, plan=starter)`)

    // 2 bateaux — au maximum du plan Starter
    await ensureBoat(starterOrg.id, 'Optimist 2023', {
      propulsionType: 'sailboat',
      lengthM: 2.36,
      beamM: 1.13,
      hullMaterial: 'fiberglass',
      yearBuilt: 2023,
      manufacturer: 'Optimist',
      model: 'Standard',
    })
    await ensureBoat(starterOrg.id, 'Laser 4.7', {
      propulsionType: 'sailboat',
      lengthM: 4.23,
      beamM: 1.37,
      mastHeightM: 6.1,
      hullMaterial: 'fiberglass',
      yearBuilt: 2019,
      manufacturer: 'Performance Sailcraft',
      model: '4.7',
    })
    console.log(`  → 2 bateaux (quota max Starter atteint)`)

    // ─── 3. Pro org ──────────────────────────────────────────────────────────
    const { org: proOrg } = await ensureOwner('pro@test.local', 'Bob Pro', 'pro')
    console.log(`✓ pro@test.local (org #${proOrg.id}, plan=pro)`)

    await ensureTeamMember('pro-alice@test.local', 'Alice Dupont', proOrg.id, 'member')
    await ensureTeamMember('pro-charlie@test.local', 'Charlie Martin', proOrg.id, 'admin')
    console.log(`  → 2 membres d'équipe ajoutés`)

    await ensureBoat(proOrg.id, 'Sun Odyssey 35', {
      propulsionType: 'sailboat',
      lengthM: 10.55,
      beamM: 3.6,
      draftM: 1.8,
      mastHeightM: 16.0,
      hullMaterial: 'fiberglass',
      yearBuilt: 2015,
      manufacturer: 'Jeanneau',
      model: 'Sun Odyssey 35',
    })
    await ensureBoat(proOrg.id, 'Beneteau First 25', {
      propulsionType: 'sailboat',
      lengthM: 7.5,
      beamM: 2.55,
      draftM: 1.4,
      mastHeightM: 11.5,
      hullMaterial: 'fiberglass',
      yearBuilt: 2020,
      manufacturer: 'Beneteau',
      model: 'First 25',
    })
    await ensureBoat(proOrg.id, 'Bavaria 36 CS', {
      propulsionType: 'sailboat',
      lengthM: 10.75,
      beamM: 3.63,
      draftM: 1.82,
      mastHeightM: 15.9,
      hullMaterial: 'fiberglass',
      yearBuilt: 2017,
      manufacturer: 'Bavaria',
      model: '36 CS',
    })
    await ensureBoat(proOrg.id, 'Dufour 360 GL', {
      propulsionType: 'sailboat',
      lengthM: 11.09,
      beamM: 3.77,
      draftM: 1.95,
      mastHeightM: 16.5,
      hullMaterial: 'fiberglass',
      yearBuilt: 2018,
      manufacturer: 'Dufour',
      model: '360 GL',
    })
    await ensureBoat(proOrg.id, 'Hanse 388', {
      propulsionType: 'sailboat',
      lengthM: 11.85,
      beamM: 3.97,
      draftM: 1.99,
      mastHeightM: 17.1,
      hullMaterial: 'fiberglass',
      yearBuilt: 2016,
      manufacturer: 'Hanse',
      model: '388',
    })
    console.log(`  → 5 bateaux`)

    // ─── 4. Enterprise org ───────────────────────────────────────────────────
    const { org: enterpriseOrg } = await ensureOwner(
      'enterprise@test.local',
      'Carol Enterprise',
      'enterprise'
    )
    console.log(`✓ enterprise@test.local (org #${enterpriseOrg.id}, plan=enterprise)`)

    await ensureTeamMember('ent-david@test.local', 'David Bernard', enterpriseOrg.id, 'admin')
    await ensureTeamMember('ent-emma@test.local', 'Emma Leclerc', enterpriseOrg.id, 'member')
    await ensureTeamMember('ent-fabien@test.local', 'Fabien Moreau', enterpriseOrg.id, 'member')
    await ensureTeamMember('ent-gwen@test.local', 'Gwenaëlle Perrot', enterpriseOrg.id, 'member')
    console.log(`  → 4 membres d'équipe ajoutés`)

    const enterpriseBoats = [
      {
        name: 'Oceanis 46.1',
        lengthM: 14.35,
        beamM: 4.49,
        draftM: 2.24,
        mastHeightM: 21.3,
        yearBuilt: 2022,
        manufacturer: 'Beneteau',
        model: 'Oceanis 46.1',
      },
      {
        name: 'Jeanneau 54 DS',
        lengthM: 16.38,
        beamM: 4.67,
        draftM: 2.3,
        mastHeightM: 23.1,
        yearBuilt: 2021,
        manufacturer: 'Jeanneau',
        model: '54 DS',
      },
      {
        name: 'Bali 4.2',
        lengthM: 12.82,
        beamM: 7.58,
        draftM: 1.25,
        yearBuilt: 2020,
        manufacturer: 'Bali Catamarans',
        model: '4.2',
      },
      {
        name: 'Lagoon 42',
        lengthM: 12.81,
        beamM: 7.55,
        draftM: 1.23,
        yearBuilt: 2019,
        manufacturer: 'Lagoon',
        model: '42',
      },
      {
        name: 'Fountaine Pajot Elba 45',
        lengthM: 13.9,
        beamM: 7.72,
        draftM: 1.3,
        yearBuilt: 2023,
        manufacturer: 'Fountaine Pajot',
        model: 'Elba 45',
      },
      {
        name: 'Grand Soleil 46 LC',
        lengthM: 14.43,
        beamM: 4.4,
        draftM: 2.3,
        mastHeightM: 22.0,
        yearBuilt: 2020,
        manufacturer: 'Grand Soleil',
        model: '46 LC',
      },
      {
        name: 'X-Yachts X4°',
        lengthM: 12.4,
        beamM: 3.95,
        draftM: 2.25,
        mastHeightM: 20.1,
        yearBuilt: 2018,
        manufacturer: 'X-Yachts',
        model: 'X4°',
      },
      {
        name: 'Dehler 38',
        lengthM: 11.67,
        beamM: 3.72,
        draftM: 2.1,
        mastHeightM: 18.8,
        yearBuilt: 2017,
        manufacturer: 'Dehler',
        model: '38',
      },
    ]

    for (const b of enterpriseBoats) {
      await ensureBoat(enterpriseOrg.id, b.name, {
        propulsionType: 'sailboat',
        hullMaterial: 'fiberglass',
        ...b,
      })
    }
    console.log(`  → 8 bateaux`)

    console.log('\n✅ TestPlansSeeder terminé')
    console.log('   Comptes de test (mot de passe : Password1!)')
    console.log('   starter@test.local        → plan Starter, 2 bateaux')
    console.log('   pro@test.local            → plan Pro, 5 bateaux, 2 membres')
    console.log('   enterprise@test.local     → plan Enterprise, 8 bateaux, 4 membres')
    console.log(`   ${adminEmail}  → plan Enterprise`)
  }
}
