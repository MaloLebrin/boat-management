import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'event_stream': { paramsTuple?: []; params?: {} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'design_system': { paramsTuple?: []; params?: {} }
    'sitemap': { paramsTuple?: []; params?: {} }
    'boats.index': { paramsTuple?: []; params?: {} }
    'boats.create': { paramsTuple?: []; params?: {} }
    'boats.store': { paramsTuple?: []; params?: {} }
    'boats.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.navigation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.maintenanceLog.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.export.maintenance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.export.fuelLogs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.export.navigationLogs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.export.budget': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.budget': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.portStays.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.portStays.update': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'stayId': ParamValue} }
    'boats.portStays.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'stayId': ParamValue} }
    'boats.budget.entries.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.budget.entries.update': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'entryId': ParamValue} }
    'boats.budget.entries.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'entryId': ParamValue} }
    'boats.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.pricing.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.assign': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'boats.engines.parts.show': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'partId': ParamValue} }
    'boat_engine_parts.update': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'partId': ParamValue} }
    'boat_engine_parts.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'partId': ParamValue} }
    'boat_engine_parts.store_document': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'partId': ParamValue} }
    'boat_engine_parts.destroy_media': { paramsTuple: [ParamValue,ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'partId': ParamValue,'mediaId': ParamValue} }
    'boat_engine_parts.download_media': { paramsTuple: [ParamValue,ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'partId': ParamValue,'mediaId': ParamValue} }
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
    'boat_generic_equipment.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_generic_equipment.update': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'itemId': ParamValue} }
    'boat_generic_equipment.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'itemId': ParamValue} }
    'boats.maintenanceSheets.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.maintenanceSheets.complete': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sheetId': ParamValue} }
    'boats.maintenanceSheets.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sheetId': ParamValue} }
    'boats.maintenanceSheetItems.update': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'sheetId': ParamValue,'itemId': ParamValue} }
    'boats.incidents.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.incidents.update': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'incidentId': ParamValue} }
    'boats.incidents.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'incidentId': ParamValue} }
    'boats.equipmentActions.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.equipmentActions.update': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'actionId': ParamValue} }
    'boats.equipmentActions.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'actionId': ParamValue} }
    'boats.simulator': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.fuelLogs.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.fuelLogs.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'logId': ParamValue} }
    'boats.navigationLogs.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.navigationLogs.update': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'logId': ParamValue} }
    'boats.navigationLogs.close': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'logId': ParamValue} }
    'boats.navigationLogs.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'logId': ParamValue} }
    'boats.navigationLogs.crew.sync': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'logId': ParamValue} }
    'boats.navigationLogs.crewRole.download': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'logId': ParamValue} }
    'boats.adminDocuments.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.adminDocuments.update': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'documentId': ParamValue} }
    'boats.adminDocuments.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'documentId': ParamValue} }
    'boats.position.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.reservations.index': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.reservations.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.reservations.update': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.inspection.show': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.inspections.store': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.inspections.update': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue,'inspectionId': ParamValue} }
    'boats.reservations.inspections.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue,'inspectionId': ParamValue} }
    'boats.reservations.inspections.equipmentActions.store': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue,'inspectionId': ParamValue} }
    'boats.reservations.inspections.equipmentActions.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue,'inspectionId': ParamValue,'actionId': ParamValue} }
    'boats.reservations.inspections.photos.store': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue,'inspectionId': ParamValue} }
    'boats.reservations.inspections.photos.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue,'inspectionId': ParamValue,'mediaId': ParamValue} }
    'boats.reservations.contract.show': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.contract.store': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.contract.pdf': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.contract.signedDocument': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.contract.send': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.contract.sign': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.contract.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
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
    'ports.pontoons.updatePosition': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'pontoonId': ParamValue} }
    'ports.mouillages.updatePosition': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'mouillageId': ParamValue} }
    'ports.pontoons.spots.store': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'pontoonId': ParamValue} }
    'ports.mouillages.spots.store': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'mouillageId': ParamValue} }
    'spots.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'spots.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'home': { paramsTuple?: []; params?: {} }
    'marketing.en.home': { paramsTuple?: []; params?: {} }
    'marketing.en.pricing': { paramsTuple?: []; params?: {} }
    'marketing.en.simulator': { paramsTuple?: []; params?: {} }
    'marketing.en.guide': { paramsTuple?: []; params?: {} }
    'marketing.en.privacy': { paramsTuple?: []; params?: {} }
    'marketing.fr.home': { paramsTuple?: []; params?: {} }
    'marketing.fr.pricing': { paramsTuple?: []; params?: {} }
    'marketing.fr.simulator': { paramsTuple?: []; params?: {} }
    'marketing.fr.guide': { paramsTuple?: []; params?: {} }
    'marketing.fr.privacy': { paramsTuple?: []; params?: {} }
    'marketing.en.about': { paramsTuple?: []; params?: {} }
    'marketing.fr.about': { paramsTuple?: []; params?: {} }
    'marketing.contact': { paramsTuple?: []; params?: {} }
    'simulator.session': { paramsTuple?: []; params?: {} }
    'simulator.create_boat': { paramsTuple?: []; params?: {} }
    'simulator.lead': { paramsTuple?: []; params?: {} }
    'simulator.share.store': { paramsTuple?: []; params?: {} }
    'simulator.share.show.fr': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'simulator.share.show.en': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'planning.index': { paramsTuple?: []; params?: {} }
    'locale.set': { paramsTuple?: []; params?: {} }
    'settings.index': { paramsTuple?: []; params?: {} }
    'settings.me': { paramsTuple?: []; params?: {} }
    'settings.org': { paramsTuple?: []; params?: {} }
    'settings.members': { paramsTuple?: []; params?: {} }
    'settings.billing': { paramsTuple?: []; params?: {} }
    'settings.billing.checkout': { paramsTuple?: []; params?: {} }
    'settings.billing.portal': { paramsTuple?: []; params?: {} }
    'settings.billing.module.add': { paramsTuple?: []; params?: {} }
    'settings.billing.module.remove': { paramsTuple?: []; params?: {} }
    'settings.profile.update': { paramsTuple?: []; params?: {} }
    'settings.org.update': { paramsTuple?: []; params?: {} }
    'settings.ai': { paramsTuple?: []; params?: {} }
    'settings.ai.update': { paramsTuple?: []; params?: {} }
    'settings.auditLog': { paramsTuple?: []; params?: {} }
    'settings.branding': { paramsTuple?: []; params?: {} }
    'settings.branding.update': { paramsTuple?: []; params?: {} }
    'settings.branding.logo.upload': { paramsTuple?: []; params?: {} }
    'settings.branding.logo.delete': { paramsTuple?: []; params?: {} }
    'settings.import': { paramsTuple?: []; params?: {} }
    'settings.import.preview': { paramsTuple?: []; params?: {} }
    'settings.import.confirm': { paramsTuple?: []; params?: {} }
    'settings.import.cancel': { paramsTuple?: []; params?: {} }
    'maintenance.history': { paramsTuple?: []; params?: {} }
    'organization.members.index': { paramsTuple?: []; params?: {} }
    'organization.members.store': { paramsTuple?: []; params?: {} }
    'organization.members.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organization.members.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organization.invitations.store': { paramsTuple?: []; params?: {} }
    'organization.invitations.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invitations.show': { paramsTuple?: []; params?: {} }
    'invitations.accept': { paramsTuple?: []; params?: {} }
    'invitations.decline': { paramsTuple?: []; params?: {} }
    'webhooks.stripe': { paramsTuple?: []; params?: {} }
    'mail_previews.index': { paramsTuple?: []; params?: {} }
    'mail_previews.show': { paramsTuple: [ParamValue]; params: {'name': ParamValue} }
    'pdf_previews.index': { paramsTuple?: []; params?: {} }
    'pdf_previews.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'notifications.index': { paramsTuple?: []; params?: {} }
    'notifications.markAllAsRead': { paramsTuple?: []; params?: {} }
    'notifications.markAsRead': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'notifications.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'crew.index': { paramsTuple?: []; params?: {} }
    'crew.store': { paramsTuple?: []; params?: {} }
    'crew.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'crew.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'crew.certifications.store': { paramsTuple: [ParamValue]; params: {'memberId': ParamValue} }
    'crew.certifications.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'memberId': ParamValue,'certId': ParamValue} }
    'navigation.logbook': { paramsTuple?: []; params?: {} }
    'navigation.fuel': { paramsTuple?: []; params?: {} }
    'navigation.incidents': { paramsTuple?: []; params?: {} }
    'reservations.index': { paramsTuple?: []; params?: {} }
    'clients.index': { paramsTuple?: []; params?: {} }
    'clients.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clients.store': { paramsTuple?: []; params?: {} }
    'clients.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clients.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clients.documents.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clients.media.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'mediaId': ParamValue} }
    'clients.media.download': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'mediaId': ParamValue} }
    'clients.anonymize': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clients.export': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'pricingSeasons.index': { paramsTuple?: []; params?: {} }
    'pricingSeasons.store': { paramsTuple?: []; params?: {} }
    'pricingSeasons.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'pricingSeasons.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.index': { paramsTuple?: []; params?: {} }
    'invoices.create': { paramsTuple?: []; params?: {} }
    'invoices.store': { paramsTuple?: []; params?: {} }
    'invoices.fromReservation': { paramsTuple: [ParamValue]; params: {'reservationId': ParamValue} }
    'invoices.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.pdf': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.send': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.convert': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.pay': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'demo.login': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'event_stream': { paramsTuple?: []; params?: {} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'design_system': { paramsTuple?: []; params?: {} }
    'sitemap': { paramsTuple?: []; params?: {} }
    'boats.index': { paramsTuple?: []; params?: {} }
    'boats.create': { paramsTuple?: []; params?: {} }
    'boats.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.navigation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.maintenanceLog.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.export.maintenance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.export.fuelLogs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.export.navigationLogs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.export.budget': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.budget': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.engines.show': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_equipment.edit_engine': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boats.engines.parts.show': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'partId': ParamValue} }
    'boat_engine_parts.download_media': { paramsTuple: [ParamValue,ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'partId': ParamValue,'mediaId': ParamValue} }
    'boat_media.download_media': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'mediaId': ParamValue} }
    'boat_media.download_engine_media': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'mediaId': ParamValue} }
    'boat_equipment.edit_sail': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sailId': ParamValue} }
    'boat_equipment.edit_rig': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.simulator': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.navigationLogs.crewRole.download': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'logId': ParamValue} }
    'boats.reservations.index': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.reservations.inspection.show': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.contract.show': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.contract.pdf': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.contract.signedDocument': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'ports.index': { paramsTuple?: []; params?: {} }
    'ports.create': { paramsTuple?: []; params?: {} }
    'ports.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ports.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'home': { paramsTuple?: []; params?: {} }
    'marketing.en.home': { paramsTuple?: []; params?: {} }
    'marketing.en.pricing': { paramsTuple?: []; params?: {} }
    'marketing.en.simulator': { paramsTuple?: []; params?: {} }
    'marketing.en.guide': { paramsTuple?: []; params?: {} }
    'marketing.en.privacy': { paramsTuple?: []; params?: {} }
    'marketing.fr.home': { paramsTuple?: []; params?: {} }
    'marketing.fr.pricing': { paramsTuple?: []; params?: {} }
    'marketing.fr.simulator': { paramsTuple?: []; params?: {} }
    'marketing.fr.guide': { paramsTuple?: []; params?: {} }
    'marketing.fr.privacy': { paramsTuple?: []; params?: {} }
    'marketing.en.about': { paramsTuple?: []; params?: {} }
    'marketing.fr.about': { paramsTuple?: []; params?: {} }
    'marketing.contact': { paramsTuple?: []; params?: {} }
    'simulator.share.show.fr': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'simulator.share.show.en': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'planning.index': { paramsTuple?: []; params?: {} }
    'settings.index': { paramsTuple?: []; params?: {} }
    'settings.me': { paramsTuple?: []; params?: {} }
    'settings.org': { paramsTuple?: []; params?: {} }
    'settings.members': { paramsTuple?: []; params?: {} }
    'settings.billing': { paramsTuple?: []; params?: {} }
    'settings.ai': { paramsTuple?: []; params?: {} }
    'settings.auditLog': { paramsTuple?: []; params?: {} }
    'settings.branding': { paramsTuple?: []; params?: {} }
    'settings.import': { paramsTuple?: []; params?: {} }
    'maintenance.history': { paramsTuple?: []; params?: {} }
    'organization.members.index': { paramsTuple?: []; params?: {} }
    'invitations.show': { paramsTuple?: []; params?: {} }
    'mail_previews.index': { paramsTuple?: []; params?: {} }
    'mail_previews.show': { paramsTuple: [ParamValue]; params: {'name': ParamValue} }
    'pdf_previews.index': { paramsTuple?: []; params?: {} }
    'pdf_previews.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'notifications.index': { paramsTuple?: []; params?: {} }
    'crew.index': { paramsTuple?: []; params?: {} }
    'navigation.logbook': { paramsTuple?: []; params?: {} }
    'navigation.fuel': { paramsTuple?: []; params?: {} }
    'navigation.incidents': { paramsTuple?: []; params?: {} }
    'reservations.index': { paramsTuple?: []; params?: {} }
    'clients.index': { paramsTuple?: []; params?: {} }
    'clients.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clients.media.download': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'mediaId': ParamValue} }
    'clients.export': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'pricingSeasons.index': { paramsTuple?: []; params?: {} }
    'invoices.index': { paramsTuple?: []; params?: {} }
    'invoices.create': { paramsTuple?: []; params?: {} }
    'invoices.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.pdf': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'password.forgot': { paramsTuple?: []; params?: {} }
    'password.reset': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'event_stream': { paramsTuple?: []; params?: {} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'design_system': { paramsTuple?: []; params?: {} }
    'sitemap': { paramsTuple?: []; params?: {} }
    'boats.index': { paramsTuple?: []; params?: {} }
    'boats.create': { paramsTuple?: []; params?: {} }
    'boats.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.navigation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.maintenanceLog.download': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.export.maintenance': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.export.fuelLogs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.export.navigationLogs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.export.budget': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.budget': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.engines.show': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_equipment.edit_engine': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boats.engines.parts.show': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'partId': ParamValue} }
    'boat_engine_parts.download_media': { paramsTuple: [ParamValue,ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'partId': ParamValue,'mediaId': ParamValue} }
    'boat_media.download_media': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'mediaId': ParamValue} }
    'boat_media.download_engine_media': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'mediaId': ParamValue} }
    'boat_equipment.edit_sail': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sailId': ParamValue} }
    'boat_equipment.edit_rig': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.simulator': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.navigationLogs.crewRole.download': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'logId': ParamValue} }
    'boats.reservations.index': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.reservations.inspection.show': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.contract.show': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.contract.pdf': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.contract.signedDocument': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'ports.index': { paramsTuple?: []; params?: {} }
    'ports.create': { paramsTuple?: []; params?: {} }
    'ports.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ports.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'home': { paramsTuple?: []; params?: {} }
    'marketing.en.home': { paramsTuple?: []; params?: {} }
    'marketing.en.pricing': { paramsTuple?: []; params?: {} }
    'marketing.en.simulator': { paramsTuple?: []; params?: {} }
    'marketing.en.guide': { paramsTuple?: []; params?: {} }
    'marketing.en.privacy': { paramsTuple?: []; params?: {} }
    'marketing.fr.home': { paramsTuple?: []; params?: {} }
    'marketing.fr.pricing': { paramsTuple?: []; params?: {} }
    'marketing.fr.simulator': { paramsTuple?: []; params?: {} }
    'marketing.fr.guide': { paramsTuple?: []; params?: {} }
    'marketing.fr.privacy': { paramsTuple?: []; params?: {} }
    'marketing.en.about': { paramsTuple?: []; params?: {} }
    'marketing.fr.about': { paramsTuple?: []; params?: {} }
    'marketing.contact': { paramsTuple?: []; params?: {} }
    'simulator.share.show.fr': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'simulator.share.show.en': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'planning.index': { paramsTuple?: []; params?: {} }
    'settings.index': { paramsTuple?: []; params?: {} }
    'settings.me': { paramsTuple?: []; params?: {} }
    'settings.org': { paramsTuple?: []; params?: {} }
    'settings.members': { paramsTuple?: []; params?: {} }
    'settings.billing': { paramsTuple?: []; params?: {} }
    'settings.ai': { paramsTuple?: []; params?: {} }
    'settings.auditLog': { paramsTuple?: []; params?: {} }
    'settings.branding': { paramsTuple?: []; params?: {} }
    'settings.import': { paramsTuple?: []; params?: {} }
    'maintenance.history': { paramsTuple?: []; params?: {} }
    'organization.members.index': { paramsTuple?: []; params?: {} }
    'invitations.show': { paramsTuple?: []; params?: {} }
    'mail_previews.index': { paramsTuple?: []; params?: {} }
    'mail_previews.show': { paramsTuple: [ParamValue]; params: {'name': ParamValue} }
    'pdf_previews.index': { paramsTuple?: []; params?: {} }
    'pdf_previews.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'notifications.index': { paramsTuple?: []; params?: {} }
    'crew.index': { paramsTuple?: []; params?: {} }
    'navigation.logbook': { paramsTuple?: []; params?: {} }
    'navigation.fuel': { paramsTuple?: []; params?: {} }
    'navigation.incidents': { paramsTuple?: []; params?: {} }
    'reservations.index': { paramsTuple?: []; params?: {} }
    'clients.index': { paramsTuple?: []; params?: {} }
    'clients.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clients.media.download': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'mediaId': ParamValue} }
    'clients.export': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'pricingSeasons.index': { paramsTuple?: []; params?: {} }
    'invoices.index': { paramsTuple?: []; params?: {} }
    'invoices.create': { paramsTuple?: []; params?: {} }
    'invoices.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.pdf': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'password.forgot': { paramsTuple?: []; params?: {} }
    'password.reset': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
    'boats.store': { paramsTuple?: []; params?: {} }
    'boats.portStays.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.budget.entries.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boat_equipment.store_engine': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_media.store_engine_document': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_engine_parts.store': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_engine_parts.store_document': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'partId': ParamValue} }
    'boat_equipment.store_sail': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_maintenances.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.maintenanceTasks.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_media.store_photo': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_media.store_document': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_safety_equipment.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_generic_equipment.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.maintenanceSheets.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.incidents.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.equipmentActions.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.fuelLogs.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.navigationLogs.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.adminDocuments.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.position.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.reservations.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.reservations.inspections.store': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.inspections.equipmentActions.store': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue,'inspectionId': ParamValue} }
    'boats.reservations.inspections.photos.store': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue,'inspectionId': ParamValue} }
    'boats.reservations.contract.store': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.contract.send': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.contract.sign': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'ports.store': { paramsTuple?: []; params?: {} }
    'ports.pontoons.store': { paramsTuple: [ParamValue]; params: {'portId': ParamValue} }
    'ports.mouillages.store': { paramsTuple: [ParamValue]; params: {'portId': ParamValue} }
    'ports.pontoons.spots.store': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'pontoonId': ParamValue} }
    'ports.mouillages.spots.store': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'mouillageId': ParamValue} }
    'simulator.session': { paramsTuple?: []; params?: {} }
    'simulator.create_boat': { paramsTuple?: []; params?: {} }
    'simulator.lead': { paramsTuple?: []; params?: {} }
    'simulator.share.store': { paramsTuple?: []; params?: {} }
    'locale.set': { paramsTuple?: []; params?: {} }
    'settings.billing.checkout': { paramsTuple?: []; params?: {} }
    'settings.billing.portal': { paramsTuple?: []; params?: {} }
    'settings.billing.module.add': { paramsTuple?: []; params?: {} }
    'settings.branding.logo.upload': { paramsTuple?: []; params?: {} }
    'settings.import.preview': { paramsTuple?: []; params?: {} }
    'settings.import.confirm': { paramsTuple?: []; params?: {} }
    'settings.import.cancel': { paramsTuple?: []; params?: {} }
    'organization.members.store': { paramsTuple?: []; params?: {} }
    'organization.invitations.store': { paramsTuple?: []; params?: {} }
    'invitations.accept': { paramsTuple?: []; params?: {} }
    'invitations.decline': { paramsTuple?: []; params?: {} }
    'webhooks.stripe': { paramsTuple?: []; params?: {} }
    'crew.store': { paramsTuple?: []; params?: {} }
    'crew.certifications.store': { paramsTuple: [ParamValue]; params: {'memberId': ParamValue} }
    'clients.store': { paramsTuple?: []; params?: {} }
    'clients.documents.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clients.anonymize': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'pricingSeasons.store': { paramsTuple?: []; params?: {} }
    'invoices.store': { paramsTuple?: []; params?: {} }
    'invoices.fromReservation': { paramsTuple: [ParamValue]; params: {'reservationId': ParamValue} }
    'invoices.send': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.convert': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.pay': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'password_reset.store': { paramsTuple?: []; params?: {} }
    'password_reset.update': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'ai.chat': { paramsTuple?: []; params?: {} }
    'ai.fleetAnalysis': { paramsTuple?: []; params?: {} }
    'ai.boatSuggestions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'demo.login': { paramsTuple?: []; params?: {} }
  }
  PATCH: {
    'boats.portStays.update': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'stayId': ParamValue} }
    'boats.budget.entries.update': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'entryId': ParamValue} }
    'boats.assign': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boat_equipment.update_engine_status': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_equipment.update_engine_notes': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boats.navigationLogs.update': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'logId': ParamValue} }
    'boats.navigationLogs.close': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'logId': ParamValue} }
    'boats.navigationLogs.crew.sync': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'logId': ParamValue} }
    'boats.reservations.update': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'ports.pontoons.updatePosition': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'pontoonId': ParamValue} }
    'ports.mouillages.updatePosition': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'mouillageId': ParamValue} }
    'notifications.markAllAsRead': { paramsTuple?: []; params?: {} }
    'notifications.markAsRead': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'boats.portStays.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'stayId': ParamValue} }
    'boats.budget.entries.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'entryId': ParamValue} }
    'boats.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boat_equipment.destroy_engine': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_media.destroy_engine_media': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'mediaId': ParamValue} }
    'boat_engine_parts.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'partId': ParamValue} }
    'boat_engine_parts.destroy_media': { paramsTuple: [ParamValue,ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'partId': ParamValue,'mediaId': ParamValue} }
    'boat_equipment.destroy_sail': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sailId': ParamValue} }
    'boat_equipment.destroy_rig': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_maintenances.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'eventId': ParamValue} }
    'boats.maintenanceTasks.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'taskId': ParamValue} }
    'boat_media.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'mediaId': ParamValue} }
    'boat_safety_equipment.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'itemId': ParamValue} }
    'boat_generic_equipment.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'itemId': ParamValue} }
    'boats.maintenanceSheets.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sheetId': ParamValue} }
    'boats.incidents.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'incidentId': ParamValue} }
    'boats.equipmentActions.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'actionId': ParamValue} }
    'boats.fuelLogs.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'logId': ParamValue} }
    'boats.navigationLogs.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'logId': ParamValue} }
    'boats.adminDocuments.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'documentId': ParamValue} }
    'boats.reservations.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'boats.reservations.inspections.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue,'inspectionId': ParamValue} }
    'boats.reservations.inspections.equipmentActions.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue,'inspectionId': ParamValue,'actionId': ParamValue} }
    'boats.reservations.inspections.photos.destroy': { paramsTuple: [ParamValue,ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue,'inspectionId': ParamValue,'mediaId': ParamValue} }
    'boats.reservations.contract.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue} }
    'ports.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ports.pontoons.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'pontoonId': ParamValue} }
    'ports.mouillages.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'mouillageId': ParamValue} }
    'spots.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.billing.module.remove': { paramsTuple?: []; params?: {} }
    'settings.branding.logo.delete': { paramsTuple?: []; params?: {} }
    'organization.members.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organization.invitations.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'notifications.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'crew.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'crew.certifications.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'memberId': ParamValue,'certId': ParamValue} }
    'clients.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clients.media.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'mediaId': ParamValue} }
    'pricingSeasons.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'boats.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.pricing.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boat_equipment.update_engine': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_engine_parts.update': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue,'partId': ParamValue} }
    'boat_equipment.update_sail': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sailId': ParamValue} }
    'boat_equipment.upsert_rig': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.maintenanceTasks.done': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'taskId': ParamValue} }
    'boat_safety_equipment.update': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'itemId': ParamValue} }
    'boat_generic_equipment.update': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'itemId': ParamValue} }
    'boats.maintenanceSheets.complete': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sheetId': ParamValue} }
    'boats.maintenanceSheetItems.update': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'sheetId': ParamValue,'itemId': ParamValue} }
    'boats.incidents.update': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'incidentId': ParamValue} }
    'boats.equipmentActions.update': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'actionId': ParamValue} }
    'boats.adminDocuments.update': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'documentId': ParamValue} }
    'boats.reservations.inspections.update': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'boatId': ParamValue,'reservationId': ParamValue,'inspectionId': ParamValue} }
    'ports.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'ports.pontoons.update': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'pontoonId': ParamValue} }
    'ports.mouillages.update': { paramsTuple: [ParamValue,ParamValue]; params: {'portId': ParamValue,'mouillageId': ParamValue} }
    'spots.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.profile.update': { paramsTuple?: []; params?: {} }
    'settings.org.update': { paramsTuple?: []; params?: {} }
    'settings.ai.update': { paramsTuple?: []; params?: {} }
    'settings.branding.update': { paramsTuple?: []; params?: {} }
    'organization.members.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'crew.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'clients.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'pricingSeasons.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invoices.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}