import { AiAnalysisSchema } from '#database/schema'
import Boat from '#models/boat'
import Organization from '#models/organization'
import User from '#models/user'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class AiAnalysis extends AiAnalysisSchema {
  static table = 'ai_analyses'

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
