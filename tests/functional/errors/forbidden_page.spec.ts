import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser, createMechanicUser } from '#tests/functional/helpers'

/**
 * #458 — une ACL refusée sur une navigation renvoyait « Access denied » en texte
 * nu (`AuthorizationException#handle` court-circuite les `statusPages`). On
 * vérifie que le GET HTML reçoit bien la page Inertia habillée, et que les
 * comportements Bouncer conservés (formulaires, JSON) ne régressent pas.
 */
test.group('403 — page d’erreur habillée (functional, #458)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /boats en rôle mécanicien rend la page Inertia errors/forbidden', async ({
    client,
  }) => {
    const admin = await createAdminUser()
    await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const mechanic = await createMechanicUser(admin.organizationId!)

    const response = await client.get('/boats').loginAs(mechanic).withInertia()

    response.assertStatus(403)
    response.assertInertiaComponent('errors/forbidden')
  })

  test('la page 403 porte les props partagées (locale, traductions, utilisateur)', async ({
    assert,
    client,
  }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)

    const response = await client.get('/boats').loginAs(mechanic).withInertia()

    const props = response.inertiaProps as Record<string, unknown>
    assert.isDefined(props.user)
    assert.isDefined(props.locale)
    // Sans `appT`, la page se rendrait avec les clés brutes (`errors.forbidden.title`).
    assert.isDefined(props.appT)
  })

  test('une navigation HTML sans en-tête Inertia reçoit du HTML, plus « Access denied » brut', async ({
    assert,
    client,
  }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)

    const response = await client.get('/boats').loginAs(mechanic).accept('html')

    response.assertStatus(403)
    const html = response.text()
    assert.notEqual(html.trim(), 'Access denied')
    assert.include(html, 'errors/forbidden')
    // Rendu SSR complet : titre traduit dans le `<h1>` (les clés brutes seraient
    // rendues telles quelles par `useT` si `appT` manquait) et lien de retour.
    assert.include(html, '>Access denied</h1>')
    assert.include(html, 'You don&#39;t have permission to access this page.')
    assert.include(html, 'href="/dashboard"')
  })

  test('un client JSON garde le payload d’erreur Bouncer (pas de page Inertia)', async ({
    assert,
    client,
  }) => {
    const admin = await createAdminUser()
    const mechanic = await createMechanicUser(admin.organizationId!)

    const response = await client.get('/boats').loginAs(mechanic).accept('json')

    response.assertStatus(403)
    assert.notInclude(JSON.stringify(response.body()), 'errors/forbidden')
  })

  test('une soumission de formulaire refusée garde le flash + redirect back de Bouncer', async ({
    assert,
    client,
  }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const mechanic = await createMechanicUser(admin.organizationId!)

    await client.post(`/boats/${boat.id}/maintenance`).loginAs(admin).form({
      subject: 'engine',
      engineCaption: 'Moteur principal',
      title: 'À supprimer',
      performedAt: '2025-05-01',
    })
    const event = await BoatMaintenanceEvent.query().where('boatId', boat.id).firstOrFail()

    const response = await client
      .delete(`/boats/${boat.id}/maintenance/${event.id}`)
      .loginAs(mechanic)
      .redirects(0)

    response.assertStatus(302)
    assert.property(response.flashMessages().errorsBag as object, 'E_AUTHORIZATION_FAILURE')
  })
})
