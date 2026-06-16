import type Organization from '#models/organization'
import { BaseEvent } from '@adonisjs/core/events'

export default class AiTokenThresholdCrossed extends BaseEvent {
  constructor(
    public readonly organization: Organization,
    public readonly percent: number
  ) {
    super()
  }
}
