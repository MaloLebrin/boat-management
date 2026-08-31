import { MAINTENANCE_SHEET_TEMPLATES } from '#shared/constants/maintenance/maintenance_sheet_content'
import type { SheetTemplateItem, SheetType } from '#shared/types/maintenance'
import { inject } from '@adonisjs/core'
import i18nManager from '@adonisjs/i18n/services/main'

export type { SheetTemplateItem, SheetType }

/**
 * Lecteur du corpus des fiches guidées (#583). Le contenu vit dans
 * `shared/constants/maintenance/maintenance_sheet_content.ts` (clés stables +
 * `labelKey` dans les deux locales) — ce service se contente de résoudre les
 * libellés dans la locale de l'utilisateur au moment de l'instanciation.
 */
@inject()
export default class BoatMaintenanceSheetTemplateService {
  /**
   * Returns the default items for a given sheet type, resolved in the
   * requested locale (defaults to the app's default locale).
   */
  getItems(type: SheetType, locale?: string): SheetTemplateItem[] {
    const i18n = i18nManager.locale(locale ?? i18nManager.defaultLocale)
    return MAINTENANCE_SHEET_TEMPLATES[type].items.map((item, index) => ({
      templateKey: item.key,
      label: i18n.t(item.labelKey),
      position: index + 1,
    }))
  }
}
