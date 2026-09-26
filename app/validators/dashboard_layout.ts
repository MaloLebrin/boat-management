import { DASHBOARD_WIDGET_IDS } from '#shared/constants/dashboard_widgets'
import vine from '@vinejs/vine'

const widgetIds = () => vine.array(vine.enum(DASHBOARD_WIDGET_IDS)).distinct()

/**
 * `PUT /dashboard/layout` : ordre des colonnes réordonnables et widgets
 * masqués. Les ids sont contraints au registre ; la cohérence zone/disponibilité
 * est assainie ensuite par `normalizeDashboardLayoutPayload`.
 */
export const updateDashboardLayoutValidator = vine.create({
  order: vine.object({
    main: widgetIds(),
    side: widgetIds(),
  }),
  hidden: widgetIds(),
})
