import { MEDIA_ENTITY_TYPES, type MediaEntityType, type MediaKind } from '#shared/constants/media'
import type {
  MediaReconciliationOptions,
  MediaReconciliationReport,
  StorageDrift,
} from '#shared/types/media'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import Media from '#models/media'
import { CloudinaryService } from '#services/cloudinary_service'
import { resourceTypeFromKind } from '#services/media_service'

/**
 * Table de l'entité propriétaire de chaque `entity_type` (#859).
 *
 * La table `media` est polymorphe : `(entity_type, entity_id)` ne peut porter
 * aucune clé étrangère, et la suppression d'une entité ne cascade pas sur ses
 * médias. Le `Record` force une entrée pour chaque type de `MEDIA_ENTITY_TYPES`.
 */
const OWNER_TABLES: Record<MediaEntityType, string> = {
  boat: 'boats',
  boat_engine: 'boat_engines',
  boat_engine_part: 'boat_engine_parts',
  boat_sail: 'boat_sails',
  boat_rig: 'boat_rigs',
  boat_generic_equipment: 'boat_generic_equipment',
  boat_safety_equipment: 'boat_safety_equipment',
  boat_maintenance_event: 'boat_maintenance_events',
  boat_incident: 'boat_incidents',
  boat_document: 'boat_documents',
  inspection: 'boat_inspections',
  rentalContract: 'rental_contracts',
  client: 'clients',
  user: 'users',
}

const VIA_BOAT = (table: string) =>
  `select b.organization_id from ${table} x join boats b on b.id = x.boat_id where x.id = m.entity_id`
const DIRECT = (table: string) =>
  `select x.organization_id from ${table} x where x.id = m.entity_id`

/**
 * Organisation à qui un média est facturé, en fonction de son `entity_type`.
 *
 * `user` (les avatars) en est absent : `MediaService.upload` ne les compte pas
 * dans le quota de stockage, le recalcul non plus.
 */
const ORGANIZATION_OF: Record<Exclude<MediaEntityType, 'user'>, string> = {
  boat: 'select b.organization_id from boats b where b.id = m.entity_id',
  boat_engine: VIA_BOAT('boat_engines'),
  boat_engine_part:
    'select b.organization_id from boat_engine_parts x join boat_engines e on e.id = x.boat_engine_id join boats b on b.id = e.boat_id where x.id = m.entity_id',
  boat_sail: VIA_BOAT('boat_sails'),
  boat_rig: VIA_BOAT('boat_rigs'),
  boat_generic_equipment: VIA_BOAT('boat_generic_equipment'),
  boat_safety_equipment: VIA_BOAT('boat_safety_equipment'),
  boat_maintenance_event: VIA_BOAT('boat_maintenance_events'),
  boat_incident: DIRECT('boat_incidents'),
  boat_document: DIRECT('boat_documents'),
  inspection: DIRECT('boat_inspections'),
  rentalContract: DIRECT('rental_contracts'),
  client: DIRECT('clients'),
}

interface OrphanRow {
  id: number
  entity_type: MediaEntityType
  cloudinary_public_id: string
  kind: MediaKind
  format: string
  bytes: number
}

/**
 * Réconciliation de la table `media` avec ses propriétaires et le quota (#859).
 *
 * Les suppressions ne sont pas transactionnelles avec Cloudinary, et certaines
 * entités partent sans que leurs médias soient nettoyés. Deux dérives en
 * résultent, que cette passe rattrape :
 *
 * 1. **médias orphelins** : l'entité n'existe plus. Le fichier est supprimé sur
 *    Cloudinary, puis la ligne. Un échec Cloudinary garde la ligne, pour que la
 *    passe suivante réessaie au lieu de perdre la trace du fichier ;
 * 2. **compteur `storage_used_bytes` faux** : il est recalculé depuis la somme
 *    des `media.bytes` de chaque organisation.
 */
@inject()
export default class MediaReconciliationService {
  constructor(private cloudinary: CloudinaryService) {}

  async reconcile(options: MediaReconciliationOptions): Promise<MediaReconciliationReport> {
    const report: MediaReconciliationReport = {
      dryRun: options.dryRun,
      orphans: {
        found: 0,
        deleted: 0,
        failed: 0,
        bytes: 0,
        byEntityType: {},
        unknownEntityType: 0,
      },
      storage: { drifts: [], corrected: 0, skipped: 0 },
    }

    await this.#reconcileOrphans(report)
    await this.#reconcileStorage(report)

    return report
  }

  async #reconcileOrphans(report: MediaReconciliationReport): Promise<void> {
    for (const entityType of MEDIA_ENTITY_TYPES) {
      const table = OWNER_TABLES[entityType]
      const rows: OrphanRow[] = await db
        .from('media as m')
        .select('m.id', 'm.entity_type', 'm.cloudinary_public_id', 'm.kind', 'm.format', 'm.bytes')
        .where('m.entity_type', entityType)
        .whereNotExists((sub) => sub.from(`${table} as x`).whereRaw('x.id = m.entity_id'))
        .orderBy('m.id', 'asc')

      if (rows.length === 0) continue

      report.orphans.found += rows.length
      report.orphans.byEntityType[entityType] = rows.length
      if (report.dryRun) {
        report.orphans.bytes += rows.reduce((sum, row) => sum + Number(row.bytes), 0)
        continue
      }

      for (const row of rows) {
        await this.#deleteOrphan(row, report)
      }
    }

    const unknown = await db
      .from('media')
      .whereNotIn('entity_type', [...MEDIA_ENTITY_TYPES])
      .count('* as total')
      .first()
    report.orphans.unknownEntityType = Number(unknown?.total ?? 0)
    if (report.orphans.unknownEntityType > 0) {
      logger.warn(
        { count: report.orphans.unknownEntityType },
        'MediaReconciliation: media rows with an unknown entity_type — left untouched'
      )
    }
  }

  async #deleteOrphan(row: OrphanRow, report: MediaReconciliationReport): Promise<void> {
    try {
      await this.cloudinary.deleteFile(
        row.cloudinary_public_id,
        resourceTypeFromKind(row.kind, row.format)
      )
    } catch (error) {
      report.orphans.failed += 1
      logger.warn(
        { mediaId: row.id, publicId: row.cloudinary_public_id, error },
        'MediaReconciliation: Cloudinary deletion failed — row kept for the next run'
      )
      return
    }

    await Media.query().where('id', row.id).delete()
    report.orphans.deleted += 1
    report.orphans.bytes += Number(row.bytes)
  }

  async #reconcileStorage(report: MediaReconciliationReport): Promise<void> {
    const cases = Object.entries(ORGANIZATION_OF)
      .map(([entityType, sql]) => `when '${entityType}' then (${sql})`)
      .join('\n')

    const result = await db.rawQuery<{
      rows: Array<{ id: number; recorded: string | number; actual: string | number }>
    }>(
      `with media_orgs as (
         select (case m.entity_type ${cases} end) as organization_id, m.bytes
         from media m
         where m.entity_type <> 'user'
       ), totals as (
         select organization_id, sum(bytes) as total
         from media_orgs
         where organization_id is not null
         group by organization_id
       )
       select o.id, o.storage_used_bytes as recorded, coalesce(t.total, 0) as actual
       from organizations o
       left join totals t on t.organization_id = o.id
       where o.storage_used_bytes <> coalesce(t.total, 0)
       order by o.id`
    )

    report.storage.drifts = result.rows.map(
      (row): StorageDrift => ({
        organizationId: row.id,
        recordedBytes: Number(row.recorded),
        actualBytes: Number(row.actual),
      })
    )

    for (const drift of report.storage.drifts) {
      logger.info(
        { ...drift, delta: drift.actualBytes - drift.recordedBytes, dryRun: report.dryRun },
        'MediaReconciliation: storage_used_bytes drift'
      )
      if (report.dryRun) continue

      // Écriture conditionnée à la valeur lue : un upload ou une suppression
      // concurrents ont modifié le compteur entre-temps, on ne l'écrase pas —
      // la passe suivante reprendra l'écart.
      const updated = await db
        .from('organizations')
        .where('id', drift.organizationId)
        .where('storage_used_bytes', drift.recordedBytes)
        .update({ storage_used_bytes: drift.actualBytes })
      const count = Array.isArray(updated) ? updated.length : Number(updated)
      if (count > 0) report.storage.corrected += 1
      else report.storage.skipped += 1
    }
  }
}
