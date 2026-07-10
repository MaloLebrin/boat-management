/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  dashboard: typeof routes['dashboard']
  designSystem: typeof routes['design_system']
  sitemap: typeof routes['sitemap']
  boats: {
    index: typeof routes['boats.index']
    create: typeof routes['boats.create']
    store: typeof routes['boats.store']
    show: typeof routes['boats.show']
    navigation: typeof routes['boats.navigation']
    maintenanceLog: {
      download: typeof routes['boats.maintenanceLog.download']
    }
    export: {
      maintenance: typeof routes['boats.export.maintenance']
      fuelLogs: typeof routes['boats.export.fuelLogs']
      navigationLogs: typeof routes['boats.export.navigationLogs']
      budget: typeof routes['boats.export.budget']
    }
    budget: typeof routes['boats.budget'] & {
      entries: {
        store: typeof routes['boats.budget.entries.store']
        update: typeof routes['boats.budget.entries.update']
        destroy: typeof routes['boats.budget.entries.destroy']
      }
    }
    portStays: {
      store: typeof routes['boats.portStays.store']
      update: typeof routes['boats.portStays.update']
      destroy: typeof routes['boats.portStays.destroy']
    }
    edit: typeof routes['boats.edit']
    update: typeof routes['boats.update']
    destroy: typeof routes['boats.destroy']
    pricing: {
      update: typeof routes['boats.pricing.update']
    }
    assign: typeof routes['boats.assign']
    engines: {
      show: typeof routes['boats.engines.show']
      parts: {
        show: typeof routes['boats.engines.parts.show']
      }
    }
    maintenanceTasks: {
      store: typeof routes['boats.maintenanceTasks.store']
      done: typeof routes['boats.maintenanceTasks.done']
      destroy: typeof routes['boats.maintenanceTasks.destroy']
    }
    maintenanceSheets: {
      store: typeof routes['boats.maintenanceSheets.store']
      complete: typeof routes['boats.maintenanceSheets.complete']
      destroy: typeof routes['boats.maintenanceSheets.destroy']
    }
    maintenanceSheetItems: {
      update: typeof routes['boats.maintenanceSheetItems.update']
    }
    incidents: {
      store: typeof routes['boats.incidents.store']
      update: typeof routes['boats.incidents.update']
      destroy: typeof routes['boats.incidents.destroy']
    }
    equipmentActions: {
      store: typeof routes['boats.equipmentActions.store']
      update: typeof routes['boats.equipmentActions.update']
      destroy: typeof routes['boats.equipmentActions.destroy']
    }
    simulator: typeof routes['boats.simulator']
    fuelLogs: {
      store: typeof routes['boats.fuelLogs.store']
      destroy: typeof routes['boats.fuelLogs.destroy']
    }
    navigationLogs: {
      store: typeof routes['boats.navigationLogs.store']
      update: typeof routes['boats.navigationLogs.update']
      close: typeof routes['boats.navigationLogs.close']
      destroy: typeof routes['boats.navigationLogs.destroy']
      crew: {
        sync: typeof routes['boats.navigationLogs.crew.sync']
      }
      crewRole: {
        download: typeof routes['boats.navigationLogs.crewRole.download']
      }
    }
    adminDocuments: {
      store: typeof routes['boats.adminDocuments.store']
      update: typeof routes['boats.adminDocuments.update']
      destroy: typeof routes['boats.adminDocuments.destroy']
    }
    position: {
      store: typeof routes['boats.position.store']
    }
    reservations: {
      index: typeof routes['boats.reservations.index']
      store: typeof routes['boats.reservations.store']
      update: typeof routes['boats.reservations.update']
      destroy: typeof routes['boats.reservations.destroy']
      inspection: {
        show: typeof routes['boats.reservations.inspection.show']
      }
      inspections: {
        store: typeof routes['boats.reservations.inspections.store']
        update: typeof routes['boats.reservations.inspections.update']
        destroy: typeof routes['boats.reservations.inspections.destroy']
        equipmentActions: {
          store: typeof routes['boats.reservations.inspections.equipmentActions.store']
          destroy: typeof routes['boats.reservations.inspections.equipmentActions.destroy']
        }
        photos: {
          store: typeof routes['boats.reservations.inspections.photos.store']
          destroy: typeof routes['boats.reservations.inspections.photos.destroy']
        }
      }
      contract: {
        show: typeof routes['boats.reservations.contract.show']
        store: typeof routes['boats.reservations.contract.store']
        pdf: typeof routes['boats.reservations.contract.pdf']
        signedDocument: typeof routes['boats.reservations.contract.signedDocument']
        send: typeof routes['boats.reservations.contract.send']
        sign: typeof routes['boats.reservations.contract.sign']
        destroy: typeof routes['boats.reservations.contract.destroy']
      }
    }
  }
  boatEquipment: {
    storeEngine: typeof routes['boat_equipment.store_engine']
    editEngine: typeof routes['boat_equipment.edit_engine']
    updateEngine: typeof routes['boat_equipment.update_engine']
    updateEngineStatus: typeof routes['boat_equipment.update_engine_status']
    updateEngineNotes: typeof routes['boat_equipment.update_engine_notes']
    destroyEngine: typeof routes['boat_equipment.destroy_engine']
    storeSail: typeof routes['boat_equipment.store_sail']
    editSail: typeof routes['boat_equipment.edit_sail']
    updateSail: typeof routes['boat_equipment.update_sail']
    destroySail: typeof routes['boat_equipment.destroy_sail']
    editRig: typeof routes['boat_equipment.edit_rig']
    upsertRig: typeof routes['boat_equipment.upsert_rig']
    destroyRig: typeof routes['boat_equipment.destroy_rig']
  }
  boatMedia: {
    storeEngineDocument: typeof routes['boat_media.store_engine_document']
    destroyEngineMedia: typeof routes['boat_media.destroy_engine_media']
    downloadMedia: typeof routes['boat_media.download_media']
    downloadEngineMedia: typeof routes['boat_media.download_engine_media']
    storePhoto: typeof routes['boat_media.store_photo']
    storeDocument: typeof routes['boat_media.store_document']
    destroy: typeof routes['boat_media.destroy']
  }
  boatEngineParts: {
    store: typeof routes['boat_engine_parts.store']
    update: typeof routes['boat_engine_parts.update']
    destroy: typeof routes['boat_engine_parts.destroy']
    storeDocument: typeof routes['boat_engine_parts.store_document']
    destroyMedia: typeof routes['boat_engine_parts.destroy_media']
    downloadMedia: typeof routes['boat_engine_parts.download_media']
  }
  boatMaintenances: {
    store: typeof routes['boat_maintenances.store']
    destroy: typeof routes['boat_maintenances.destroy']
  }
  boatSafetyEquipment: {
    store: typeof routes['boat_safety_equipment.store']
    update: typeof routes['boat_safety_equipment.update']
    destroy: typeof routes['boat_safety_equipment.destroy']
  }
  boatGenericEquipment: {
    store: typeof routes['boat_generic_equipment.store']
    update: typeof routes['boat_generic_equipment.update']
    destroy: typeof routes['boat_generic_equipment.destroy']
  }
  ports: {
    index: typeof routes['ports.index']
    create: typeof routes['ports.create']
    store: typeof routes['ports.store']
    show: typeof routes['ports.show']
    edit: typeof routes['ports.edit']
    update: typeof routes['ports.update']
    destroy: typeof routes['ports.destroy']
    pontoons: {
      store: typeof routes['ports.pontoons.store']
      update: typeof routes['ports.pontoons.update']
      destroy: typeof routes['ports.pontoons.destroy']
      updatePosition: typeof routes['ports.pontoons.updatePosition']
      spots: {
        store: typeof routes['ports.pontoons.spots.store']
      }
    }
    mouillages: {
      store: typeof routes['ports.mouillages.store']
      update: typeof routes['ports.mouillages.update']
      destroy: typeof routes['ports.mouillages.destroy']
      updatePosition: typeof routes['ports.mouillages.updatePosition']
      spots: {
        store: typeof routes['ports.mouillages.spots.store']
      }
    }
  }
  spots: {
    update: typeof routes['spots.update']
    destroy: typeof routes['spots.destroy']
  }
  home: typeof routes['home']
  marketing: {
    en: {
      home: typeof routes['marketing.en.home']
      pricing: typeof routes['marketing.en.pricing']
      simulator: typeof routes['marketing.en.simulator']
      guide: typeof routes['marketing.en.guide']
      privacy: typeof routes['marketing.en.privacy']
      about: typeof routes['marketing.en.about']
    }
    fr: {
      home: typeof routes['marketing.fr.home']
      pricing: typeof routes['marketing.fr.pricing']
      simulator: typeof routes['marketing.fr.simulator']
      guide: typeof routes['marketing.fr.guide']
      privacy: typeof routes['marketing.fr.privacy']
      about: typeof routes['marketing.fr.about']
    }
    contact: typeof routes['marketing.contact']
  }
  simulator: {
    session: typeof routes['simulator.session']
    createBoat: typeof routes['simulator.create_boat']
    lead: typeof routes['simulator.lead']
    share: {
      store: typeof routes['simulator.share.store']
      show: {
        fr: typeof routes['simulator.share.show.fr']
        en: typeof routes['simulator.share.show.en']
      }
    }
  }
  planning: {
    index: typeof routes['planning.index']
  }
  locale: {
    set: typeof routes['locale.set']
  }
  settings: {
    index: typeof routes['settings.index']
    me: typeof routes['settings.me']
    org: typeof routes['settings.org'] & {
      update: typeof routes['settings.org.update']
    }
    members: typeof routes['settings.members']
    billing: typeof routes['settings.billing'] & {
      checkout: typeof routes['settings.billing.checkout']
      portal: typeof routes['settings.billing.portal']
      module: {
        add: typeof routes['settings.billing.module.add']
        remove: typeof routes['settings.billing.module.remove']
      }
    }
    profile: {
      update: typeof routes['settings.profile.update']
    }
    ai: typeof routes['settings.ai'] & {
      update: typeof routes['settings.ai.update']
    }
    auditLog: typeof routes['settings.auditLog']
    branding: typeof routes['settings.branding'] & {
      update: typeof routes['settings.branding.update']
      logo: {
        upload: typeof routes['settings.branding.logo.upload']
        delete: typeof routes['settings.branding.logo.delete']
      }
    }
    import: typeof routes['settings.import'] & {
      preview: typeof routes['settings.import.preview']
      confirm: typeof routes['settings.import.confirm']
      cancel: typeof routes['settings.import.cancel']
    }
  }
  maintenance: {
    history: typeof routes['maintenance.history']
  }
  organization: {
    members: {
      index: typeof routes['organization.members.index']
      store: typeof routes['organization.members.store']
      update: typeof routes['organization.members.update']
      destroy: typeof routes['organization.members.destroy']
    }
    invitations: {
      store: typeof routes['organization.invitations.store']
      destroy: typeof routes['organization.invitations.destroy']
    }
  }
  invitations: {
    show: typeof routes['invitations.show']
    accept: typeof routes['invitations.accept']
    decline: typeof routes['invitations.decline']
  }
  webhooks: {
    stripe: typeof routes['webhooks.stripe']
  }
  mailPreviews: {
    index: typeof routes['mail_previews.index']
    show: typeof routes['mail_previews.show']
  }
  pdfPreviews: {
    index: typeof routes['pdf_previews.index']
    show: typeof routes['pdf_previews.show']
  }
  notifications: {
    index: typeof routes['notifications.index']
    markAllAsRead: typeof routes['notifications.markAllAsRead']
    markAsRead: typeof routes['notifications.markAsRead']
    destroy: typeof routes['notifications.destroy']
  }
  crew: {
    index: typeof routes['crew.index']
    store: typeof routes['crew.store']
    update: typeof routes['crew.update']
    destroy: typeof routes['crew.destroy']
    certifications: {
      store: typeof routes['crew.certifications.store']
      destroy: typeof routes['crew.certifications.destroy']
    }
  }
  navigation: {
    logbook: typeof routes['navigation.logbook']
    fuel: typeof routes['navigation.fuel']
    incidents: typeof routes['navigation.incidents']
  }
  reservations: {
    index: typeof routes['reservations.index']
  }
  clients: {
    index: typeof routes['clients.index']
    show: typeof routes['clients.show']
    store: typeof routes['clients.store']
    update: typeof routes['clients.update']
    destroy: typeof routes['clients.destroy']
    documents: {
      store: typeof routes['clients.documents.store']
    }
    media: {
      destroy: typeof routes['clients.media.destroy']
      download: typeof routes['clients.media.download']
    }
    anonymize: typeof routes['clients.anonymize']
    export: typeof routes['clients.export']
  }
  pricingSeasons: {
    index: typeof routes['pricingSeasons.index']
    store: typeof routes['pricingSeasons.store']
    update: typeof routes['pricingSeasons.update']
    destroy: typeof routes['pricingSeasons.destroy']
  }
  invoices: {
    index: typeof routes['invoices.index']
    create: typeof routes['invoices.create']
    store: typeof routes['invoices.store']
    fromReservation: typeof routes['invoices.fromReservation']
    show: typeof routes['invoices.show']
    edit: typeof routes['invoices.edit']
    pdf: typeof routes['invoices.pdf']
    send: typeof routes['invoices.send']
    convert: typeof routes['invoices.convert']
    pay: typeof routes['invoices.pay']
    update: typeof routes['invoices.update']
    destroy: typeof routes['invoices.destroy']
  }
  eventStream: typeof routes['event_stream']
  subscribe: typeof routes['subscribe']
  unsubscribe: typeof routes['unsubscribe']
  newAccount: {
    create: typeof routes['new_account.create']
    store: typeof routes['new_account.store']
  }
  session: {
    create: typeof routes['session.create']
    store: typeof routes['session.store']
    destroy: typeof routes['session.destroy']
  }
  password: {
    forgot: typeof routes['password.forgot']
    reset: typeof routes['password.reset']
  }
  passwordReset: {
    store: typeof routes['password_reset.store']
    update: typeof routes['password_reset.update']
  }
  ai: {
    chat: typeof routes['ai.chat']
    fleetAnalysis: typeof routes['ai.fleetAnalysis']
    boatSuggestions: typeof routes['ai.boatSuggestions']
  }
  demo: {
    login: typeof routes['demo.login']
  }
}
