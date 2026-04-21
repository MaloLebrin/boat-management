/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'home': {
    methods: ["GET","HEAD"],
    pattern: '/',
    tokens: [{"old":"/","type":0,"val":"/","end":""}],
    types: placeholder as Registry['home']['types'],
  },
  'design_system': {
    methods: ["GET","HEAD"],
    pattern: '/design-system',
    tokens: [{"old":"/design-system","type":0,"val":"design-system","end":""}],
    types: placeholder as Registry['design_system']['types'],
  },
  'boats.index': {
    methods: ["GET","HEAD"],
    pattern: '/boats',
    tokens: [{"old":"/boats","type":0,"val":"boats","end":""}],
    types: placeholder as Registry['boats.index']['types'],
  },
  'boats.create': {
    methods: ["GET","HEAD"],
    pattern: '/boats/new',
    tokens: [{"old":"/boats/new","type":0,"val":"boats","end":""},{"old":"/boats/new","type":0,"val":"new","end":""}],
    types: placeholder as Registry['boats.create']['types'],
  },
  'boats.store': {
    methods: ["POST"],
    pattern: '/boats',
    tokens: [{"old":"/boats","type":0,"val":"boats","end":""}],
    types: placeholder as Registry['boats.store']['types'],
  },
  'boats.show': {
    methods: ["GET","HEAD"],
    pattern: '/boats/:id',
    tokens: [{"old":"/boats/:id","type":0,"val":"boats","end":""},{"old":"/boats/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['boats.show']['types'],
  },
  'boats.edit': {
    methods: ["GET","HEAD"],
    pattern: '/boats/:id/edit',
    tokens: [{"old":"/boats/:id/edit","type":0,"val":"boats","end":""},{"old":"/boats/:id/edit","type":1,"val":"id","end":""},{"old":"/boats/:id/edit","type":0,"val":"edit","end":""}],
    types: placeholder as Registry['boats.edit']['types'],
  },
  'boats.update': {
    methods: ["PUT"],
    pattern: '/boats/:id',
    tokens: [{"old":"/boats/:id","type":0,"val":"boats","end":""},{"old":"/boats/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['boats.update']['types'],
  },
  'boats.destroy': {
    methods: ["DELETE"],
    pattern: '/boats/:id',
    tokens: [{"old":"/boats/:id","type":0,"val":"boats","end":""},{"old":"/boats/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['boats.destroy']['types'],
  },
  'boat_equipment.store_engine': {
    methods: ["POST"],
    pattern: '/boats/:boatId/engines',
    tokens: [{"old":"/boats/:boatId/engines","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/engines","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/engines","type":0,"val":"engines","end":""}],
    types: placeholder as Registry['boat_equipment.store_engine']['types'],
  },
  'boat_equipment.edit_engine': {
    methods: ["GET","HEAD"],
    pattern: '/boats/:boatId/engines/:engineId/edit',
    tokens: [{"old":"/boats/:boatId/engines/:engineId/edit","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/engines/:engineId/edit","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/engines/:engineId/edit","type":0,"val":"engines","end":""},{"old":"/boats/:boatId/engines/:engineId/edit","type":1,"val":"engineId","end":""},{"old":"/boats/:boatId/engines/:engineId/edit","type":0,"val":"edit","end":""}],
    types: placeholder as Registry['boat_equipment.edit_engine']['types'],
  },
  'boat_equipment.update_engine': {
    methods: ["PUT"],
    pattern: '/boats/:boatId/engines/:engineId',
    tokens: [{"old":"/boats/:boatId/engines/:engineId","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/engines/:engineId","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/engines/:engineId","type":0,"val":"engines","end":""},{"old":"/boats/:boatId/engines/:engineId","type":1,"val":"engineId","end":""}],
    types: placeholder as Registry['boat_equipment.update_engine']['types'],
  },
  'boat_equipment.destroy_engine': {
    methods: ["DELETE"],
    pattern: '/boats/:boatId/engines/:engineId',
    tokens: [{"old":"/boats/:boatId/engines/:engineId","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/engines/:engineId","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/engines/:engineId","type":0,"val":"engines","end":""},{"old":"/boats/:boatId/engines/:engineId","type":1,"val":"engineId","end":""}],
    types: placeholder as Registry['boat_equipment.destroy_engine']['types'],
  },
  'boat_equipment.store_sail': {
    methods: ["POST"],
    pattern: '/boats/:boatId/sails',
    tokens: [{"old":"/boats/:boatId/sails","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/sails","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/sails","type":0,"val":"sails","end":""}],
    types: placeholder as Registry['boat_equipment.store_sail']['types'],
  },
  'boat_equipment.edit_sail': {
    methods: ["GET","HEAD"],
    pattern: '/boats/:boatId/sails/:sailId/edit',
    tokens: [{"old":"/boats/:boatId/sails/:sailId/edit","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/sails/:sailId/edit","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/sails/:sailId/edit","type":0,"val":"sails","end":""},{"old":"/boats/:boatId/sails/:sailId/edit","type":1,"val":"sailId","end":""},{"old":"/boats/:boatId/sails/:sailId/edit","type":0,"val":"edit","end":""}],
    types: placeholder as Registry['boat_equipment.edit_sail']['types'],
  },
  'boat_equipment.update_sail': {
    methods: ["PUT"],
    pattern: '/boats/:boatId/sails/:sailId',
    tokens: [{"old":"/boats/:boatId/sails/:sailId","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/sails/:sailId","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/sails/:sailId","type":0,"val":"sails","end":""},{"old":"/boats/:boatId/sails/:sailId","type":1,"val":"sailId","end":""}],
    types: placeholder as Registry['boat_equipment.update_sail']['types'],
  },
  'boat_equipment.destroy_sail': {
    methods: ["DELETE"],
    pattern: '/boats/:boatId/sails/:sailId',
    tokens: [{"old":"/boats/:boatId/sails/:sailId","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/sails/:sailId","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/sails/:sailId","type":0,"val":"sails","end":""},{"old":"/boats/:boatId/sails/:sailId","type":1,"val":"sailId","end":""}],
    types: placeholder as Registry['boat_equipment.destroy_sail']['types'],
  },
  'boat_equipment.edit_rig': {
    methods: ["GET","HEAD"],
    pattern: '/boats/:boatId/rig/edit',
    tokens: [{"old":"/boats/:boatId/rig/edit","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/rig/edit","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/rig/edit","type":0,"val":"rig","end":""},{"old":"/boats/:boatId/rig/edit","type":0,"val":"edit","end":""}],
    types: placeholder as Registry['boat_equipment.edit_rig']['types'],
  },
  'boat_equipment.upsert_rig': {
    methods: ["PUT"],
    pattern: '/boats/:boatId/rig',
    tokens: [{"old":"/boats/:boatId/rig","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/rig","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/rig","type":0,"val":"rig","end":""}],
    types: placeholder as Registry['boat_equipment.upsert_rig']['types'],
  },
  'boat_equipment.destroy_rig': {
    methods: ["DELETE"],
    pattern: '/boats/:boatId/rig',
    tokens: [{"old":"/boats/:boatId/rig","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/rig","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/rig","type":0,"val":"rig","end":""}],
    types: placeholder as Registry['boat_equipment.destroy_rig']['types'],
  },
  'boat_maintenances.store': {
    methods: ["POST"],
    pattern: '/boats/:boatId/maintenance',
    tokens: [{"old":"/boats/:boatId/maintenance","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/maintenance","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/maintenance","type":0,"val":"maintenance","end":""}],
    types: placeholder as Registry['boat_maintenances.store']['types'],
  },
  'boat_maintenances.destroy': {
    methods: ["DELETE"],
    pattern: '/boats/:boatId/maintenance/:eventId',
    tokens: [{"old":"/boats/:boatId/maintenance/:eventId","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/maintenance/:eventId","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/maintenance/:eventId","type":0,"val":"maintenance","end":""},{"old":"/boats/:boatId/maintenance/:eventId","type":1,"val":"eventId","end":""}],
    types: placeholder as Registry['boat_maintenances.destroy']['types'],
  },
  'boats.maintenanceTasks.store': {
    methods: ["POST"],
    pattern: '/boats/:boatId/maintenance-tasks',
    tokens: [{"old":"/boats/:boatId/maintenance-tasks","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/maintenance-tasks","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/maintenance-tasks","type":0,"val":"maintenance-tasks","end":""}],
    types: placeholder as Registry['boats.maintenanceTasks.store']['types'],
  },
  'boats.maintenanceTasks.done': {
    methods: ["PUT"],
    pattern: '/boats/:boatId/maintenance-tasks/:taskId/done',
    tokens: [{"old":"/boats/:boatId/maintenance-tasks/:taskId/done","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/maintenance-tasks/:taskId/done","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/maintenance-tasks/:taskId/done","type":0,"val":"maintenance-tasks","end":""},{"old":"/boats/:boatId/maintenance-tasks/:taskId/done","type":1,"val":"taskId","end":""},{"old":"/boats/:boatId/maintenance-tasks/:taskId/done","type":0,"val":"done","end":""}],
    types: placeholder as Registry['boats.maintenanceTasks.done']['types'],
  },
  'boats.maintenanceTasks.destroy': {
    methods: ["DELETE"],
    pattern: '/boats/:boatId/maintenance-tasks/:taskId',
    tokens: [{"old":"/boats/:boatId/maintenance-tasks/:taskId","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/maintenance-tasks/:taskId","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/maintenance-tasks/:taskId","type":0,"val":"maintenance-tasks","end":""},{"old":"/boats/:boatId/maintenance-tasks/:taskId","type":1,"val":"taskId","end":""}],
    types: placeholder as Registry['boats.maintenanceTasks.destroy']['types'],
  },
  'new_account.create': {
    methods: ["GET","HEAD"],
    pattern: '/signup',
    tokens: [{"old":"/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['new_account.create']['types'],
  },
  'new_account.store': {
    methods: ["POST"],
    pattern: '/signup',
    tokens: [{"old":"/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['new_account.store']['types'],
  },
  'session.create': {
    methods: ["GET","HEAD"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['session.create']['types'],
  },
  'session.store': {
    methods: ["POST"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['session.store']['types'],
  },
  'session.destroy': {
    methods: ["POST"],
    pattern: '/logout',
    tokens: [{"old":"/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['session.destroy']['types'],
  },
  'ai.chat': {
    methods: ["POST"],
    pattern: '/ai/chat',
    tokens: [{"old":"/ai/chat","type":0,"val":"ai","end":""},{"old":"/ai/chat","type":0,"val":"chat","end":""}],
    types: placeholder as Registry['ai.chat']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
