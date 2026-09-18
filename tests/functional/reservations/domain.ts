import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { BoatInspectionFactory } from '#database/factories/boat_inspection_factory'
import { RentalContractFactory } from '#database/factories/rental_contract_factory'
import type Boat from '#models/boat'
import BoatReservation from '#models/boat_reservation'
import BoatInspection from '#models/boat_inspection'
import BoatInspectionItem from '#models/boat_inspection_item'
import BoatEquipmentAction from '#models/boat_equipment_action'
import RentalContract from '#models/rental_contract'
import Media from '#models/media'
import type User from '#models/user'

/**
 * Le décor commun aux tests de refus du domaine Location (#694), et surtout le
 * **témoin** qui les empêche d'être creux.
 *
 * Un refus asserté sur le seul `location` ne prouve qu'une redirection : la
 * requête aurait pu écrire, puis rediriger. `domainState()` photographie d'un
 * bloc tout ce que le domaine sait écrire ; comparée avant et après, elle
 * transforme « l'utilisateur a été redirigé » en « rien ne s'est passé ».
 */

export interface DomainContext {
  boat: Boat
  reservation: BoatReservation
  inspection: BoatInspection
  contract: RentalContract
}

/**
 * Peuple le domaine **en base**, jamais par HTTP : les routes qui l'auraient
 * créé sont précisément celles dont on veut voir le refus.
 */
export async function seedDomain(user: User): Promise<DomainContext> {
  const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
  const reservation = await BoatReservationFactory.merge({
    boatId: boat.id,
    organizationId: boat.organizationId,
    status: 'confirmed',
  }).create()
  const inspection = await BoatInspectionFactory.merge({
    reservationId: reservation.id,
    organizationId: boat.organizationId,
    kind: 'checkout',
  }).create()
  const contract = await RentalContractFactory.merge({
    reservationId: reservation.id,
    organizationId: boat.organizationId,
  }).create()

  return { boat, reservation, inspection, contract }
}

/** Tout ce que le domaine peut écrire, compté d'un bloc. */
export async function domainState() {
  const [reservations, inspections, items, equipmentActions, contracts, media] = await Promise.all([
    BoatReservation.all(),
    BoatInspection.all(),
    BoatInspectionItem.all(),
    BoatEquipmentAction.all(),
    RentalContract.all(),
    Media.all(),
  ])

  return {
    reservations: reservations.length,
    inspections: inspections.length,
    items: items.length,
    equipmentActions: equipmentActions.length,
    contracts: contracts.length,
    media: media.length,
  }
}
