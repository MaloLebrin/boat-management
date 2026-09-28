import DataExport from '#models/data_export'
import Organization from '#models/organization'
import User from '#models/user'
import AuditLogService from '#services/audit_log_service'
import FleetExportService from '#services/fleet_export_service'
import NotificationService from '#services/notification_service'
import QueueDedupService from '#services/queue_dedup_service'
import { EXPORT_LIST_LIMIT, EXPORT_RETENTION_DAYS } from '#shared/constants/exports'
import { toAppLocale } from '#shared/helpers/locale_path'
import type {
  DataExportRow,
  ExportFile,
  ExportPeriod,
  FleetExportParams,
  FleetExportType,
} from '#shared/types/export'
import { inject } from '@adonisjs/core'
import type { I18n } from '@adonisjs/i18n'
import logger from '@adonisjs/core/services/logger'
import router from '@adonisjs/core/services/router'
import i18nManager from '@adonisjs/i18n/services/main'
import { DateTime } from 'luxon'
import { gunzipSync, gzipSync } from 'node:zlib'

/** Colonnes d'une liste : jamais `content`, qui porte le fichier. */
const LIST_COLUMNS = [
  'id',
  'organizationId',
  'userId',
  'type',
  'params',
  'status',
  'rowCount',
  'filename',
  'expiresAt',
  'completedAt',
  'createdAt',
] as const

function periodOf(params: FleetExportParams): ExportPeriod | null {
  if ('year' in params) {
    return { from: `${params.year}-01-01`, to: `${params.year}-12-31` }
  }
  if (params.from === null && params.to === null) return null
  return { from: params.from, to: params.to }
}

/**
 * Exports générés en arrière-plan (#879) : au-delà de `EXPORT_ASYNC_THRESHOLD`
 * lignes, le fichier est produit par le job `GenerateExport`, gardé
 * compressé en base pendant `EXPORT_RETENTION_DAYS` jours et signalé au
 * demandeur par une notification `export.ready`.
 *
 * Un export n'est visible et téléchargeable **que par celui qui l'a
 * demandé** : il peut contenir des données que ses collègues n'ont pas le
 * droit de voir (clients, factures).
 */
@inject()
export default class DataExportService {
  constructor(
    private fleetExportService: FleetExportService,
    private notificationService: NotificationService,
    private auditLogService: AuditLogService,
    private dedupService: QueueDedupService
  ) {}

  /** Journal `export.run` : qui, quoi, quelle période, combien de lignes. */
  async logRun(options: {
    organizationId: number
    userId: number | null
    type: FleetExportType | string
    params: Record<string, unknown>
    period: ExportPeriod | null
    rowCount: number
    async: boolean
  }): Promise<void> {
    await this.auditLogService.log({
      organizationId: options.organizationId,
      userId: options.userId,
      action: 'export.run',
      entityType: 'export',
      metadata: {
        type: options.type,
        from: options.period?.from ?? null,
        to: options.period?.to ?? null,
        rowCount: options.rowCount,
        async: options.async,
        params: options.params,
      },
    })
  }

  /** Enregistre l'export et confie sa génération au job. */
  async queue(options: {
    org: Organization
    user: User
    type: FleetExportType
    params: FleetExportParams
  }): Promise<DataExport> {
    const dataExport = await DataExport.create({
      organizationId: options.org.id,
      userId: options.user.id,
      type: options.type,
      params: options.params,
      status: 'pending',
      expiresAt: DateTime.now().plus({ days: EXPORT_RETENTION_DAYS }),
    })

    // Import dynamique : le job dépend de ce service, un import statique
    // ferait un cycle résolu avant la décoration `@inject()` du job.
    const { default: GenerateExport } = await import('#jobs/generate_export')
    const key = GenerateExport.dedupKey({
      organizationId: options.org.id,
      kind: options.type,
      exportId: dataExport.id,
    })
    await this.dedupService.enqueueUnique({
      key,
      jobName: GenerateExport.name,
      queue: 'exports',
      payload: { exportId: dataExport.id, dedupKey: key },
      dispatch: async (payload) => {
        await GenerateExport.dispatch(payload)
      },
    })
    return dataExport
  }

  /**
   * Génère le fichier d'un export en attente (appelé par le job). Un échec
   * est gardé sur la ligne et notifié — le demandeur ne reste pas à attendre
   * un fichier qui ne viendra pas — puis rendu au job, qui le marque sur sa
   * clé de déduplication sans le relancer.
   */
  async generate(exportId: number): Promise<Error | null> {
    const dataExport = await DataExport.find(exportId)
    if (!dataExport || dataExport.status !== 'pending') return null

    const user = dataExport.userId === null ? null : await User.find(dataExport.userId)
    const i18n = i18nManager.locale(toAppLocale(user?.locale))

    try {
      if (!user) throw new Error('export requester no longer exists')
      const org = await Organization.findOrFail(dataExport.organizationId)
      const file = await this.fleetExportService.build(
        dataExport.type,
        { org, user },
        dataExport.params,
        i18n
      )
      await this.#store(dataExport, file)
      await this.logRun({
        organizationId: org.id,
        userId: user.id,
        type: dataExport.type,
        params: { ...dataExport.params },
        period: periodOf(dataExport.params),
        rowCount: file.rowCount,
        async: true,
      })
      await this.#notify(dataExport, user, 'ready', i18n)
      return null
    } catch (error) {
      logger.error({ err: error, exportId }, 'GenerateExport: export failed')
      dataExport.merge({ status: 'failed', error: (error as Error).message })
      await dataExport.save()
      if (user) await this.#notify(dataExport, user, 'failed', i18n)
      return error as Error
    }
  }

  async #store(dataExport: DataExport, file: ExportFile): Promise<void> {
    dataExport.merge({
      status: 'ready',
      rowCount: file.rowCount,
      filename: file.filename,
      contentType: file.contentType,
      content: gzipSync(file.buffer),
      completedAt: DateTime.now(),
      error: null,
    })
    await dataExport.save()
  }

  async #notify(
    dataExport: DataExport,
    user: User,
    outcome: 'ready' | 'failed',
    i18n: I18n
  ): Promise<void> {
    const params = {
      type: i18n.t(`settings.exports.types.${dataExport.type}`),
      rowCount: String(dataExport.rowCount ?? 0),
      days: String(EXPORT_RETENTION_DAYS),
    }
    await this.notificationService.create({
      userId: user.id,
      organizationId: dataExport.organizationId,
      type: outcome === 'ready' ? 'export.ready' : 'export.failed',
      severity: outcome === 'ready' ? 'success' : 'error',
      title: i18n.t(`notifications.messages.export.${outcome}.title`, params),
      body: i18n.t(`notifications.messages.export.${outcome}.body`, params),
      actionUrl: '/settings/exports',
      metadata: { exportId: dataExport.id },
    })
  }

  /** URL signée, valable jusqu'à l'expiration de l'export. */
  signedDownloadUrl(dataExport: Pick<DataExport, 'id' | 'expiresAt'>): string {
    const seconds = Math.max(1, Math.floor(dataExport.expiresAt.diffNow('seconds').seconds))
    return router.urlBuilder.signedUrlFor(
      'exports.download',
      { id: dataExport.id },
      { expiresIn: `${seconds}s`, purpose: 'data_export' }
    )
  }

  /** Exports du demandeur, les plus récents d'abord. */
  async listForUser(user: User): Promise<DataExportRow[]> {
    const rows = await DataExport.query()
      .select([...LIST_COLUMNS])
      .where('organizationId', user.organizationId!)
      .where('userId', user.id)
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')
      .limit(EXPORT_LIST_LIMIT)

    const now = DateTime.now()
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      rowCount: row.rowCount,
      filename: row.filename,
      period: periodOf(row.params),
      requestedBy: user.fullName || user.email,
      createdAt: row.createdAt.toISO()!,
      expiresAt: row.expiresAt.toISO()!,
      downloadUrl:
        row.status === 'ready' && row.expiresAt > now ? this.signedDownloadUrl(row) : null,
    }))
  }

  /** Fichier d'un export prêt, non expiré, du demandeur ; `null` sinon. */
  async findFileForUser(
    user: User,
    exportId: number
  ): Promise<{ filename: string; contentType: string; buffer: Buffer } | null> {
    const row = await DataExport.query()
      .where('id', exportId)
      .where('organizationId', user.organizationId ?? 0)
      .where('userId', user.id)
      .where('status', 'ready')
      .where('expiresAt', '>', DateTime.now().toSQL()!)
      .first()
    if (!row || row.content === null) return null
    return {
      filename: row.filename ?? `export-${row.id}`,
      contentType: row.contentType ?? 'application/octet-stream',
      buffer: gunzipSync(row.content),
    }
  }

  /** Purge quotidienne des exports expirés (job `PurgeExpiredExports`). */
  async purgeExpired(now: DateTime = DateTime.now()): Promise<number> {
    const deleted = await DataExport.query().where('expiresAt', '<=', now.toSQL()!).delete()
    return Number(Array.isArray(deleted) ? deleted[0] : deleted)
  }
}
