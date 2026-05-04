/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'design_system': {
    methods: ["GET","HEAD"]
    pattern: '/design-system'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'boats.index': {
    methods: ["GET","HEAD"]
    pattern: '/boats'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boats_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boats_controller').default['index']>>>
    }
  }
  'boats.create': {
    methods: ["GET","HEAD"]
    pattern: '/boats/new'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boats_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boats_controller').default['create']>>>
    }
  }
  'boats.store': {
    methods: ["POST"]
    pattern: '/boats'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat').createBoatValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/boat').createBoatValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boats_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boats_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.show': {
    methods: ["GET","HEAD"]
    pattern: '/boats/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boats_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boats_controller').default['show']>>>
    }
  }
  'boats.edit': {
    methods: ["GET","HEAD"]
    pattern: '/boats/:id/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boats_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boats_controller').default['edit']>>>
    }
  }
  'boats.update': {
    methods: ["PUT"]
    pattern: '/boats/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat').updateBoatValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat').updateBoatValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boats_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boats_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.destroy': {
    methods: ["DELETE"]
    pattern: '/boats/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boats_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boats_controller').default['destroy']>>>
    }
  }
  'boat_equipment.store_engine': {
    methods: ["POST"]
    pattern: '/boats/:boatId/engines'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_equipment').storeBoatEngineValidator)>>
      paramsTuple: [ParamValue]
      params: { boatId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_equipment').storeBoatEngineValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['storeEngine']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['storeEngine']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.engines.show': {
    methods: ["GET","HEAD"]
    pattern: '/boats/:boatId/engines/:engineId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; engineId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['showEngine']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['showEngine']>>>
    }
  }
  'boat_equipment.edit_engine': {
    methods: ["GET","HEAD"]
    pattern: '/boats/:boatId/engines/:engineId/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; engineId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['editEngine']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['editEngine']>>>
    }
  }
  'boat_equipment.update_engine': {
    methods: ["PUT"]
    pattern: '/boats/:boatId/engines/:engineId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_equipment').updateBoatEngineValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; engineId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_equipment').updateBoatEngineValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['updateEngine']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['updateEngine']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boat_equipment.destroy_engine': {
    methods: ["DELETE"]
    pattern: '/boats/:boatId/engines/:engineId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; engineId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['destroyEngine']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['destroyEngine']>>>
    }
  }
  'boat_equipment.store_sail': {
    methods: ["POST"]
    pattern: '/boats/:boatId/sails'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_equipment').storeBoatSailValidator)>>
      paramsTuple: [ParamValue]
      params: { boatId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_equipment').storeBoatSailValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['storeSail']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['storeSail']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boat_equipment.edit_sail': {
    methods: ["GET","HEAD"]
    pattern: '/boats/:boatId/sails/:sailId/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; sailId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['editSail']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['editSail']>>>
    }
  }
  'boat_equipment.update_sail': {
    methods: ["PUT"]
    pattern: '/boats/:boatId/sails/:sailId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_equipment').updateBoatSailValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; sailId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_equipment').updateBoatSailValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['updateSail']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['updateSail']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boat_equipment.destroy_sail': {
    methods: ["DELETE"]
    pattern: '/boats/:boatId/sails/:sailId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; sailId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['destroySail']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['destroySail']>>>
    }
  }
  'boat_equipment.edit_rig': {
    methods: ["GET","HEAD"]
    pattern: '/boats/:boatId/rig/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { boatId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['editRig']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['editRig']>>>
    }
  }
  'boat_equipment.upsert_rig': {
    methods: ["PUT"]
    pattern: '/boats/:boatId/rig'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_equipment').upsertBoatRigValidator)>>
      paramsTuple: [ParamValue]
      params: { boatId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_equipment').upsertBoatRigValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['upsertRig']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['upsertRig']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boat_equipment.destroy_rig': {
    methods: ["DELETE"]
    pattern: '/boats/:boatId/rig'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { boatId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['destroyRig']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['destroyRig']>>>
    }
  }
  'boat_maintenances.store': {
    methods: ["POST"]
    pattern: '/boats/:boatId/maintenance'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_maintenance').createBoatMaintenanceValidator)>>
      paramsTuple: [ParamValue]
      params: { boatId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_maintenance').createBoatMaintenanceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_maintenances_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_maintenances_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boat_maintenances.destroy': {
    methods: ["DELETE"]
    pattern: '/boats/:boatId/maintenance/:eventId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; eventId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_maintenances_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_maintenances_controller').default['destroy']>>>
    }
  }
  'boats.maintenanceTasks.store': {
    methods: ["POST"]
    pattern: '/boats/:boatId/maintenance-tasks'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_maintenance_task').createBoatMaintenanceTaskValidator)>>
      paramsTuple: [ParamValue]
      params: { boatId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_maintenance_task').createBoatMaintenanceTaskValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_maintenance_tasks_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_maintenance_tasks_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.maintenanceTasks.done': {
    methods: ["PUT"]
    pattern: '/boats/:boatId/maintenance-tasks/:taskId/done'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_maintenance_task').markBoatMaintenanceTaskDoneValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; taskId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_maintenance_task').markBoatMaintenanceTaskDoneValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_maintenance_tasks_controller').default['markDone']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_maintenance_tasks_controller').default['markDone']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.maintenanceTasks.destroy': {
    methods: ["DELETE"]
    pattern: '/boats/:boatId/maintenance-tasks/:taskId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; taskId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_maintenance_tasks_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_maintenance_tasks_controller').default['destroy']>>>
    }
  }
  'new_account.create': {
    methods: ["GET","HEAD"]
    pattern: '/signup'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['create']>>>
    }
  }
  'new_account.store': {
    methods: ["POST"]
    pattern: '/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session.create': {
    methods: ["GET","HEAD"]
    pattern: '/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
    }
  }
  'session.store': {
    methods: ["POST"]
    pattern: '/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>>
    }
  }
  'session.destroy': {
    methods: ["POST"]
    pattern: '/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
    }
  }
  'ai.chat': {
    methods: ["POST"]
    pattern: '/ai/chat'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ai_controller').default['chat']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ai_controller').default['chat']>>>
    }
  }
  'root': {
    methods: ["GET","HEAD"]
    pattern: '/'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'marketing.en.home': {
    methods: ["GET","HEAD"]
    pattern: '/en'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'marketing.en.pricing': {
    methods: ["GET","HEAD"]
    pattern: '/en/tarifs'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'marketing.fr.home': {
    methods: ["GET","HEAD"]
    pattern: '/fr'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'marketing.fr.pricing': {
    methods: ["GET","HEAD"]
    pattern: '/fr/tarifs'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'dashboard': {
    methods: ["GET","HEAD"]
    pattern: '/dashboard'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'planning.index': {
    methods: ["GET","HEAD"]
    pattern: '/planning'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/planning_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/planning_controller').default['index']>>>
    }
  }
  'settings.index': {
    methods: ["GET","HEAD"]
    pattern: '/settings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['index']>>>
    }
  }
  'maintenance.history': {
    methods: ["GET","HEAD"]
    pattern: '/maintenance/history'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maintenance_history_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maintenance_history_controller').default['index']>>>
    }
  }
}
