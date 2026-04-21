import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'design_system': { paramsTuple?: []; params?: {} }
    'boats.index': { paramsTuple?: []; params?: {} }
    'boats.create': { paramsTuple?: []; params?: {} }
    'boats.store': { paramsTuple?: []; params?: {} }
    'boats.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boat_equipment.store_engine': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_equipment.edit_engine': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_equipment.update_engine': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_equipment.destroy_engine': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
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
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'ai.chat': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'design_system': { paramsTuple?: []; params?: {} }
    'boats.index': { paramsTuple?: []; params?: {} }
    'boats.create': { paramsTuple?: []; params?: {} }
    'boats.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boat_equipment.edit_engine': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_equipment.edit_sail': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sailId': ParamValue} }
    'boat_equipment.edit_rig': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'design_system': { paramsTuple?: []; params?: {} }
    'boats.index': { paramsTuple?: []; params?: {} }
    'boats.create': { paramsTuple?: []; params?: {} }
    'boats.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boats.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boat_equipment.edit_engine': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_equipment.edit_sail': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sailId': ParamValue} }
    'boat_equipment.edit_rig': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'boats.store': { paramsTuple?: []; params?: {} }
    'boat_equipment.store_engine': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_equipment.store_sail': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_maintenances.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.maintenanceTasks.store': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'ai.chat': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'boats.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boat_equipment.update_engine': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_equipment.update_sail': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sailId': ParamValue} }
    'boat_equipment.upsert_rig': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boats.maintenanceTasks.done': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'taskId': ParamValue} }
  }
  DELETE: {
    'boats.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'boat_equipment.destroy_engine': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'engineId': ParamValue} }
    'boat_equipment.destroy_sail': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'sailId': ParamValue} }
    'boat_equipment.destroy_rig': { paramsTuple: [ParamValue]; params: {'boatId': ParamValue} }
    'boat_maintenances.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'eventId': ParamValue} }
    'boats.maintenanceTasks.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'boatId': ParamValue,'taskId': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}