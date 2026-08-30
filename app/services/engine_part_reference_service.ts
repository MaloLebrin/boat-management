import EnginePartReference from '#models/engine_part_reference'
import type { SparePartReferenceRow } from '#shared/types/spare_parts'
import { inject } from '@adonisjs/core'

/**
 * Références constructeur rattachées à un modèle du catalogue moteur (#575).
 *
 * Le service ne sait rien faire d'un modèle inconnu, et c'est voulu : une pièce
 * sans référence connue doit rendre **exactement** l'écran d'avant (liens vers
 * la vue éclatée du revendeur). On ajoute une couche, on ne remplace pas le
 * parcours de #517.
 */
@inject()
export default class EnginePartReferenceService {
  /** Références d'un modèle, indexées par clé de pièce. */
  async forEngineModel(engineModelId: number | null): Promise<Map<string, SparePartReferenceRow>> {
    if (engineModelId === null) return new Map()

    const references = await EnginePartReference.query()
      .where('engineModelId', engineModelId)
      .select([
        'id',
        'engineModelId',
        'partKey',
        'reference',
        'sourceLabel',
        'sourceUrl',
        'verifiedAt',
      ])

    return new Map(references.map((row) => [row.partKey, this.toRow(row)]))
  }

  /** Référence d'un couple (modèle, pièce), `null` quand elle n'est pas connue. */
  async forEngineModelPart(
    engineModelId: number | null,
    partKey: string
  ): Promise<SparePartReferenceRow | null> {
    if (engineModelId === null) return null

    const row = await EnginePartReference.query()
      .where('engineModelId', engineModelId)
      .where('partKey', partKey)
      .select([
        'id',
        'engineModelId',
        'partKey',
        'reference',
        'sourceLabel',
        'sourceUrl',
        'verifiedAt',
      ])
      .first()

    return row ? this.toRow(row) : null
  }

  private toRow(row: EnginePartReference): SparePartReferenceRow {
    return {
      partKey: row.partKey,
      reference: row.reference,
      // `NOT NULL` en base : une référence a toujours sa source.
      sourceLabel: row.sourceLabel,
      sourceUrl: row.sourceUrl,
      // Format machine (`YYYY-MM-DD`) : c'est le front qui décide du style
      // d'affichage via `useDateFormat()`.
      verifiedAt: row.verifiedAt?.toISODate() ?? null,
    }
  }
}
