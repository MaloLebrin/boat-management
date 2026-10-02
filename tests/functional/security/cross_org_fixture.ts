import { createHash } from 'node:crypto'
import { DateTime } from 'luxon'
import type User from '#models/user'
import Organization from '#models/organization'
import Boat from '#models/boat'
import Client from '#models/client'
import MarinaStay from '#models/marina_stay'
import MooringContract from '#models/mooring_contract'
import BoatReservationCrewMember from '#models/boat_reservation_crew_member'
import CrewCertification from '#models/crew_certification'
import CrewUnavailability from '#models/crew_unavailability'
import DataExport from '#models/data_export'
import ExternalCalendar from '#models/external_calendar'
import PushSubscription from '#models/push_subscription'
import BoatMaintenanceSheetItem from '#models/boat_maintenance_sheet_item'
import BoatEngineRepairCartItem from '#models/boat_engine_repair_cart_item'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatSailFactory } from '#database/factories/boat_sail_factory'
import { BoatRigFactory } from '#database/factories/boat_rig_factory'
import { BoatSafetyEquipmentFactory } from '#database/factories/boat_safety_equipment_factory'
import { BoatGenericEquipmentFactory } from '#database/factories/boat_generic_equipment_factory'
import { BoatEnginePartFactory } from '#database/factories/boat_engine_part_factory'
import { MediaFactory } from '#database/factories/media_factory'
import { BoatIncidentFactory } from '#database/factories/boat_incident_factory'
import { BoatMaintenanceTaskFactory } from '#database/factories/boat_maintenance_task_factory'
import { BoatMaintenanceEventFactory } from '#database/factories/boat_maintenance_event_factory'
import { BoatFuelLogFactory } from '#database/factories/boat_fuel_log_factory'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'
import { NavigationLogEntryFactory } from '#database/factories/navigation_log_entry_factory'
import { BoatDocumentFactory } from '#database/factories/boat_document_factory'
import { BoatBudgetEntryFactory } from '#database/factories/boat_budget_entry_factory'
import { BoatPortStayFactory } from '#database/factories/boat_port_stay_factory'
import { BoatMaintenanceSheetFactory } from '#database/factories/boat_maintenance_sheet_factory'
import { BoatEquipmentActionFactory } from '#database/factories/boat_equipment_action_factory'
import { PortFactory } from '#database/factories/port_factory'
import { PontoonFactory } from '#database/factories/pontoon_factory'
import { MouillageFactory } from '#database/factories/mouillage_factory'
import { SpotFactory } from '#database/factories/spot_factory'
import { ClientFactory } from '#database/factories/client_factory'
import { InvoiceFactory } from '#database/factories/invoice_factory'
import { CrewMemberFactory } from '#database/factories/crew_member_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { BoatInspectionFactory } from '#database/factories/boat_inspection_factory'
import { NotificationFactory } from '#database/factories/notification_factory'
import { PricingSeasonFactory } from '#database/factories/pricing_season_factory'
import { OrganizationInvitationFactory } from '#database/factories/organization_invitation_factory'
import { createMemberUser } from '#tests/functional/helpers'

/**
 * Marqueur unique de l'organisation victime. Une réponse qui le contient a
 * servi des données de l'autre organisation (#855).
 */
export const SENTINEL = 'ORG-B-SENTINEL-855'

/** Identifiants de l'organisation victime, prêts à remplir une URL. */
export interface CrossOrgIds {
  boatId: number
  engineId: number
  sailId: number
  partId: number
  mediaId: number
  incidentId: number
  taskId: number
  eventId: number
  fuelLogId: number
  navigationLogId: number
  entryId: number
  documentId: number
  budgetEntryId: number
  stayId: number
  sheetId: number
  sheetItemId: number
  actionId: number
  safetyId: number
  genericId: number
  portId: number
  pontoonId: number
  mouillageId: number
  spotId: number
  clientId: number
  invoiceId: number
  crewId: number
  certId: number
  reservationId: number
  inspectionId: number
  notificationId: number
  seasonId: number
  memberId: number
  invitationId: number
  exportId: number
  pushId: number
  calendarId: number
  cartItemId: number
  crewAssignmentId: number
  unavailabilityId: number
  marinaStayId: number
  contractId: number
}

/**
 * Profil marina : la cartographie de port refuse les particuliers avant même
 * de chercher la ressource. L'intrus doit franchir cette garde, sinon un 302
 * vers le dashboard passerait pour un cloisonnement.
 */
export async function markMarina(user: User): Promise<void> {
  const org = await Organization.findOrFail(user.organizationId!)
  org.type = 'marina'
  await org.save()
}

/**
 * Jeu minimal couvrant les paramètres d'URL des routes authentifiées.
 * Tout est rattaché à `user` (l'organisation victime).
 */
export async function seedVictimGraph(user: User): Promise<CrossOrgIds> {
  const orgId = user.organizationId!

  const boat = await BoatFactory.merge({ organizationId: orgId, name: SENTINEL }).create()
  const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
  const sail = await BoatSailFactory.merge({ boatId: boat.id }).create()
  await BoatRigFactory.merge({ boatId: boat.id }).create()
  const safety = await BoatSafetyEquipmentFactory.merge({ boatId: boat.id }).create()
  const generic = await BoatGenericEquipmentFactory.merge({ boatId: boat.id }).create()
  const part = await BoatEnginePartFactory.merge({ boatEngineId: engine.id }).create()
  const media = await MediaFactory.merge({
    entityType: 'boat',
    entityId: boat.id,
    organizationId: orgId,
    uploadedById: user.id,
  }).create()
  const incident = await BoatIncidentFactory.merge({
    boatId: boat.id,
    organizationId: orgId,
  }).create()
  const task = await BoatMaintenanceTaskFactory.merge({ boatId: boat.id }).create()
  const event = await BoatMaintenanceEventFactory.merge({ boatId: boat.id }).create()
  const fuelLog = await BoatFuelLogFactory.merge({
    boatId: boat.id,
    organizationId: orgId,
  }).create()
  const navigationLog = await NavigationLogFactory.merge({
    boatId: boat.id,
    organizationId: orgId,
  }).create()
  const entry = await NavigationLogEntryFactory.merge({
    navigationLogId: navigationLog.id,
    organizationId: orgId,
  }).create()
  const document = await BoatDocumentFactory.merge({
    boatId: boat.id,
    organizationId: orgId,
  }).create()
  const budgetEntry = await BoatBudgetEntryFactory.merge({ boatId: boat.id }).create()
  const stay = await BoatPortStayFactory.merge({ boatId: boat.id }).create()
  const sheet = await BoatMaintenanceSheetFactory.merge({
    boatId: boat.id,
    type: 'entretien',
    status: 'in_progress',
  }).create()
  const sheetItem = await BoatMaintenanceSheetItem.create({
    boatMaintenanceSheetId: sheet.id,
    label: 'Anode',
    isDone: false,
    position: 0,
    templateKey: null,
    notes: null,
  })
  const action = await BoatEquipmentActionFactory.merge({
    organizationId: orgId,
    boatId: boat.id,
    createdBy: user.id,
  }).create()
  const cartItem = await BoatEngineRepairCartItem.create({
    boatEngineId: engine.id,
    partKey: 'impeller',
    quantity: 1,
    reference: null,
  })

  const port = await PortFactory.merge({ organizationId: orgId, name: SENTINEL }).create()
  const pontoon = await PontoonFactory.merge({ portId: port.id }).create()
  const mouillage = await MouillageFactory.merge({ portId: port.id }).create()
  const spot = await SpotFactory.merge({
    organizationId: orgId,
    pontoonId: pontoon.id,
  }).create()

  const client = await ClientFactory.merge({
    organizationId: orgId,
    lastName: SENTINEL,
  }).create()
  const invoice = await InvoiceFactory.merge({
    organizationId: orgId,
    clientId: client.id,
    clientName: SENTINEL,
  })
    .apply('invoice')
    .create()
  // Capitainerie (#891) : une escale visiteur et un contrat d'amarrage.
  const marinaStay = await MarinaStay.create({
    organizationId: orgId,
    portId: port.id,
    spotId: spot.id,
    visitorName: SENTINEL,
    arrivalOn: DateTime.fromISO('2026-07-01'),
    departureOn: DateTime.fromISO('2026-07-04'),
    status: 'arrived',
    nightlyRate: 30,
    services: [],
  })
  const mooringContract = await MooringContract.create({
    organizationId: orgId,
    portId: port.id,
    spotId: spot.id,
    clientId: client.id,
    startsOn: DateTime.fromISO('2026-07-01'),
    periodicity: 'monthly',
    amount: 450,
    nextInvoiceOn: DateTime.fromISO('2026-08-01'),
    status: 'active',
  })
  const crew = await CrewMemberFactory.merge({
    organizationId: orgId,
    lastName: SENTINEL,
  }).create()
  const certification = await CrewCertification.create({
    crewMemberId: crew.id,
    type: 'vhf',
    referenceNumber: null,
    expiresAt: null,
  })
  const reservation = await BoatReservationFactory.merge({
    boatId: boat.id,
    organizationId: orgId,
    clientId: client.id,
    clientName: SENTINEL,
  }).create()
  const inspection = await BoatInspectionFactory.merge({
    organizationId: orgId,
    reservationId: reservation.id,
  }).create()

  const notification = await NotificationFactory.merge({
    userId: user.id,
    organizationId: orgId,
  }).create()
  const season = await PricingSeasonFactory.merge({ organizationId: orgId }).create()
  const member = await createMemberUser(orgId)
  const invitation = await OrganizationInvitationFactory.merge({ organizationId: orgId }).create()
  const dataExport = await DataExport.create({
    organizationId: orgId,
    userId: user.id,
    type: 'clients',
    params: { from: null, to: null },
    status: 'pending',
    expiresAt: DateTime.now().plus({ days: 7 }),
  })
  const endpoint = `https://push.example.test/${orgId}`
  const push = await PushSubscription.create({
    userId: user.id,
    organizationId: orgId,
    endpoint,
    endpointHash: createHash('sha256').update(endpoint).digest('hex'),
    p256dh: 'p256dh-key',
    auth: 'auth-key',
    failureCount: 0,
  })
  // Planning d'équipage (#883) : affectation et indisponibilité de B.
  const crewAssignment = await BoatReservationCrewMember.create({
    reservationId: reservation.id,
    crewMemberId: crew.id,
    role: 'skipper',
    notes: null,
  })
  const unavailability = await CrewUnavailability.create({
    crewMemberId: crew.id,
    startsOn: DateTime.now().plus({ days: 60 }),
    endsOn: DateTime.now().plus({ days: 62 }),
    reason: null,
  })

  const calendar = await ExternalCalendar.create({
    organizationId: orgId,
    boatId: boat.id,
    name: SENTINEL,
    url: 'https://calendar.example.test/victim.ics',
  })

  return {
    boatId: boat.id,
    engineId: engine.id,
    sailId: sail.id,
    partId: part.id,
    mediaId: media.id,
    incidentId: incident.id,
    taskId: task.id,
    eventId: event.id,
    fuelLogId: fuelLog.id,
    navigationLogId: navigationLog.id,
    entryId: entry.id,
    documentId: document.id,
    budgetEntryId: budgetEntry.id,
    stayId: stay.id,
    sheetId: sheet.id,
    sheetItemId: sheetItem.id,
    actionId: action.id,
    safetyId: safety.id,
    genericId: generic.id,
    portId: port.id,
    pontoonId: pontoon.id,
    mouillageId: mouillage.id,
    spotId: spot.id,
    clientId: client.id,
    invoiceId: invoice.id,
    crewId: crew.id,
    certId: certification.id,
    reservationId: reservation.id,
    inspectionId: inspection.id,
    notificationId: notification.id,
    seasonId: season.id,
    memberId: member.id,
    invitationId: invitation.id,
    exportId: dataExport.id,
    pushId: push.id,
    calendarId: calendar.id,
    crewAssignmentId: crewAssignment.id,
    marinaStayId: marinaStay.id,
    contractId: mooringContract.id,
    unavailabilityId: unavailability.id,
    cartItemId: cartItem.id,
  }
}

/** Le bateau victime est encore là, et il n'a pas été renommé. */
export async function victimBoatUntouched(boatId: number): Promise<Boat | null> {
  return Boat.find(boatId)
}

/** Le client victime n'a pas été anonymisé ni renommé. */
export async function victimClientUntouched(clientId: number): Promise<Client | null> {
  return Client.find(clientId)
}
