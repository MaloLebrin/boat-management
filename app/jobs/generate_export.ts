import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import DataExportService from '#services/data_export_service'
import QueueDedupService from '#services/queue_dedup_service'
import { inject } from '@adonisjs/core'

export interface GenerateExportPayload {
  exportId: number
  dedupKey: string
}

/**
 * Génère un export trop volumineux pour la réponse HTTP (#879) : la ligne
 * `data_exports` porte le type et les paramètres, `DataExportService.generate`
 * construit le fichier, le garde en base et notifie le demandeur.
 */
@inject()
export default class GenerateExport extends Job<GenerateExportPayload> {
  static options: JobOptions = {
    queue: 'exports',
    // Un export échoué est notifié et gardé `failed` par le service : le
    // rejouer produirait une seconde notification pour le même fichier.
    maxRetries: 0,
  }

  constructor(
    private dedupService: QueueDedupService,
    private dataExportService: DataExportService
  ) {
    super()
  }

  static dedupKey(payload: { organizationId: number; kind: string; exportId: number }) {
    return `export:${payload.organizationId}:${payload.kind}:${payload.exportId}`
  }

  async execute() {
    await this.dedupService.markRunning(this.payload.dedupKey)
    const error = await this.dataExportService.generate(this.payload.exportId)
    if (error) {
      await this.dedupService.markFailed(this.payload.dedupKey, error)
      return
    }
    await this.dedupService.markCompleted(this.payload.dedupKey)
  }

  async failed(error: Error) {
    await this.dedupService.markFailed(this.payload.dedupKey, error)
  }
}
