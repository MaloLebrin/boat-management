import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import Boat from '#models/boat'
import Organization from '#models/organization'
import User from '#models/user'
import ResetDemoData from '#jobs/reset_demo_data'
import { BoatFactory } from '#database/factories/boat_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { UserFactory } from '#database/factories/user_factory'
import { DEMO_EMAIL, DEMO_ORG_SLUG } from '#shared/constants/demo'

/**
 * Réinitialisation du compte de démonstration — cron quotidien 04:00 (#699).
 *
 * Le second des deux crons destructeurs, et le plus dangereux des deux :
 * `DemoService.reset()` **supprime** un utilisateur, une organisation et tous
 * ses bateaux, puis rejoue le seed. Toute la sûreté du job tient à la portée de
 * ces suppressions — `where('email', DEMO_EMAIL)` et `where('slug', DEMO_ORG_SLUG)`.
 *
 * Un `where` relâché ou oublié au fil d'une refonte effacerait des organisations
 * clientes, à 04:00, sans personne pour le voir. C'est ce que fige le second
 * test, et c'est la raison d'être de ce fichier — pas la vérification du contenu
 * du seed, déjà couverte par `tests/integration/seeders/demo_marina_plan.spec.ts`.
 */

async function run() {
  const job = await app.container.make(ResetDemoData)
  await job.execute()
}

test.group('ResetDemoData (cron 04:00)', () => {
  test('the demo account exists again after the run', async ({ assert }) => {
    await run()

    const user = await User.query().where('email', DEMO_EMAIL).first()
    const org = await Organization.query().where('slug', DEMO_ORG_SLUG).first()

    assert.isNotNull(user, 'le compte démo doit être reconstruit par le seed')
    assert.isNotNull(org)
  })

  test('a real organization and its boats are left untouched', async ({ assert }) => {
    // La garde qui compte. Si les suppressions débordaient de leur `where`, ce
    // test tomberait — et c'est exactement la panne qu'on ne veut pas découvrir
    // en production, un matin, sur les données d'un client.
    const org = await OrganizationFactory.merge({ name: 'Client réel' }).create()
    const user = await UserFactory.merge({ organizationId: org.id }).create()
    const boat = await BoatFactory.merge({ organizationId: org.id }).create()

    await run()

    assert.isNotNull(await Organization.find(org.id), "l'organisation cliente a été supprimée")
    assert.isNotNull(await User.find(user.id))
    assert.isNotNull(await Boat.find(boat.id))
  })

  test('running twice leaves a single demo organization', async ({ assert }) => {
    // Le cron tourne tous les jours : un reset qui empilerait les organisations
    // démo au lieu de les remplacer ferait grossir la base indéfiniment.
    await run()
    await run()

    const orgs = await Organization.query().where('slug', DEMO_ORG_SLUG)
    const users = await User.query().where('email', DEMO_EMAIL)

    assert.lengthOf(orgs, 1)
    assert.lengthOf(users, 1)
  })
})
