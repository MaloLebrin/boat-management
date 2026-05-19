import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'design_system': { paramsTuple?: []; params?: {} }
    'sitemap': { paramsTuple?: []; params?: {} }
    'boats.index': { paramsTuple?: []; params?: {} }
    'boats.create': { paramsTuple?: []; params?: {} }
    'boats.store': { paramsTuple?: []; params?: {} }
    'boats.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boat_equipment.store_engine': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.engines.show': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_equipment.edit_engine': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_equipment.update_engine': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_equipment.update_engine_status': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_equipment.update_engine_notes': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_equipment.destroy_engine': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_media.store_engine_document': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_media.destroy_engine_media': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'mediaId': ParamValue} }
    'boat_engine_parts.store': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_engine_parts.update': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'partId': ParamValue} }
    'boat_engine_parts.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'partId': ParamValue} }
    'boat_media.download_media': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'mediaId': ParamValue} }
    'boat_media.download_engine_media': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'mediaId': ParamValue} }
    'boat_equipment.store_sail': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_equipment.edit_sail': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sailId': ParamValue} }
    'boat_equipment.update_sail': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sailId': ParamValue} }
    'boat_equipment.destroy_sail': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sailId': ParamValue} }
    'boat_equipment.edit_rig': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_equipment.upsert_rig': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_equipment.destroy_rig': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_maintenances.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_maintenances.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'eventId': ParamValue} }
    'boats.maintenanceTasks.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.maintenanceTasks.done': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'taskId': ParamValue} }
    'boats.maintenanceTasks.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'taskId': ParamValue} }
    'boat_media.store_photo': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_media.store_document': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_media.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'mediaId': ParamValue} }
    'boat_safety_equipment.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_safety_equipment.update': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'itemId': ParamValue} }
    'boat_safety_equipment.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'itemId': ParamValue} }
    'boats.maintenanceSheets.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.maintenanceSheets.complete': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sheetId': ParamValue} }
    'boats.maintenanceSheets.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sheetId': ParamValue} }
    'boats.maintenanceSheetItems.update': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'sheetId': ParamValue,'itemId': ParamValue} }
    'ports.index': { paramsTuple?: []; params?: {} }
    'ports.create': { paramsTuple?: []; params?: {} }
    'ports.store': { paramsTuple?: []; params?: {} }
    'ports.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ports.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ports.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ports.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ports.pontoons.store': { paramsTuple: [ParamValue]; params: {'portId': ParamValue} }
    'ports.pontoons.update': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'pontoonId': ParamValue} }
    'ports.pontoons.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'pontoonId': ParamValue} }
    'ports.mouillages.store': { paramsTuple: [ParamValue]; params: {'portId': ParamValue} }
    'ports.mouillages.update': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'mouillageId': ParamValue} }
    'ports.mouillages.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'mouillageId': ParamValue} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'password.forgot': { paramsTuple?: []; params?: {} }
    'password_reset.store': { paramsTuple?: []; params?: {} }
    'password.reset': { paramsTuple?: []; params?: {} }
    'password_reset.update': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'ai.chat': { paramsTuple?: []; params?: {} }
    'ai.fleetAnalysis': { paramsTuple?: []; params?: {} }
    'ai.boatSuggestions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'root': { paramsTuple?: []; params?: {} }
    'marketing.en.home': { paramsTuple?: []; params?: {} }
    'marketing.en.pricing': { paramsTuple?: []; params?: {} }
    'marketing.fr.home': { paramsTuple?: []; params?: {} }
    'marketing.fr.pricing': { paramsTuple?: []; params?: {} }
    'marketing.en.about': { paramsTuple?: []; params?: {} }
    'marketing.fr.about': { paramsTuple?: []; params?: {} }
    'marketing.contact': { paramsTuple?: []; params?: {} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'planning.index': { paramsTuple?: []; params?: {} }
    'settings.index': { paramsTuple?: []; params?: {} }
    'settings.profile.update': { paramsTuple?: []; params?: {} }
    'settings.org.update': { paramsTuple?: []; params?: {} }
    'locale.set': { paramsTuple?: []; params?: {} }
    'maintenance.history': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'design_system': { paramsTuple?: []; params?: {} }
    'sitemap': { paramsTuple?: []; params?: {} }
    'boats.index': { paramsTuple?: []; params?: {} }
    'boats.create': { paramsTuple?: []; params?: {} }
    'boats.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.engines.show': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_equipment.edit_engine': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_media.download_media': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'mediaId': ParamValue} }
    'boat_media.download_engine_media': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'mediaId': ParamValue} }
    'boat_equipment.edit_sail': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sailId': ParamValue} }
    'boat_equipment.edit_rig': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'ports.index': { paramsTuple?: []; params?: {} }
    'ports.create': { paramsTuple?: []; params?: {} }
    'ports.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ports.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'password.forgot': { paramsTuple?: []; params?: {} }
    'password.reset': { paramsTuple?: []; params?: {} }
    'root': { paramsTuple?: []; params?: {} }
    'marketing.en.home': { paramsTuple?: []; params?: {} }
    'marketing.en.pricing': { paramsTuple?: []; params?: {} }
    'marketing.fr.home': { paramsTuple?: []; params?: {} }
    'marketing.fr.pricing': { paramsTuple?: []; params?: {} }
    'marketing.en.about': { paramsTuple?: []; params?: {} }
    'marketing.fr.about': { paramsTuple?: []; params?: {} }
    'marketing.contact': { paramsTuple?: []; params?: {} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'planning.index': { paramsTuple?: []; params?: {} }
    'settings.index': { paramsTuple?: []; params?: {} }
    'maintenance.history': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'design_system': { paramsTuple?: []; params?: {} }
    'sitemap': { paramsTuple?: []; params?: {} }
    'boats.index': { paramsTuple?: []; params?: {} }
    'boats.create': { paramsTuple?: []; params?: {} }
    'boats.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.engines.show': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_equipment.edit_engine': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_media.download_media': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'mediaId': ParamValue} }
    'boat_media.download_engine_media': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'mediaId': ParamValue} }
    'boat_equipment.edit_sail': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sailId': ParamValue} }
    'boat_equipment.edit_rig': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'ports.index': { paramsTuple?: []; params?: {} }
    'ports.create': { paramsTuple?: []; params?: {} }
    'ports.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ports.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'password.forgot': { paramsTuple?: []; params?: {} }
    'password.reset': { paramsTuple?: []; params?: {} }
    'root': { paramsTuple?: []; params?: {} }
    'marketing.en.home': { paramsTuple?: []; params?: {} }
    'marketing.en.pricing': { paramsTuple?: []; params?: {} }
    'marketing.fr.home': { paramsTuple?: []; params?: {} }
    'marketing.fr.pricing': { paramsTuple?: []; params?: {} }
    'marketing.en.about': { paramsTuple?: []; params?: {} }
    'marketing.fr.about': { paramsTuple?: []; params?: {} }
    'marketing.contact': { paramsTuple?: []; params?: {} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'planning.index': { paramsTuple?: []; params?: {} }
    'settings.index': { paramsTuple?: []; params?: {} }
    'maintenance.history': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'boats.store': { paramsTuple?: []; params?: {} }
    'boat_equipment.store_engine': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_media.store_engine_document': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_engine_parts.store': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_equipment.store_sail': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_maintenances.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.maintenanceTasks.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_media.store_photo': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_media.store_document': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_safety_equipment.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.maintenanceSheets.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'ports.store': { paramsTuple?: []; params?: {} }
    'ports.pontoons.store': { paramsTuple: [ParamValue]; params: {'portId': ParamValue} }
    'ports.mouillages.store': { paramsTuple: [ParamValue]; params: {'portId': ParamValue} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'password_reset.store': { paramsTuple?: []; params?: {} }
    'password_reset.update': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'ai.chat': { paramsTuple?: []; params?: {} }
    'ai.fleetAnalysis': { paramsTuple?: []; params?: {} }
    'ai.boatSuggestions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'locale.set': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'boats.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boat_equipment.update_engine': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_engine_parts.update': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'partId': ParamValue} }
    'boat_equipment.update_sail': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sailId': ParamValue} }
    'boat_equipment.upsert_rig': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.maintenanceTasks.done': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'taskId': ParamValue} }
    'boat_safety_equipment.update': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'itemId': ParamValue} }
    'boats.maintenanceSheets.complete': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sheetId': ParamValue} }
    'boats.maintenanceSheetItems.update': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'sheetId': ParamValue,'itemId': ParamValue} }
    'ports.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ports.pontoons.update': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'pontoonId': ParamValue} }
    'ports.mouillages.update': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'mouillageId': ParamValue} }
    'settings.profile.update': { paramsTuple?: []; params?: {} }
    'settings.org.update': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'boats.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boat_equipment.destroy_engine': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_media.destroy_engine_media': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'mediaId': ParamValue} }
    'boat_engine_parts.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'partId': ParamValue} }
    'boat_equipment.destroy_sail': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sailId': ParamValue} }
    'boat_equipment.destroy_rig': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_maintenances.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'eventId': ParamValue} }
    'boats.maintenanceTasks.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'taskId': ParamValue} }
    'boat_media.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'mediaId': ParamValue} }
    'boat_safety_equipment.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'itemId': ParamValue} }
    'boats.maintenanceSheets.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sheetId': ParamValue} }
    'ports.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ports.pontoons.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'pontoonId': ParamValue} }
    'ports.mouillages.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'mouillageId': ParamValue} }
  }
  PATCH: {
    'boat_equipment.update_engine_status': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_equipment.update_engine_notes': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}