/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'dashboard': {
    methods: ["GET","HEAD"]
    pattern: '/dashboard'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/home_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/home_controller').default['index']>>>
    }
  }
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
  'sitemap': {
    methods: ["GET","HEAD"]
    pattern: '/sitemap.xml'
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
  'boats.navigation': {
    methods: ["GET","HEAD"]
    pattern: '/boats/:id/navigation'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boats_controller').default['navigation']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boats_controller').default['navigation']>>>
    }
  }
  'boats.maintenanceLog.download': {
    methods: ["GET","HEAD"]
    pattern: '/boats/:id/maintenance-log.pdf'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/maintenance_log_pdf_controller').default['download']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/maintenance_log_pdf_controller').default['download']>>>
    }
  }
  'boats.export.maintenance': {
    methods: ["GET","HEAD"]
    pattern: '/boats/:id/export/maintenance.csv'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/csv_export_controller').default['maintenance']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/csv_export_controller').default['maintenance']>>>
    }
  }
  'boats.export.fuelLogs': {
    methods: ["GET","HEAD"]
    pattern: '/boats/:id/export/fuel-logs.csv'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/csv_export_controller').default['fuelLogs']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/csv_export_controller').default['fuelLogs']>>>
    }
  }
  'boats.export.navigationLogs': {
    methods: ["GET","HEAD"]
    pattern: '/boats/:id/export/navigation-logs.csv'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/csv_export_controller').default['navigationLogs']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/csv_export_controller').default['navigationLogs']>>>
    }
  }
  'boats.export.budget': {
    methods: ["GET","HEAD"]
    pattern: '/boats/:id/export/budget.csv'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/budget_validator').budgetYearValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/csv_export_controller').default['budget']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/csv_export_controller').default['budget']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.budget': {
    methods: ["GET","HEAD"]
    pattern: '/boats/:id/budget'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/budget_validator').budgetYearValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/budget_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/budget_controller').default['show']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.portStays.store': {
    methods: ["POST"]
    pattern: '/boats/:id/port-stays'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_port_stay_validator').boatPortStayValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_port_stay_validator').boatPortStayValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_port_stay_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_port_stay_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.portStays.destroy': {
    methods: ["DELETE"]
    pattern: '/boats/:id/port-stays/:stayId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; stayId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_port_stay_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_port_stay_controller').default['destroy']>>>
    }
  }
  'boats.budget.entries.store': {
    methods: ["POST"]
    pattern: '/boats/:id/budget/entries'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/budget_entry_validator').budgetEntryValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/budget_entry_validator').budgetEntryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_budget_entry_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_budget_entry_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.budget.entries.destroy': {
    methods: ["DELETE"]
    pattern: '/boats/:id/budget/entries/:entryId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; entryId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_budget_entry_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_budget_entry_controller').default['destroy']>>>
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
  'boats.assign': {
    methods: ["PATCH"]
    pattern: '/boats/:id/assignment'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/marina_layout').assignBoatValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/marina_layout').assignBoatValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boats_controller').default['assign']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boats_controller').default['assign']>>> | { status: 422; response: { errors: SimpleError[] } }
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
  'boat_equipment.update_engine_status': {
    methods: ["PATCH"]
    pattern: '/boats/:boatId/engines/:engineId/status'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_equipment').updateEquipmentStatusValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; engineId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_equipment').updateEquipmentStatusValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['updateEngineStatus']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['updateEngineStatus']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boat_equipment.update_engine_notes': {
    methods: ["PATCH"]
    pattern: '/boats/:boatId/engines/:engineId/notes'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_equipment').updateEquipmentNotesValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; engineId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_equipment').updateEquipmentNotesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['updateEngineNotes']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_equipment_controller').default['updateEngineNotes']>>> | { status: 422; response: { errors: SimpleError[] } }
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
  'boat_media.store_engine_document': {
    methods: ["POST"]
    pattern: '/boats/:boatId/engines/:engineId/documents'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/media').storeBoatDocumentValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; engineId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/media').storeBoatDocumentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_media_controller').default['storeEngineDocument']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_media_controller').default['storeEngineDocument']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boat_media.destroy_engine_media': {
    methods: ["DELETE"]
    pattern: '/boats/:boatId/engines/:engineId/media/:mediaId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { boatId: ParamValue; engineId: ParamValue; mediaId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_media_controller').default['destroyEngineMedia']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_media_controller').default['destroyEngineMedia']>>>
    }
  }
  'boat_engine_parts.store': {
    methods: ["POST"]
    pattern: '/boats/:boatId/engines/:engineId/parts'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_engine_part').createEnginePartValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; engineId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_engine_part').createEnginePartValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_engine_parts_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_engine_parts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.engines.parts.show': {
    methods: ["GET","HEAD"]
    pattern: '/boats/:boatId/engines/:engineId/parts/:partId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { boatId: ParamValue; engineId: ParamValue; partId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_engine_parts_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_engine_parts_controller').default['show']>>>
    }
  }
  'boat_engine_parts.update': {
    methods: ["PUT"]
    pattern: '/boats/:boatId/engines/:engineId/parts/:partId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_engine_part').updateEnginePartValidator)>>
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { boatId: ParamValue; engineId: ParamValue; partId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_engine_part').updateEnginePartValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_engine_parts_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_engine_parts_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boat_engine_parts.destroy': {
    methods: ["DELETE"]
    pattern: '/boats/:boatId/engines/:engineId/parts/:partId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { boatId: ParamValue; engineId: ParamValue; partId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_engine_parts_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_engine_parts_controller').default['destroy']>>>
    }
  }
  'boat_engine_parts.store_document': {
    methods: ["POST"]
    pattern: '/boats/:boatId/engines/:engineId/parts/:partId/documents'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/media').storeBoatDocumentValidator)>>
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { boatId: ParamValue; engineId: ParamValue; partId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/media').storeBoatDocumentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_engine_parts_controller').default['storeDocument']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_engine_parts_controller').default['storeDocument']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boat_engine_parts.destroy_media': {
    methods: ["DELETE"]
    pattern: '/boats/:boatId/engines/:engineId/parts/:partId/media/:mediaId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue, ParamValue]
      params: { boatId: ParamValue; engineId: ParamValue; partId: ParamValue; mediaId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_engine_parts_controller').default['destroyMedia']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_engine_parts_controller').default['destroyMedia']>>>
    }
  }
  'boat_engine_parts.download_media': {
    methods: ["GET","HEAD"]
    pattern: '/boats/:boatId/engines/:engineId/parts/:partId/media/:mediaId/download'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue, ParamValue]
      params: { boatId: ParamValue; engineId: ParamValue; partId: ParamValue; mediaId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_engine_parts_controller').default['downloadMedia']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_engine_parts_controller').default['downloadMedia']>>>
    }
  }
  'boat_media.download_media': {
    methods: ["GET","HEAD"]
    pattern: '/boats/:boatId/media/:mediaId/download'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; mediaId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_media_controller').default['downloadMedia']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_media_controller').default['downloadMedia']>>>
    }
  }
  'boat_media.download_engine_media': {
    methods: ["GET","HEAD"]
    pattern: '/boats/:boatId/engines/:engineId/media/:mediaId/download'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { boatId: ParamValue; engineId: ParamValue; mediaId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_media_controller').default['downloadEngineMedia']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_media_controller').default['downloadEngineMedia']>>>
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
  'boat_media.store_photo': {
    methods: ["POST"]
    pattern: '/boats/:boatId/photos'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/media').storeBoatPhotoValidator)>>
      paramsTuple: [ParamValue]
      params: { boatId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/media').storeBoatPhotoValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_media_controller').default['storePhoto']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_media_controller').default['storePhoto']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boat_media.store_document': {
    methods: ["POST"]
    pattern: '/boats/:boatId/documents'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/media').storeBoatDocumentValidator)>>
      paramsTuple: [ParamValue]
      params: { boatId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/media').storeBoatDocumentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_media_controller').default['storeDocument']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_media_controller').default['storeDocument']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boat_media.destroy': {
    methods: ["DELETE"]
    pattern: '/boats/:boatId/media/:mediaId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; mediaId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_media_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_media_controller').default['destroy']>>>
    }
  }
  'boat_safety_equipment.store': {
    methods: ["POST"]
    pattern: '/boats/:boatId/safety-equipment'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_safety_equipment').createSafetyEquipmentValidator)>>
      paramsTuple: [ParamValue]
      params: { boatId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_safety_equipment').createSafetyEquipmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_safety_equipment_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_safety_equipment_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boat_safety_equipment.update': {
    methods: ["PUT"]
    pattern: '/boats/:boatId/safety-equipment/:itemId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_safety_equipment').updateSafetyEquipmentValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; itemId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_safety_equipment').updateSafetyEquipmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_safety_equipment_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_safety_equipment_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boat_safety_equipment.destroy': {
    methods: ["DELETE"]
    pattern: '/boats/:boatId/safety-equipment/:itemId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; itemId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_safety_equipment_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_safety_equipment_controller').default['destroy']>>>
    }
  }
  'boat_generic_equipment.store': {
    methods: ["POST"]
    pattern: '/boats/:boatId/generic-equipment'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_generic_equipment').createGenericEquipmentValidator)>>
      paramsTuple: [ParamValue]
      params: { boatId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_generic_equipment').createGenericEquipmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_generic_equipment_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_generic_equipment_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boat_generic_equipment.update': {
    methods: ["PUT"]
    pattern: '/boats/:boatId/generic-equipment/:itemId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_generic_equipment').updateGenericEquipmentValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; itemId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_generic_equipment').updateGenericEquipmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_generic_equipment_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_generic_equipment_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boat_generic_equipment.destroy': {
    methods: ["DELETE"]
    pattern: '/boats/:boatId/generic-equipment/:itemId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; itemId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_generic_equipment_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_generic_equipment_controller').default['destroy']>>>
    }
  }
  'boats.maintenanceSheets.store': {
    methods: ["POST"]
    pattern: '/boats/:boatId/maintenance-sheets'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_maintenance_sheet').createBoatMaintenanceSheetValidator)>>
      paramsTuple: [ParamValue]
      params: { boatId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_maintenance_sheet').createBoatMaintenanceSheetValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_maintenance_sheets_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_maintenance_sheets_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.maintenanceSheets.complete': {
    methods: ["PUT"]
    pattern: '/boats/:boatId/maintenance-sheets/:sheetId/complete'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; sheetId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_maintenance_sheets_controller').default['complete']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_maintenance_sheets_controller').default['complete']>>>
    }
  }
  'boats.maintenanceSheets.destroy': {
    methods: ["DELETE"]
    pattern: '/boats/:boatId/maintenance-sheets/:sheetId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; sheetId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_maintenance_sheets_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_maintenance_sheets_controller').default['destroy']>>>
    }
  }
  'boats.maintenanceSheetItems.update': {
    methods: ["PUT"]
    pattern: '/boats/:boatId/maintenance-sheets/:sheetId/items/:itemId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_maintenance_sheet').updateSheetItemValidator)>>
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { boatId: ParamValue; sheetId: ParamValue; itemId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_maintenance_sheet').updateSheetItemValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_maintenance_sheet_items_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_maintenance_sheet_items_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.incidents.store': {
    methods: ["POST"]
    pattern: '/boats/:boatId/incidents'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_incident').createBoatIncidentValidator)>>
      paramsTuple: [ParamValue]
      params: { boatId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_incident').createBoatIncidentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_incidents_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_incidents_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.incidents.update': {
    methods: ["PUT"]
    pattern: '/boats/:boatId/incidents/:incidentId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_incident').updateBoatIncidentValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; incidentId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_incident').updateBoatIncidentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_incidents_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_incidents_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.incidents.destroy': {
    methods: ["DELETE"]
    pattern: '/boats/:boatId/incidents/:incidentId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; incidentId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_incidents_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_incidents_controller').default['destroy']>>>
    }
  }
  'boats.simulator': {
    methods: ["GET","HEAD"]
    pattern: '/boats/:id/simulator'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_simulator_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_simulator_controller').default['show']>>>
    }
  }
  'boats.fuelLogs.store': {
    methods: ["POST"]
    pattern: '/boats/:boatId/fuel-logs'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_fuel_log').createBoatFuelLogValidator)>>
      paramsTuple: [ParamValue]
      params: { boatId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_fuel_log').createBoatFuelLogValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_fuel_logs_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_fuel_logs_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.fuelLogs.destroy': {
    methods: ["DELETE"]
    pattern: '/boats/:boatId/fuel-logs/:logId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; logId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_fuel_logs_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_fuel_logs_controller').default['destroy']>>>
    }
  }
  'boats.navigationLogs.store': {
    methods: ["POST"]
    pattern: '/boats/:boatId/navigation-logs'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/navigation_log').createNavigationLogValidator)>>
      paramsTuple: [ParamValue]
      params: { boatId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/navigation_log').createNavigationLogValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/navigation_logs_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/navigation_logs_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.navigationLogs.update': {
    methods: ["PATCH"]
    pattern: '/boats/:boatId/navigation-logs/:logId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/navigation_log').updateNavigationLogValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; logId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/navigation_log').updateNavigationLogValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/navigation_logs_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/navigation_logs_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.navigationLogs.close': {
    methods: ["PATCH"]
    pattern: '/boats/:boatId/navigation-logs/:logId/close'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/navigation_log').closeNavigationLogValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; logId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/navigation_log').closeNavigationLogValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/navigation_logs_controller').default['close']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/navigation_logs_controller').default['close']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.navigationLogs.destroy': {
    methods: ["DELETE"]
    pattern: '/boats/:boatId/navigation-logs/:logId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; logId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/navigation_logs_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/navigation_logs_controller').default['destroy']>>>
    }
  }
  'boats.navigationLogs.crew.sync': {
    methods: ["PATCH"]
    pattern: '/boats/:boatId/navigation-logs/:logId/crew'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/crew').syncNavigationLogCrewValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; logId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/crew').syncNavigationLogCrewValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/navigation_log_crew_controller').default['sync']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/navigation_log_crew_controller').default['sync']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.navigationLogs.crewRole.download': {
    methods: ["GET","HEAD"]
    pattern: '/boats/:boatId/navigation-logs/:logId/crew-role.pdf'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; logId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/crew_role_pdf_controller').default['download']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/crew_role_pdf_controller').default['download']>>>
    }
  }
  'boats.adminDocuments.store': {
    methods: ["POST"]
    pattern: '/boats/:boatId/admin-documents'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_document').createBoatDocumentValidator)>>
      paramsTuple: [ParamValue]
      params: { boatId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_document').createBoatDocumentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_documents_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_documents_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.adminDocuments.update': {
    methods: ["PUT"]
    pattern: '/boats/:boatId/admin-documents/:documentId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat_document').updateBoatDocumentValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; documentId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat_document').updateBoatDocumentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_documents_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_documents_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'boats.adminDocuments.destroy': {
    methods: ["DELETE"]
    pattern: '/boats/:boatId/admin-documents/:documentId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { boatId: ParamValue; documentId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_documents_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_documents_controller').default['destroy']>>>
    }
  }
  'boats.position.store': {
    methods: ["POST"]
    pattern: '/boats/:boatId/position'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/boat').updateBoatPositionValidator)>>
      paramsTuple: [ParamValue]
      params: { boatId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/boat').updateBoatPositionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/boat_position_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/boat_position_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'ports.index': {
    methods: ["GET","HEAD"]
    pattern: '/ports'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ports_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ports_controller').default['index']>>>
    }
  }
  'ports.create': {
    methods: ["GET","HEAD"]
    pattern: '/ports/new'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ports_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ports_controller').default['create']>>>
    }
  }
  'ports.store': {
    methods: ["POST"]
    pattern: '/ports'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/port').createPortValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/port').createPortValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ports_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ports_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'ports.show': {
    methods: ["GET","HEAD"]
    pattern: '/ports/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ports_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ports_controller').default['show']>>>
    }
  }
  'ports.edit': {
    methods: ["GET","HEAD"]
    pattern: '/ports/:id/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ports_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ports_controller').default['edit']>>>
    }
  }
  'ports.update': {
    methods: ["PUT"]
    pattern: '/ports/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/port').updatePortValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/port').updatePortValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ports_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ports_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'ports.destroy': {
    methods: ["DELETE"]
    pattern: '/ports/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ports_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ports_controller').default['destroy']>>>
    }
  }
  'ports.pontoons.store': {
    methods: ["POST"]
    pattern: '/ports/:portId/pontoons'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/pontoon').createPontoonValidator)>>
      paramsTuple: [ParamValue]
      params: { portId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/pontoon').createPontoonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/pontoons_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/pontoons_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'ports.pontoons.update': {
    methods: ["PUT"]
    pattern: '/ports/:portId/pontoons/:pontoonId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/pontoon').updatePontoonValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { portId: ParamValue; pontoonId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/pontoon').updatePontoonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/pontoons_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/pontoons_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'ports.pontoons.destroy': {
    methods: ["DELETE"]
    pattern: '/ports/:portId/pontoons/:pontoonId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { portId: ParamValue; pontoonId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/pontoons_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/pontoons_controller').default['destroy']>>>
    }
  }
  'ports.mouillages.store': {
    methods: ["POST"]
    pattern: '/ports/:portId/mouillages'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/mouillage').createMouillageValidator)>>
      paramsTuple: [ParamValue]
      params: { portId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/mouillage').createMouillageValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/mouillages_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/mouillages_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'ports.mouillages.update': {
    methods: ["PUT"]
    pattern: '/ports/:portId/mouillages/:mouillageId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/mouillage').updateMouillageValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { portId: ParamValue; mouillageId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/mouillage').updateMouillageValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/mouillages_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/mouillages_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'ports.mouillages.destroy': {
    methods: ["DELETE"]
    pattern: '/ports/:portId/mouillages/:mouillageId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { portId: ParamValue; mouillageId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/mouillages_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/mouillages_controller').default['destroy']>>>
    }
  }
  'ports.pontoons.updatePosition': {
    methods: ["PATCH"]
    pattern: '/ports/:portId/pontoons/:pontoonId/position'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/marina_layout').updatePositionValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { portId: ParamValue; pontoonId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/marina_layout').updatePositionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/pontoons_controller').default['updatePosition']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/pontoons_controller').default['updatePosition']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'ports.mouillages.updatePosition': {
    methods: ["PATCH"]
    pattern: '/ports/:portId/mouillages/:mouillageId/position'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/marina_layout').updatePositionValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { portId: ParamValue; mouillageId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/marina_layout').updatePositionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/mouillages_controller').default['updatePosition']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/mouillages_controller').default['updatePosition']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'ports.pontoons.spots.store': {
    methods: ["POST"]
    pattern: '/ports/:portId/pontoons/:pontoonId/spots'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/spot').createSpotValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { portId: ParamValue; pontoonId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/spot').createSpotValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/spots_controller').default['storeForPontoon']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/spots_controller').default['storeForPontoon']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'ports.mouillages.spots.store': {
    methods: ["POST"]
    pattern: '/ports/:portId/mouillages/:mouillageId/spots'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/spot').createSpotValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { portId: ParamValue; mouillageId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/spot').createSpotValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/spots_controller').default['storeForMouillage']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/spots_controller').default['storeForMouillage']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'spots.update': {
    methods: ["PUT"]
    pattern: '/spots/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/spot').updateSpotValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/spot').updateSpotValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/spots_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/spots_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'spots.destroy': {
    methods: ["DELETE"]
    pattern: '/spots/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/spots_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/spots_controller').default['destroy']>>>
    }
  }
  'home': {
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['home']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['home']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['pricing']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['pricing']>>>
    }
  }
  'marketing.en.simulator': {
    methods: ["GET","HEAD"]
    pattern: '/en/maintenance-cost-simulator'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['simulator']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['simulator']>>>
    }
  }
  'marketing.en.guide': {
    methods: ["GET","HEAD"]
    pattern: '/en/boat-maintenance-cost'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['guide']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['guide']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['home']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['home']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['pricing']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['pricing']>>>
    }
  }
  'marketing.fr.simulator': {
    methods: ["GET","HEAD"]
    pattern: '/fr/simulateur-cout-entretien'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['simulator']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['simulator']>>>
    }
  }
  'marketing.fr.guide': {
    methods: ["GET","HEAD"]
    pattern: '/fr/cout-entretien-bateau'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['guide']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['guide']>>>
    }
  }
  'marketing.en.about': {
    methods: ["GET","HEAD"]
    pattern: '/en/about'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['about']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['about']>>>
    }
  }
  'marketing.fr.about': {
    methods: ["GET","HEAD"]
    pattern: '/fr/a-propos'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['about']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['about']>>>
    }
  }
  'marketing.contact': {
    methods: ["GET","HEAD"]
    pattern: '/contact'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['contact']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/marketing_controller').default['contact']>>>
    }
  }
  'simulator.session': {
    methods: ["POST"]
    pattern: '/simulator/session'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/simulator').simulatorValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/simulator').simulatorValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/simulator_controller').default['saveSession']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/simulator_controller').default['saveSession']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'simulator.create_boat': {
    methods: ["POST"]
    pattern: '/boats/from-simulator'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/simulator').simulatorValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/simulator').simulatorValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/simulator_controller').default['createBoat']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/simulator_controller').default['createBoat']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'simulator.lead': {
    methods: ["POST"]
    pattern: '/simulator/lead'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/simulator_lead').simulatorLeadValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/simulator_lead').simulatorLeadValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/simulator_lead_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/simulator_lead_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'simulator.share.store': {
    methods: ["POST"]
    pattern: '/simulator/share'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/simulator_share').simulatorShareValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/simulator_share').simulatorShareValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/simulator_share_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/simulator_share_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'simulator.share.show.fr': {
    methods: ["GET","HEAD"]
    pattern: '/simulateur/r/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/simulator_share_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/simulator_share_controller').default['show']>>>
    }
  }
  'simulator.share.show.en': {
    methods: ["GET","HEAD"]
    pattern: '/simulator/r/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/simulator_share_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/simulator_share_controller').default['show']>>>
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
  'locale.set': {
    methods: ["POST"]
    pattern: '/locale'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
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
      response: unknown
      errorResponse: unknown
    }
  }
  'settings.me': {
    methods: ["GET","HEAD"]
    pattern: '/settings/me'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['me']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['me']>>>
    }
  }
  'settings.org': {
    methods: ["GET","HEAD"]
    pattern: '/settings/org'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['org']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['org']>>>
    }
  }
  'settings.members': {
    methods: ["GET","HEAD"]
    pattern: '/settings/members'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['members']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['members']>>>
    }
  }
  'settings.billing': {
    methods: ["GET","HEAD"]
    pattern: '/settings/billing'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['billing']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['billing']>>>
    }
  }
  'settings.billing.checkout': {
    methods: ["POST"]
    pattern: '/settings/billing/checkout'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/billing').checkoutValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/billing').checkoutValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['checkout']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['checkout']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'settings.billing.portal': {
    methods: ["POST"]
    pattern: '/settings/billing/portal'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['portal']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['portal']>>>
    }
  }
  'settings.profile.update': {
    methods: ["PUT"]
    pattern: '/settings/profile'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').updateProfileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').updateProfileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['updateProfile']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['updateProfile']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'settings.org.update': {
    methods: ["PUT"]
    pattern: '/settings/org'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').updateOrganizationValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').updateOrganizationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['updateOrganization']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['updateOrganization']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'settings.ai': {
    methods: ["GET","HEAD"]
    pattern: '/settings/ai'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['ai']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['ai']>>>
    }
  }
  'settings.ai.update': {
    methods: ["PUT"]
    pattern: '/settings/ai'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').updateAiSettingsValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').updateAiSettingsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['updateAiSettings']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['updateAiSettings']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'settings.auditLog': {
    methods: ["GET","HEAD"]
    pattern: '/settings/audit-log'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/audit_log').auditLogFiltersValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/audit_logs_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/audit_logs_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'settings.branding': {
    methods: ["GET","HEAD"]
    pattern: '/settings/branding'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['branding']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['branding']>>>
    }
  }
  'settings.branding.update': {
    methods: ["PUT"]
    pattern: '/settings/branding'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/branding').updateBrandingValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/branding').updateBrandingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['updateBranding']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['updateBranding']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'settings.branding.logo.upload': {
    methods: ["POST"]
    pattern: '/settings/branding/logo'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/branding').uploadLogoValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/branding').uploadLogoValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['uploadLogo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['uploadLogo']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'settings.branding.logo.delete': {
    methods: ["DELETE"]
    pattern: '/settings/branding/logo'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['deleteLogo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['deleteLogo']>>>
    }
  }
  'settings.import': {
    methods: ["GET","HEAD"]
    pattern: '/settings/import'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/csv_import_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/csv_import_controller').default['show']>>>
    }
  }
  'settings.import.preview': {
    methods: ["POST"]
    pattern: '/settings/import/preview'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/csv_import').csvPreviewValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/csv_import').csvPreviewValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/csv_import_controller').default['preview']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/csv_import_controller').default['preview']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'settings.import.confirm': {
    methods: ["POST"]
    pattern: '/settings/import/confirm'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/csv_import').csvConfirmValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/csv_import').csvConfirmValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/csv_import_controller').default['confirm']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/csv_import_controller').default['confirm']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'settings.import.cancel': {
    methods: ["POST"]
    pattern: '/settings/import/cancel'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/csv_import_controller').default['cancel']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/csv_import_controller').default['cancel']>>>
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
  'organization.members.index': {
    methods: ["GET","HEAD"]
    pattern: '/organization/members'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organization_members_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organization_members_controller').default['index']>>>
    }
  }
  'organization.members.store': {
    methods: ["POST"]
    pattern: '/organization/members'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/organization_member').inviteMemberValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/organization_member').inviteMemberValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organization_members_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organization_members_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'organization.members.update': {
    methods: ["PUT"]
    pattern: '/organization/members/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/organization_member').updateMemberRoleValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/organization_member').updateMemberRoleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organization_members_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organization_members_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'organization.members.destroy': {
    methods: ["DELETE"]
    pattern: '/organization/members/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organization_members_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organization_members_controller').default['destroy']>>>
    }
  }
  'organization.invitations.store': {
    methods: ["POST"]
    pattern: '/organization/invitations'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/organization_member').inviteMemberValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/organization_member').inviteMemberValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organization_invitations_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organization_invitations_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'organization.invitations.destroy': {
    methods: ["DELETE"]
    pattern: '/organization/invitations/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organization_invitations_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organization_invitations_controller').default['destroy']>>>
    }
  }
  'invitations.show': {
    methods: ["GET","HEAD"]
    pattern: '/invitations/accept'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organization_invitations_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organization_invitations_controller').default['show']>>>
    }
  }
  'invitations.accept': {
    methods: ["POST"]
    pattern: '/invitations/accept'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/organization_member').acceptInvitationValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/organization_member').acceptInvitationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organization_invitations_controller').default['accept']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organization_invitations_controller').default['accept']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'webhooks.stripe': {
    methods: ["POST"]
    pattern: '/webhooks/stripe'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['webhook']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['webhook']>>>
    }
  }
  'mail_previews.index': {
    methods: ["GET","HEAD"]
    pattern: '/dev/mails'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dev/mail_previews_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dev/mail_previews_controller').default['index']>>>
    }
  }
  'mail_previews.show': {
    methods: ["GET","HEAD"]
    pattern: '/dev/mails/:name'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { name: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dev/mail_previews_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dev/mail_previews_controller').default['show']>>>
    }
  }
  'pdf_previews.index': {
    methods: ["GET","HEAD"]
    pattern: '/dev/pdfs'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dev/pdf_previews_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dev/pdf_previews_controller').default['index']>>>
    }
  }
  'pdf_previews.show': {
    methods: ["GET","HEAD"]
    pattern: '/dev/pdfs/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dev/pdf_previews_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dev/pdf_previews_controller').default['show']>>>
    }
  }
  'notifications.index': {
    methods: ["GET","HEAD"]
    pattern: '/notifications'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/notification').notificationPageValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'notifications.markAllAsRead': {
    methods: ["PATCH"]
    pattern: '/notifications/read-all'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['markAllAsRead']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['markAllAsRead']>>>
    }
  }
  'notifications.markAsRead': {
    methods: ["PATCH"]
    pattern: '/notifications/:id/read'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['markAsRead']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['markAsRead']>>>
    }
  }
  'notifications.destroy': {
    methods: ["DELETE"]
    pattern: '/notifications/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/notifications_controller').default['destroy']>>>
    }
  }
  'crew.index': {
    methods: ["GET","HEAD"]
    pattern: '/crew'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/crew_members_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/crew_members_controller').default['index']>>>
    }
  }
  'crew.store': {
    methods: ["POST"]
    pattern: '/crew'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/crew').createCrewMemberValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/crew').createCrewMemberValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/crew_members_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/crew_members_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'crew.update': {
    methods: ["PUT"]
    pattern: '/crew/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/crew').updateCrewMemberValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/crew').updateCrewMemberValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/crew_members_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/crew_members_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'crew.destroy': {
    methods: ["DELETE"]
    pattern: '/crew/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/crew_members_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/crew_members_controller').default['destroy']>>>
    }
  }
  'crew.certifications.store': {
    methods: ["POST"]
    pattern: '/crew/:memberId/certifications'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/crew').createCrewCertificationValidator)>>
      paramsTuple: [ParamValue]
      params: { memberId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/crew').createCrewCertificationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/crew_certifications_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/crew_certifications_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'crew.certifications.destroy': {
    methods: ["DELETE"]
    pattern: '/crew/:memberId/certifications/:certId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { memberId: ParamValue; certId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/crew_certifications_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/crew_certifications_controller').default['destroy']>>>
    }
  }
  'navigation.logbook': {
    methods: ["GET","HEAD"]
    pattern: '/navigation/logbook'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/navigation_controller').default['logbook']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/navigation_controller').default['logbook']>>>
    }
  }
  'navigation.fuel': {
    methods: ["GET","HEAD"]
    pattern: '/navigation/fuel'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/navigation_controller').default['fuel']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/navigation_controller').default['fuel']>>>
    }
  }
  'navigation.incidents': {
    methods: ["GET","HEAD"]
    pattern: '/navigation/incidents'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/navigation_controller').default['incidents']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/navigation_controller').default['incidents']>>>
    }
  }
  'event_stream': {
    methods: ["GET","HEAD"]
    pattern: '/__transmit/events'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'subscribe': {
    methods: ["POST"]
    pattern: '/__transmit/subscribe'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'unsubscribe': {
    methods: ["POST"]
    pattern: '/__transmit/unsubscribe'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
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
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'password.forgot': {
    methods: ["GET","HEAD"]
    pattern: '/forgot-password'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['create']>>>
    }
  }
  'password_reset.store': {
    methods: ["POST"]
    pattern: '/forgot-password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').forgotPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').forgotPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'password.reset': {
    methods: ["GET","HEAD"]
    pattern: '/reset-password'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['edit']>>>
    }
  }
  'password_reset.update': {
    methods: ["POST"]
    pattern: '/reset-password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').resetPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').resetPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
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
      body: ExtractBody<InferInput<(typeof import('#validators/ai').aiChatValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/ai').aiChatValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ai_controller').default['chat']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ai_controller').default['chat']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'ai.fleetAnalysis': {
    methods: ["POST"]
    pattern: '/ai/fleet-analysis'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ai_controller').default['fleetAnalysis']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ai_controller').default['fleetAnalysis']>>>
    }
  }
  'ai.boatSuggestions': {
    methods: ["POST"]
    pattern: '/ai/boats/:id/suggestions'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ai_controller').default['boatSuggestions']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ai_controller').default['boatSuggestions']>>>
    }
  }
  'demo.login': {
    methods: ["POST"]
    pattern: '/demo'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/demo_controller').default['login']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/demo_controller').default['login']>>>
    }
  }
}
