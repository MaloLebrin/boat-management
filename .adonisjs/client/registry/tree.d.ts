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
    edit: typeof routes['boats.edit']
    update: typeof routes['boats.update']
    destroy: typeof routes['boats.destroy']
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
    simulator: typeof routes['boats.simulator']
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
      about: typeof routes['marketing.en.about']
    }
    fr: {
      home: typeof routes['marketing.fr.home']
      pricing: typeof routes['marketing.fr.pricing']
      simulator: typeof routes['marketing.fr.simulator']
      guide: typeof routes['marketing.fr.guide']
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
    }
    profile: {
      update: typeof routes['settings.profile.update']
    }
    ai: typeof routes['settings.ai'] & {
      update: typeof routes['settings.ai.update']
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
  }
  webhooks: {
    stripe: typeof routes['webhooks.stripe']
  }
  mailPreviews: {
    index: typeof routes['mail_previews.index']
    show: typeof routes['mail_previews.show']
  }
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
}
