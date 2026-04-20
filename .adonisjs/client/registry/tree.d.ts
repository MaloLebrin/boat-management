/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  home: typeof routes['home']
  boats: {
    index: typeof routes['boats.index']
    create: typeof routes['boats.create']
    store: typeof routes['boats.store']
    show: typeof routes['boats.show']
    edit: typeof routes['boats.edit']
    update: typeof routes['boats.update']
    destroy: typeof routes['boats.destroy']
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
}
