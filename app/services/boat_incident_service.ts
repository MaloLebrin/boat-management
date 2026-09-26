import { BoatIncidentNotFoundError, BoatIncidentValidationError } from '#exceptions/incident_errors'
import BoatEngine from '#models/boat_engine'
import BoatEnginePart from '#models/boat_engine_part'
import BoatGenericEquipment from '#models/boat_generic_equipment'
import BoatIncident from '#models/boat_incident'
import Media from '#models/media'
import BoatRig from '#models/boat_rig'
import BoatSafetyEquipment from '#models/boat_safety_equipment'
import BoatSail from '#models/boat_sail'
import type Boat from '#models/boat'
import type Organization from '#models/organization'
import type User from '#models/user'
import { inject } from '@adonisjs/core'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'
import type {
  CreateIncidentPayload,
  IncidentTargetRef,
  UpdateIncidentPayload,
} from '#shared/types/incident'
import {
  hasIncidentTargetInput,
  incidentTargetColumns,
  incidentTargetRefsOf,
  INCIDENT_TARGET_FIELDS,
} from '#shared/helpers/incident_target'
import { toUtcFromLocalInput } from '#shared/helpers/date'
import { assertBoatInUserOrg } from '#utils/boat_utils'
import MediaService from '#services/media_service'
import { CloudinaryFolders } from '#services/cloudinary_service'

const EQUIPMENT_MODELS = {
  engine: BoatEngine,
  sail: BoatSail,
  rig: BoatRig,
  safety: BoatSafetyEquipment,
  generic: BoatGenericEquipment,
} as const

/**
 * Vérifie que la cible visée (#813) appartient bien au bateau : un id d'un
 * autre bateau (ou d'une autre organisation) est refusé. Une pièce est bornée
 * par son moteur, lui-même borné par le bateau.
 */
async function assertIncidentTargetOnBoat(boat: Boat, ref: IncidentTargetRef): Promise<void> {
  const found =
    ref.type === 'engine_part'
      ? await BoatEnginePart.query()
          .where('id', ref.id)
          .whereHas('engine', (q) => q.where('boatId', boat.id))
          .select('id')
          .first()
      : await EQUIPMENT_MODELS[ref.type]
          .query()
          .where('id', ref.id)
          .where('boatId', boat.id)
          .select('id')
          .first()

  if (!found) {
    throw new BoatIncidentValidationError(
      'Equipment does not belong to this boat',
      'equipmentNotFound'
    )
  }
}

/** L'unique cible du payload, `null` pour le bateau entier — deux cibles = refus. */
async function resolveIncidentTarget(
  boat: Boat,
  payload: CreateIncidentPayload | UpdateIncidentPayload
): Promise<IncidentTargetRef | null> {
  const refs = incidentTargetRefsOf(payload)
  if (refs.length > 1) {
    throw new BoatIncidentValidationError(
      'An incident targets at most one equipment',
      'multipleEquipment'
    )
  }
  const ref = refs[0] ?? null
  if (ref) await assertIncidentTargetOnBoat(boat, ref)
  return ref
}

/** Preloads restreints aux colonnes que `toIncidentTarget` lit pour le libellé. */
export function preloadIncidentTargets(query: ModelQueryBuilderContract<typeof BoatIncident>) {
  return query
    .preload('engine', (q) => q.select('id', 'brand', 'model', 'serialNumber'))
    .preload('sail', (q) => q.select('id', 'sailType'))
    .preload('rig', (q) => q.select('id'))
    .preload('safetyEquipment', (q) => q.select('id', 'equipmentType'))
    .preload('genericEquipment', (q) => q.select('id', 'name'))
    .preload('enginePart', (q) => q.select('id', 'designation', 'boatEngineId'))
}

/**
 * Nombre de photos par incident, en une requête — pour le badge des cartes
 * (#814) et le compteur « photo manquante » de la page flotte. Exportée parce
 * que `NavigationService` construit ses propres lignes d'incident et doit
 * poser le même `$extras.photosCount`.
 */
export async function attachIncidentPhotosCount(incidents: BoatIncident[]): Promise<void> {
  if (incidents.length === 0) return
  const rows = await Media.query()
    .where('entityType', 'boat_incident')
    .where('kind', 'photo')
    .whereIn(
      'entityId',
      incidents.map((i) => i.id)
    )
    .groupBy('entityId')
    .select('entityId')
    .count('* as total')
  const counts = new Map(rows.map((r) => [r.entityId, Number(r.$extras.total)]))
  for (const incident of incidents) {
    incident.$extras.photosCount = counts.get(incident.id) ?? 0
  }
}

/** Photos d'un seul incident — le verrou de clôture (« au moins une photo »). */
export async function countIncidentPhotos(incidentId: number): Promise<number> {
  const row = await Media.query()
    .where('entityType', 'boat_incident')
    .where('kind', 'photo')
    .where('entityId', incidentId)
    .count('* as total')
    .first()
  return Number(row?.$extras.total ?? 0)
}

@inject()
export default class BoatIncidentService {
  constructor(private mediaService: MediaService) {}

  /**
   * Un incident du bateau, cibles préchargées — lève « introuvable » pour un id
   * d'un autre bateau. C'est la garde IDOR de la page de détail et des photos (#814).
   */
  async findForBoat(user: User, boat: Boat, incidentId: number) {
    assertBoatInUserOrg(user, boat, () => new BoatIncidentNotFoundError())

    const incident = await preloadIncidentTargets(
      BoatIncident.query().where('id', incidentId).where('boatId', boat.id)
    ).first()

    if (!incident) throw new BoatIncidentNotFoundError()
    return incident
  }

  async listForBoat(user: User, boat: Boat) {
    assertBoatInUserOrg(user, boat, () => new BoatIncidentNotFoundError())

    const query = BoatIncident.query()
      .select([
        'id',
        'boatId',
        'organizationId',
        'occurredAt',
        'type',
        'location',
        'description',
        'insuranceClaimed',
        'insuranceClaimRef',
        'status',
        'closedAt',
        'createdBy',
        'createdAt',
        'updatedAt',
        ...INCIDENT_TARGET_FIELDS,
      ])
      .where('boatId', boat.id)
      .orderBy('occurredAt', 'desc')
      .orderBy('id', 'desc')

    const incidents = await preloadIncidentTargets(query)
    await attachIncidentPhotosCount(incidents)
    return incidents
  }

  async createForBoat(user: User, boat: Boat, payload: CreateIncidentPayload) {
    assertBoatInUserOrg(user, boat, () => new BoatIncidentNotFoundError())

    const description = payload.description.trim()
    if (!description) {
      throw new BoatIncidentValidationError('description is required', 'descriptionRequired')
    }

    const target = await resolveIncidentTarget(boat, payload)

    return await BoatIncident.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      // Déclarant (#816) : le même chemin sert la déclaration manuelle et celle
      // du copilote, l'auteur est donc posé ici et non dans le contrôleur.
      createdBy: user.id,
      occurredAt: toUtcFromLocalInput(payload.occurredAt, payload.tzOffsetMinutes),
      type: payload.type,
      location: payload.location?.trim() || null,
      description,
      insuranceClaimed: payload.insuranceClaimed ?? false,
      insuranceClaimRef: payload.insuranceClaimRef?.trim() || null,
      status: 'open',
      ...incidentTargetColumns(target),
    })
  }

  async updateForBoat(user: User, boat: Boat, incidentId: number, payload: UpdateIncidentPayload) {
    assertBoatInUserOrg(user, boat, () => new BoatIncidentNotFoundError())

    const incident = await BoatIncident.query()
      .where('id', incidentId)
      .where('boatId', boat.id)
      .first()

    if (!incident) throw new BoatIncidentNotFoundError()

    // Clôturer, c'est arrêter le dossier assurance : il lui faut au moins une
    // preuve. On ne le vérifie qu'à la *transition* — un incident historique
    // déjà clôturé sans photo doit rester éditable (lieu, n° de sinistre).
    if (payload.status === 'closed' && incident.status !== 'closed') {
      if ((await countIncidentPhotos(incident.id)) === 0) {
        throw new BoatIncidentValidationError(
          'a photo is required to close an incident',
          'photoRequiredToClose'
        )
      }
    }

    if (payload.description !== undefined) {
      const description = payload.description.trim()
      if (!description) {
        throw new BoatIncidentValidationError('description is required', 'descriptionRequired')
      }
      incident.description = description
    }

    // Une clé de cible présente (même à `null`) recalcule toute la cible : on
    // peut ainsi la changer ou la retirer ; absente, elle reste intacte.
    if (hasIncidentTargetInput(payload)) {
      const target = await resolveIncidentTarget(boat, payload)
      incident.merge(incidentTargetColumns(target))
    }

    if (payload.occurredAt !== undefined) {
      incident.occurredAt = toUtcFromLocalInput(payload.occurredAt, payload.tzOffsetMinutes)
    }
    if (payload.type !== undefined) incident.type = payload.type
    if (payload.location !== undefined) incident.location = payload.location?.trim() || null
    if (payload.insuranceClaimed !== undefined) incident.insuranceClaimed = payload.insuranceClaimed
    if (payload.insuranceClaimRef !== undefined) {
      incident.insuranceClaimRef = payload.insuranceClaimRef?.trim() || null
    }
    if (payload.status !== undefined) {
      incident.status = payload.status
      if (payload.status === 'closed' && !incident.closedAt) {
        incident.closedAt = DateTime.now()
      } else if (payload.status !== 'closed') {
        incident.closedAt = null
      }
    }

    await incident.save()
    return incident
  }

  /**
   * `org` sert à purger les photos Cloudinary et à décrémenter le quota (#814) ;
   * sans elle, les lignes `media` orphelines resteraient derrière l'incident.
   * Renvoie l'incident supprimé, pour l'entrée d'audit (#816).
   */
  async deleteForBoat(user: User, boat: Boat, incidentId: number, org?: Organization) {
    assertBoatInUserOrg(user, boat, () => new BoatIncidentNotFoundError())

    const incident = await BoatIncident.query()
      .where('id', incidentId)
      .where('boatId', boat.id)
      .first()

    if (!incident) throw new BoatIncidentNotFoundError()

    if (org) {
      await this.mediaService.deleteAllForEntity(
        'boat_incident',
        incident.id,
        CloudinaryFolders.boatIncident(org.slug, boat.id, incident.id),
        org
      )
    }
    await incident.delete()
    return incident
  }
}
