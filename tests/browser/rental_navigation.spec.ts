import { test } from '@japa/runner'
import Invoice from '#models/invoice'
import RentalContract from '#models/rental_contract'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { restoreCloudinary, swapFakeCloudinary } from '#tests/support/fakes'
import { truncateDb } from '#tests/utils/db'
import {
  createBoatForUser,
  createCharterAdminUser,
  createEnterpriseAdminUser,
} from '#tests/browser/helpers'
import type Boat from '#models/boat'
import type BoatReservation from '#models/boat_reservation'
import type User from '#models/user'

/**
 * La location, réduite aux maillons que le navigateur seul peut prouver
 * (#700, #735).
 *
 * Ce domaine est déjà couvert en profondeur côté HTTP — `rental_contracts.spec.ts`
 * (génération, envoi, signature, remplacement, suppression, IDOR),
 * `inspections.spec.ts` et `inspection_round_trip.spec.ts` (aller-retour des
 * états des lieux), `invoice_from_reservation.spec.ts` (le devis),
 * `module_guard.spec.ts` et `charter_routes_gated.spec.ts` (le gating des 22
 * routes). Rejouer ce parcours en entier ici coûterait des minutes de CI pour
 * zéro information.
 *
 * Restent quatre choses qu'un appel HTTP ne peut pas établir :
 *
 * 1. **qu'un humain atteigne l'écran de contrat** — les actions de
 *    `ReservationList` sont des icônes sans texte, révélées au survol ou au
 *    focus clavier (`opacity-0 group-hover:opacity-100
 *    group-focus-within:opacity-100`), nommées par un `aria-label` (#735) ;
 * 2. **que le bouton « Upload signed contract » ouvre bien le sélecteur de
 *    fichier** — l'`<input type="file">` est `class="hidden"` et piloté par un
 *    bouton proxy qui soumet tout seul au `change` ;
 * 3. **que « Download PDF » produise un vrai téléchargement** — le lien porte
 *    `external-href` et `target="_blank"`, et le serveur répond
 *    `Content-Disposition: attachment` ;
 * 4. **qu'on puisse facturer sans quitter l'écran de la location** (#735) — le
 *    devis se crée depuis la liste par bateau et la visite Inertia doit suivre
 *    la redirection du contrôleur jusqu'à la fiche du document.
 */

async function decorFor(
  user: User
): Promise<{ user: User; boat: Boat; reservation: BoatReservation }> {
  const boat = await createBoatForUser(user, {
    name: 'Charter Trawler',
    propulsionType: 'motorboat',
  })
  const reservation = await BoatReservationFactory.merge({
    boatId: boat.id,
    organizationId: user.organizationId!,
    status: 'confirmed',
    clientName: 'Camille Voile',
    clientEmail: 'camille@example.com',
  }).create()
  return { user, boat, reservation }
}

async function decor(): Promise<{ user: User; boat: Boat; reservation: BoatReservation }> {
  return decorFor(await createCharterAdminUser())
}

test.group('E2E · Rental navigation', (group) => {
  group.each.setup(() => truncateDb())
  group.each.teardown(() => restoreCloudinary())

  test('the contract screen is reachable from the per-boat reservation list', async ({
    browserContext,
    visit,
  }) => {
    const { user, boat, reservation } = await decor()
    await browserContext.loginAs(user)

    const page = await visit(`/boats/${boat.id}/reservations`)
    await page.waitForLoadState('networkidle')

    // L'action porte désormais un nom accessible qui nomme le client (#735),
    // donc on la cible par son rôle plutôt que par son `title` : ce que voit
    // Playwright est exactement ce qu'annonce un lecteur d'écran.
    await page.getByRole('link', { name: 'Rental contract for Camille Voile' }).first().click()

    await page.waitForURL(`**/boats/${boat.id}/reservations/${reservation.id}/contract`)
    await page.assertTextContains('h1', 'Rental contract')
  })

  test('the hidden file input signs the contract through its proxy button', async ({
    browserContext,
    visit,
    assert,
  }) => {
    swapFakeCloudinary()
    const { user, boat, reservation } = await decor()
    await browserContext.loginAs(user)

    const page = await visit(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Generate contract' }).click()
    await page.getByRole('button', { name: 'Send to client' }).waitFor()
    await page.getByRole('button', { name: 'Send to client' }).click()
    await page.getByRole('button', { name: 'Upload signed contract' }).waitFor()

    // Le bouton visible ne fait que relayer un clic à l'input caché ; le
    // `change` déclenche la soumission sans bouton « Envoyer ».
    const chooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Upload signed contract' }).click()
    const chooser = await chooserPromise
    // Le validateur exige un vrai PDF (`vine.file({ extnames: ['pdf'] })`).
    await chooser.setFiles({
      name: 'signed.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 signed by the client'),
    })

    await page.getByRole('button', { name: 'Replace signed contract' }).waitFor()

    const contract = await RentalContract.findByOrFail('reservationId', reservation.id)
    assert.equal(contract.status, 'signed')
    // Le document signé est rattaché par `mediaId`, et `signedAt` est horodaté
    // à la première signature seulement (`attachSignedDocument`).
    assert.isNotNull(contract.mediaId)
    assert.isNotNull(contract.signedAt)
  })

  test('a quote can be created from the per-boat reservation list', async ({
    browserContext,
    visit,
    assert,
  }) => {
    // Enterprise : le module facturation conditionne à la fois la route
    // `POST /invoices/from-reservation/:id` et l'affichage du bouton.
    const { user, boat, reservation } = await decorFor(await createEnterpriseAdminUser())
    await browserContext.loginAs(user)

    const page = await visit(`/boats/${boat.id}/reservations`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Create a quote for Camille Voile' }).click()

    // Le contrôleur redirige vers la fiche du devis : c'est cette redirection,
    // suivie par la visite Inertia, qui ferme le parcours location → facture.
    await page.waitForURL('**/invoices/*')

    const quote = await Invoice.query().where('reservationId', reservation.id).firstOrFail()
    assert.equal(quote.kind, 'quote')
    assert.include(page.url(), `/invoices/${quote.id}`)
  })

  test('the Download PDF link produces a real download', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const { user, boat, reservation } = await decor()
    await browserContext.loginAs(user)

    const page = await visit(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Generate contract' }).click()
    await page.getByRole('link', { name: 'Download PDF' }).waitFor()

    const download = page.waitForEvent('download')
    await page.getByRole('link', { name: 'Download PDF' }).click()

    const file = await download
    assert.match(file.suggestedFilename(), /\.pdf$/)
  })
})
