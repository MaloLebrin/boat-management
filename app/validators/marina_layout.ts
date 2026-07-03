import vine from '@vinejs/vine'
import { MARINA_CANVAS_HEIGHT, MARINA_CANVAS_WIDTH } from '#shared/constants/marina_layout'

export const updatePositionValidator = vine.create(
  vine.object({
    x: vine.number().min(0).max(MARINA_CANVAS_WIDTH),
    y: vine.number().min(0).max(MARINA_CANVAS_HEIGHT),
  })
)

export const assignBoatValidator = vine.create(
  vine.object({
    spotId: vine.number().nullable(),
  })
)
