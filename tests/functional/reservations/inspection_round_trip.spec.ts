import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { createCharterAdminUser } from '#tests/functional/helpers'
import BoatInspection from '#models/boat_inspection'
import BoatInspectionItem from '#models/boat_inspection_item'
import BoatEquipmentAction from '#models/boat_equipment_action'
import Media from '#models/media'
import { restoreCloudinary, swapFakeCloudinary } from '#tests/support/fakes'
import type { ApiClient } from '@japa/api-client'
import type Boat from '#models/boat'
import type BoatReservation from '#models/boat_reservation'
import type User from '#models/user'

/**
 * L'aller-retour d'un état des lieux, de bout en bout (#694).
 *
 * Les pièces étaient couvertes — création, points de contrôle, actions
 * d'équipement, photos — mais jamais le **parcours** : un départ, un retour sur
 * la même réservation, un défaut constaté au retour, l'action qui en découle.
 *
 * ⚠️ Le vocabulaire est l'inverse de l'intuition : `checkout` est le **départ**
 * et `checkin` le **retour** (`shared/types/inspection.ts`). Un test écrit avec
 * l'intuition anglaise du check-in d'hôtel inverserait tout le parcours sans
 * qu'aucune assertion ne s'en aperçoive — les deux valeurs sont symétriques.
 */

interface InspectionRow {
  id: number
  kind: string
  items: { itemKey: string; state: string; note: string | null }[]
  actions: { id: number; label: string; status: string }[]
  photos: { id: number }[]
}

const HULL = 'hull_deck.hull_condition'

/**
 * Les octets magiques d'un JPEG. Le bodyparser détecte le type réel du fichier
 * et non son `contentType` déclaré : un buffer de texte est rejeté par le
 * validateur avant tout envoi, et le test compterait zéro upload sans qu'aucune
 * assertion ne dise pourquoi.
 */
const JPEG = Buffer.from('\xff\xd8\xff\xe0 fake jpeg', 'binary')

function inspectionUrl(boat: Boat, reservation: BoatReservation): string {
  return `/boats/${boat.id}/reservations/${reservation.id}/inspection`
}

async function createInspection(
  client: ApiClient,
  user: User,
  boat: Boat,
  reservation: BoatReservation,
  kind: 'checkout' | 'checkin'
) {
  return client
    .post(`/boats/${boat.id}/reservations/${reservation.id}/inspections`)
    .form({
      kind,
      performedAt: kind === 'checkout' ? '2026-08-01T09:00' : '2026-08-10T18:00',
      fuelLevel: kind === 'checkout' ? 100 : 40,
    })
    .loginAs(user)
    .redirects(0)
}

async function screen(
  client: ApiClient,
  user: User,
  boat: Boat,
  reservation: BoatReservation
): Promise<InspectionRow[]> {
  const response = await client.get(inspectionUrl(boat, reservation)).loginAs(user).withInertia()
  response.assertStatus(200)
  return (response.inertiaProps as { inspections: InspectionRow[] }).inspections
}

/**
 * Toujours chercher par `kind`, jamais par position : l'ordre de la prop est le
 * sujet d'un test précis de ce fichier, et lui seul doit tomber si le tri
 * change. Un `const [checkin, checkout] = …` ferait tomber quatre tests pour une
 * seule cause, en n'en désignant aucune.
 */
function pick(rows: InspectionRow[], kind: 'checkout' | 'checkin'): InspectionRow {
  const found = rows.find((row) => row.kind === kind)
  if (!found) throw new Error(`aucun état des lieux de type ${kind}`)
  return found
}

async function seedTrip(user: User) {
  const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
  const reservation = await BoatReservationFactory.merge({
    boatId: boat.id,
    organizationId: boat.organizationId,
    status: 'confirmed',
  }).create()
  return { boat, reservation }
}

test.group('États des lieux — le départ, puis le retour', (group) => {
  group.each.setup(() => truncateDb())

  test('les deux coexistent sur une même réservation', async ({ client, assert }) => {
    const user = await createCharterAdminUser()
    const { boat, reservation } = await seedTrip(user)

    await createInspection(client, user, boat, reservation, 'checkout')
    await createInspection(client, user, boat, reservation, 'checkin')

    const inspections = await BoatInspection.query()
      .where('reservationId', reservation.id)
      .orderBy('id', 'asc')

    assert.lengthOf(inspections, 2)
    assert.deepEqual(
      inspections.map((inspection) => inspection.kind),
      ['checkout', 'checkin']
    )
    assert.equal(inspections[0].fuelLevel, 100)
    assert.equal(inspections[1].fuelLevel, 40)
  })

  test("un second état des lieux de départ est refusé, et n'écrase pas le premier", async ({
    client,
    assert,
  }) => {
    const user = await createCharterAdminUser()
    const { boat, reservation } = await seedTrip(user)

    await createInspection(client, user, boat, reservation, 'checkout')
    const second = await createInspection(client, user, boat, reservation, 'checkout')

    second.assertStatus(302)
    const inspections = await BoatInspection.query().where('reservationId', reservation.id)
    assert.lengthOf(inspections, 1)
    // Le premier départ est intact : le refus n'a rien remplacé.
    assert.equal(inspections[0].fuelLevel, 100)
  })

  test("l'écran rend le retour avant le départ", async ({ client, assert }) => {
    const user = await createCharterAdminUser()
    const { boat, reservation } = await seedTrip(user)

    await createInspection(client, user, boat, reservation, 'checkout')
    await createInspection(client, user, boat, reservation, 'checkin')

    const inspections = await screen(client, user, boat, reservation)

    // `listForReservation` trie `orderBy('kind', 'asc')`, et `checkin` précède
    // `checkout` dans l'alphabet : la prop commence donc par le **retour**,
    // quel que soit l'ordre de création. Le schéma de
    // `docs/domain/inspections.md` montrait l'inverse — corrigé avec ce test.
    assert.deepEqual(
      inspections.map((inspection) => inspection.kind),
      ['checkin', 'checkout']
    )
  })

  test('un point sain au départ devient endommagé au retour', async ({ client, assert }) => {
    const user = await createCharterAdminUser()
    const { boat, reservation } = await seedTrip(user)

    await createInspection(client, user, boat, reservation, 'checkout')
    await createInspection(client, user, boat, reservation, 'checkin')
    const rowsBefore = await screen(client, user, boat, reservation)
    const checkin = pick(rowsBefore, 'checkin')
    const checkout = pick(rowsBefore, 'checkout')

    const itemsUrl = (inspectionId: number) =>
      `/boats/${boat.id}/reservations/${reservation.id}/inspections/${inspectionId}/items`

    await client
      .patch(itemsUrl(checkout.id))
      .form({ itemKey: HULL, state: 'ok' })
      .loginAs(user)
      .redirects(0)
    await client
      .patch(itemsUrl(checkin.id))
      .form({ itemKey: HULL, state: 'damage', note: 'Impact bâbord sous la ligne de flottaison' })
      .loginAs(user)
      .redirects(0)

    const rows = await screen(client, user, boat, reservation)
    const departure = pick(rows, 'checkout')
    const arrival = pick(rows, 'checkin')

    assert.lengthOf(departure.items, 1)
    assert.equal(departure.items[0].itemKey, HULL)
    assert.equal(departure.items[0].state, 'ok')
    assert.isNull(departure.items[0].note)
    assert.equal(arrival.items[0].state, 'damage')
    assert.equal(arrival.items[0].note, 'Impact bâbord sous la ligne de flottaison')

    // Les deux constats coexistent : c'est la comparaison départ/retour que
    // l'écran affiche, et elle repose sur deux lignes distinctes.
    assert.lengthOf(await BoatInspectionItem.query().where('itemKey', HULL), 2)
  })
})

test.group("États des lieux — du défaut à l'action d'équipement", (group) => {
  group.each.setup(() => truncateDb())

  test('le défaut constaté au retour donne une action rattachée à cet état des lieux', async ({
    client,
    assert,
  }) => {
    const user = await createCharterAdminUser()
    const { boat, reservation } = await seedTrip(user)

    await createInspection(client, user, boat, reservation, 'checkout')
    await createInspection(client, user, boat, reservation, 'checkin')
    const checkin = pick(await screen(client, user, boat, reservation), 'checkin')

    await client
      .patch(`/boats/${boat.id}/reservations/${reservation.id}/inspections/${checkin.id}/items`)
      .form({ itemKey: HULL, state: 'damage', note: 'Impact bâbord' })
      .loginAs(user)
      .redirects(0)

    await client
      .post(
        `/boats/${boat.id}/reservations/${reservation.id}/inspections/${checkin.id}/equipment-actions`
      )
      .form({
        label: 'Réparer la coque bâbord',
        actionType: 'to_repair',
        notes: 'Constaté au retour',
        estimatedCost: 450,
        // Un `boatId` étranger dans le corps ne doit rien changer : le bateau
        // est déduit de la réservation, jamais lu du payload.
        boatId: 999999,
      })
      .loginAs(user)
      .redirects(0)

    const actions = await BoatEquipmentAction.all()
    assert.lengthOf(actions, 1)
    assert.equal(actions[0].inspectionId, checkin.id)
    assert.equal(actions[0].boatId, boat.id)
    assert.equal(actions[0].organizationId, boat.organizationId)
    assert.equal(actions[0].status, 'pending')
    assert.equal(actions[0].actionType, 'to_repair')
    assert.isNull(actions[0].actualCost)

    // L'action n'apparaît que sous le retour, pas sous le départ.
    const rows = await screen(client, user, boat, reservation)
    assert.lengthOf(pick(rows, 'checkin').actions, 1)
    assert.isEmpty(pick(rows, 'checkout').actions)
  })

  test('une action se crée depuis un état des lieux sans le moindre défaut', async ({
    client,
    assert,
  }) => {
    const user = await createCharterAdminUser()
    const { boat, reservation } = await seedTrip(user)

    await createInspection(client, user, boat, reservation, 'checkout')
    const checkout = pick(await screen(client, user, boat, reservation), 'checkout')

    /**
     * ⚠️ **Constat, pas validation.** `docs/domain/inspections.md` présentait
     * « un point en `damage` propose une action d'équipement » comme une règle
     * du domaine. Le backend n'en applique **aucune** : `createFromInspection`
     * ne lit jamais `boat_inspection_items`. La règle n'est qu'un
     * `v-if="row?.state === 'damage' && canManageActions"` dans
     * `InspectionChecklistItem.vue` — une affordance d'interface, que rien
     * n'impose au serveur.
     *
     * Ici, aucun point n'a même été coché.
     */
    assert.isEmpty(checkout.items)

    await client
      .post(
        `/boats/${boat.id}/reservations/${reservation.id}/inspections/${checkout.id}/equipment-actions`
      )
      .form({ label: 'Commander un taud neuf', actionType: 'to_buy' })
      .loginAs(user)
      .redirects(0)

    assert.lengthOf(await BoatEquipmentAction.all(), 1)
  })

  test("supprimer l'état des lieux laisse l'action orpheline plutôt que de l'effacer", async ({
    client,
    assert,
  }) => {
    const user = await createCharterAdminUser()
    const { boat, reservation } = await seedTrip(user)

    await createInspection(client, user, boat, reservation, 'checkin')
    const checkin = pick(await screen(client, user, boat, reservation), 'checkin')

    await client
      .post(
        `/boats/${boat.id}/reservations/${reservation.id}/inspections/${checkin.id}/equipment-actions`
      )
      .form({ label: 'Réparer la coque bâbord', actionType: 'to_repair' })
      .loginAs(user)
      .redirects(0)

    await client
      .delete(`/boats/${boat.id}/reservations/${reservation.id}/inspections/${checkin.id}`)
      .loginAs(user)
      .redirects(0)

    assert.isEmpty(await BoatInspection.all())

    // `inspection_id` est `ON DELETE SET NULL` : le travail à faire sur le
    // bateau survit à la disparition du constat qui l'a motivé, et reste
    // visible depuis la fiche bateau. Figé tel quel.
    const actions = await BoatEquipmentAction.all()
    assert.lengthOf(actions, 1)
    assert.isNull(actions[0].inspectionId)
    assert.equal(actions[0].boatId, boat.id)
  })
})

test.group('États des lieux — les photos de chaque bord du séjour', (group) => {
  group.each.setup(() => truncateDb())

  test("une photo de départ n'est jamais rangée avec celles du retour", async ({
    client,
    assert,
  }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createCharterAdminUser()
      const { boat, reservation } = await seedTrip(user)

      await createInspection(client, user, boat, reservation, 'checkout')
      await createInspection(client, user, boat, reservation, 'checkin')
      const rows = await screen(client, user, boat, reservation)
      const checkin = pick(rows, 'checkin')
      const checkout = pick(rows, 'checkout')

      const photosUrl = (inspectionId: number) =>
        `/boats/${boat.id}/reservations/${reservation.id}/inspections/${inspectionId}/photos`

      for (const [inspectionId, filename] of [
        [checkout.id, 'depart.jpg'],
        [checkin.id, 'retour.jpg'],
      ] as const) {
        await client
          .post(photosUrl(inspectionId))
          .file('files[]', JPEG, { filename, contentType: 'image/jpeg' })
          .loginAs(user)
          .redirects(0)
      }

      assert.lengthOf(fake.uploadedFolders, 2)
      // Le dossier Cloudinary porte le `kind` : les deux séries ne peuvent pas
      // se mélanger, même sur une seule réservation.
      assert.isTrue(
        fake.uploadedFolders[0].endsWith(`/reservations/${reservation.id}/inspections/checkout`)
      )
      assert.isTrue(
        fake.uploadedFolders[1].endsWith(`/reservations/${reservation.id}/inspections/checkin`)
      )

      const after = await screen(client, user, boat, reservation)
      assert.lengthOf(pick(after, 'checkout').photos, 1)
      assert.lengthOf(pick(after, 'checkin').photos, 1)
    } finally {
      restoreCloudinary()
    }
  })

  test('supprimer une photo la retire de la base et de Cloudinary', async ({ client, assert }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createCharterAdminUser()
      const { boat, reservation } = await seedTrip(user)

      await createInspection(client, user, boat, reservation, 'checkout')
      const checkout = pick(await screen(client, user, boat, reservation), 'checkout')

      await client
        .post(`/boats/${boat.id}/reservations/${reservation.id}/inspections/${checkout.id}/photos`)
        .file('files[]', JPEG, { filename: 'depart.jpg', contentType: 'image/jpeg' })
        .loginAs(user)
        .redirects(0)

      const media = await Media.query().where('entityType', 'inspection')
      assert.lengthOf(media, 1)

      await client
        .delete(
          `/boats/${boat.id}/reservations/${reservation.id}/inspections/${checkout.id}/photos/${media[0].id}`
        )
        .loginAs(user)
        .redirects(0)

      assert.isEmpty(await Media.query().where('entityType', 'inspection'))
      assert.deepEqual(fake.deletedPublicIds, [media[0].cloudinaryPublicId])
    } finally {
      restoreCloudinary()
    }
  })
})
