/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
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
    engines: {
      show: typeof routes['boats.engines.show']
    }
    maintenanceTasks: {
      store: typeof routes['boats.maintenanceTasks.store']
      done: typeof routes['boats.maintenanceTasks.done']
      destroy: typeof routes['boats.maintenanceTasks.destroy']
    }
  }
  boatEquipment: {
    storeEngine: typeof routes['boat_equipment.store_engine']
    editEngine: typeof routes['boat_equipment.edit_engine']
    updateEngine: typeof routes['boat_equipment.update_engine']
    destroyEngine: typeof routes['boat_equipment.destroy_engine']
    storeSail: typeof routes['boat_equipment.store_sail']
    editSail: typeof routes['boat_equipment.edit_sail']
    updateSail: typeof routes['boat_equipment.update_sail']
    destroySail: typeof routes['boat_equipment.destroy_sail']
    editRig: typeof routes['boat_equipment.edit_rig']
    upsertRig: typeof routes['boat_equipment.upsert_rig']
    destroyRig: typeof routes['boat_equipment.destroy_rig']
  }
  boatMaintenances: {
    store: typeof routes['boat_maintenances.store']
    destroy: typeof routes['boat_maintenances.destroy']
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
  ai: {
    chat: typeof routes['ai.chat']
  }
  root: typeof routes['root']
  marketing: {
    en: {
      home: typeof routes['marketing.en.home']
      pricing: typeof routes['marketing.en.pricing']
      about: typeof routes['marketing.en.about']
    }
    fr: {
      home: typeof routes['marketing.fr.home']
      pricing: typeof routes['marketing.fr.pricing']
      about: typeof routes['marketing.fr.about']
    }
    contact: typeof routes['marketing.contact']
  }
  dashboard: typeof routes['dashboard']
  planning: {
    index: typeof routes['planning.index']
  }
  settings: {
    index: typeof routes['settings.index']
  }
  locale: {
    set: typeof routes['locale.set']
  }
  maintenance: {
    history: typeof routes['maintenance.history']
  }
}
