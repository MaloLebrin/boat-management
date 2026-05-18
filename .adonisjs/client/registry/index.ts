/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'design_system': {
    methods: ["GET","HEAD"],
    pattern: '/design-system',
    tokens: [{"old":"/design-system","type":0,"val":"design-system","end":""}],
    types: placeholder as Registry['design_system']['types'],
  },
  'sitemap': {
    methods: ["GET","HEAD"],
    pattern: '/sitemap.xml',
    tokens: [{"old":"/sitemap.xml","type":0,"val":"sitemap.xml","end":""}],
    types: placeholder as Registry['sitemap']['types'],
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
  'boats.engines.show': {
    methods: ["GET","HEAD"],
    pattern: '/boats/:boatId/engines/:engineId',
    tokens: [{"old":"/boats/:boatId/engines/:engineId","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/engines/:engineId","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/engines/:engineId","type":0,"val":"engines","end":""},{"old":"/boats/:boatId/engines/:engineId","type":1,"val":"engineId","end":""}],
    types: placeholder as Registry['boats.engines.show']['types'],
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
  'boat_equipment.update_engine_status': {
    methods: ["PATCH"],
    pattern: '/boats/:boatId/engines/:engineId/status',
    tokens: [{"old":"/boats/:boatId/engines/:engineId/status","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/engines/:engineId/status","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/engines/:engineId/status","type":0,"val":"engines","end":""},{"old":"/boats/:boatId/engines/:engineId/status","type":1,"val":"engineId","end":""},{"old":"/boats/:boatId/engines/:engineId/status","type":0,"val":"status","end":""}],
    types: placeholder as Registry['boat_equipment.update_engine_status']['types'],
  },
  'boat_equipment.update_engine_notes': {
    methods: ["PATCH"],
    pattern: '/boats/:boatId/engines/:engineId/notes',
    tokens: [{"old":"/boats/:boatId/engines/:engineId/notes","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/engines/:engineId/notes","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/engines/:engineId/notes","type":0,"val":"engines","end":""},{"old":"/boats/:boatId/engines/:engineId/notes","type":1,"val":"engineId","end":""},{"old":"/boats/:boatId/engines/:engineId/notes","type":0,"val":"notes","end":""}],
    types: placeholder as Registry['boat_equipment.update_engine_notes']['types'],
  },
  'boat_equipment.destroy_engine': {
    methods: ["DELETE"],
    pattern: '/boats/:boatId/engines/:engineId',
    tokens: [{"old":"/boats/:boatId/engines/:engineId","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/engines/:engineId","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/engines/:engineId","type":0,"val":"engines","end":""},{"old":"/boats/:boatId/engines/:engineId","type":1,"val":"engineId","end":""}],
    types: placeholder as Registry['boat_equipment.destroy_engine']['types'],
  },
  'boat_media.store_engine_document': {
    methods: ["POST"],
    pattern: '/boats/:boatId/engines/:engineId/documents',
    tokens: [{"old":"/boats/:boatId/engines/:engineId/documents","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/engines/:engineId/documents","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/engines/:engineId/documents","type":0,"val":"engines","end":""},{"old":"/boats/:boatId/engines/:engineId/documents","type":1,"val":"engineId","end":""},{"old":"/boats/:boatId/engines/:engineId/documents","type":0,"val":"documents","end":""}],
    types: placeholder as Registry['boat_media.store_engine_document']['types'],
  },
  'boat_media.destroy_engine_media': {
    methods: ["DELETE"],
    pattern: '/boats/:boatId/engines/:engineId/media/:mediaId',
    tokens: [{"old":"/boats/:boatId/engines/:engineId/media/:mediaId","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/engines/:engineId/media/:mediaId","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/engines/:engineId/media/:mediaId","type":0,"val":"engines","end":""},{"old":"/boats/:boatId/engines/:engineId/media/:mediaId","type":1,"val":"engineId","end":""},{"old":"/boats/:boatId/engines/:engineId/media/:mediaId","type":0,"val":"media","end":""},{"old":"/boats/:boatId/engines/:engineId/media/:mediaId","type":1,"val":"mediaId","end":""}],
    types: placeholder as Registry['boat_media.destroy_engine_media']['types'],
  },
  'boat_engine_parts.store': {
    methods: ["POST"],
    pattern: '/boats/:boatId/engines/:engineId/parts',
    tokens: [{"old":"/boats/:boatId/engines/:engineId/parts","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/engines/:engineId/parts","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/engines/:engineId/parts","type":0,"val":"engines","end":""},{"old":"/boats/:boatId/engines/:engineId/parts","type":1,"val":"engineId","end":""},{"old":"/boats/:boatId/engines/:engineId/parts","type":0,"val":"parts","end":""}],
    types: placeholder as Registry['boat_engine_parts.store']['types'],
  },
  'boat_engine_parts.update': {
    methods: ["PUT"],
    pattern: '/boats/:boatId/engines/:engineId/parts/:partId',
    tokens: [{"old":"/boats/:boatId/engines/:engineId/parts/:partId","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/engines/:engineId/parts/:partId","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/engines/:engineId/parts/:partId","type":0,"val":"engines","end":""},{"old":"/boats/:boatId/engines/:engineId/parts/:partId","type":1,"val":"engineId","end":""},{"old":"/boats/:boatId/engines/:engineId/parts/:partId","type":0,"val":"parts","end":""},{"old":"/boats/:boatId/engines/:engineId/parts/:partId","type":1,"val":"partId","end":""}],
    types: placeholder as Registry['boat_engine_parts.update']['types'],
  },
  'boat_engine_parts.destroy': {
    methods: ["DELETE"],
    pattern: '/boats/:boatId/engines/:engineId/parts/:partId',
    tokens: [{"old":"/boats/:boatId/engines/:engineId/parts/:partId","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/engines/:engineId/parts/:partId","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/engines/:engineId/parts/:partId","type":0,"val":"engines","end":""},{"old":"/boats/:boatId/engines/:engineId/parts/:partId","type":1,"val":"engineId","end":""},{"old":"/boats/:boatId/engines/:engineId/parts/:partId","type":0,"val":"parts","end":""},{"old":"/boats/:boatId/engines/:engineId/parts/:partId","type":1,"val":"partId","end":""}],
    types: placeholder as Registry['boat_engine_parts.destroy']['types'],
  },
  'boat_media.download_media': {
    methods: ["GET","HEAD"],
    pattern: '/boats/:boatId/media/:mediaId/download',
    tokens: [{"old":"/boats/:boatId/media/:mediaId/download","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/media/:mediaId/download","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/media/:mediaId/download","type":0,"val":"media","end":""},{"old":"/boats/:boatId/media/:mediaId/download","type":1,"val":"mediaId","end":""},{"old":"/boats/:boatId/media/:mediaId/download","type":0,"val":"download","end":""}],
    types: placeholder as Registry['boat_media.download_media']['types'],
  },
  'boat_media.download_engine_media': {
    methods: ["GET","HEAD"],
    pattern: '/boats/:boatId/engines/:engineId/media/:mediaId/download',
    tokens: [{"old":"/boats/:boatId/engines/:engineId/media/:mediaId/download","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/engines/:engineId/media/:mediaId/download","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/engines/:engineId/media/:mediaId/download","type":0,"val":"engines","end":""},{"old":"/boats/:boatId/engines/:engineId/media/:mediaId/download","type":1,"val":"engineId","end":""},{"old":"/boats/:boatId/engines/:engineId/media/:mediaId/download","type":0,"val":"media","end":""},{"old":"/boats/:boatId/engines/:engineId/media/:mediaId/download","type":1,"val":"mediaId","end":""},{"old":"/boats/:boatId/engines/:engineId/media/:mediaId/download","type":0,"val":"download","end":""}],
    types: placeholder as Registry['boat_media.download_engine_media']['types'],
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
  'boat_media.store_photo': {
    methods: ["POST"],
    pattern: '/boats/:boatId/photos',
    tokens: [{"old":"/boats/:boatId/photos","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/photos","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/photos","type":0,"val":"photos","end":""}],
    types: placeholder as Registry['boat_media.store_photo']['types'],
  },
  'boat_media.store_document': {
    methods: ["POST"],
    pattern: '/boats/:boatId/documents',
    tokens: [{"old":"/boats/:boatId/documents","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/documents","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/documents","type":0,"val":"documents","end":""}],
    types: placeholder as Registry['boat_media.store_document']['types'],
  },
  'boat_media.destroy': {
    methods: ["DELETE"],
    pattern: '/boats/:boatId/media/:mediaId',
    tokens: [{"old":"/boats/:boatId/media/:mediaId","type":0,"val":"boats","end":""},{"old":"/boats/:boatId/media/:mediaId","type":1,"val":"boatId","end":""},{"old":"/boats/:boatId/media/:mediaId","type":0,"val":"media","end":""},{"old":"/boats/:boatId/media/:mediaId","type":1,"val":"mediaId","end":""}],
    types: placeholder as Registry['boat_media.destroy']['types'],
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
  'password.forgot': {
    methods: ["GET","HEAD"],
    pattern: '/forgot-password',
    tokens: [{"old":"/forgot-password","type":0,"val":"forgot-password","end":""}],
    types: placeholder as Registry['password.forgot']['types'],
  },
  'password_reset.store': {
    methods: ["POST"],
    pattern: '/forgot-password',
    tokens: [{"old":"/forgot-password","type":0,"val":"forgot-password","end":""}],
    types: placeholder as Registry['password_reset.store']['types'],
  },
  'password.reset': {
    methods: ["GET","HEAD"],
    pattern: '/reset-password',
    tokens: [{"old":"/reset-password","type":0,"val":"reset-password","end":""}],
    types: placeholder as Registry['password.reset']['types'],
  },
  'password_reset.update': {
    methods: ["POST"],
    pattern: '/reset-password',
    tokens: [{"old":"/reset-password","type":0,"val":"reset-password","end":""}],
    types: placeholder as Registry['password_reset.update']['types'],
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
  'root': {
    methods: ["GET","HEAD"],
    pattern: '/',
    tokens: [{"old":"/","type":0,"val":"/","end":""}],
    types: placeholder as Registry['root']['types'],
  },
  'marketing.en.home': {
    methods: ["GET","HEAD"],
    pattern: '/en',
    tokens: [{"old":"/en","type":0,"val":"en","end":""}],
    types: placeholder as Registry['marketing.en.home']['types'],
  },
  'marketing.en.pricing': {
    methods: ["GET","HEAD"],
    pattern: '/en/tarifs',
    tokens: [{"old":"/en/tarifs","type":0,"val":"en","end":""},{"old":"/en/tarifs","type":0,"val":"tarifs","end":""}],
    types: placeholder as Registry['marketing.en.pricing']['types'],
  },
  'marketing.fr.home': {
    methods: ["GET","HEAD"],
    pattern: '/fr',
    tokens: [{"old":"/fr","type":0,"val":"fr","end":""}],
    types: placeholder as Registry['marketing.fr.home']['types'],
  },
  'marketing.fr.pricing': {
    methods: ["GET","HEAD"],
    pattern: '/fr/tarifs',
    tokens: [{"old":"/fr/tarifs","type":0,"val":"fr","end":""},{"old":"/fr/tarifs","type":0,"val":"tarifs","end":""}],
    types: placeholder as Registry['marketing.fr.pricing']['types'],
  },
  'marketing.en.about': {
    methods: ["GET","HEAD"],
    pattern: '/en/about',
    tokens: [{"old":"/en/about","type":0,"val":"en","end":""},{"old":"/en/about","type":0,"val":"about","end":""}],
    types: placeholder as Registry['marketing.en.about']['types'],
  },
  'marketing.fr.about': {
    methods: ["GET","HEAD"],
    pattern: '/fr/a-propos',
    tokens: [{"old":"/fr/a-propos","type":0,"val":"fr","end":""},{"old":"/fr/a-propos","type":0,"val":"a-propos","end":""}],
    types: placeholder as Registry['marketing.fr.about']['types'],
  },
  'marketing.contact': {
    methods: ["GET","HEAD"],
    pattern: '/contact',
    tokens: [{"old":"/contact","type":0,"val":"contact","end":""}],
    types: placeholder as Registry['marketing.contact']['types'],
  },
  'dashboard': {
    methods: ["GET","HEAD"],
    pattern: '/dashboard',
    tokens: [{"old":"/dashboard","type":0,"val":"dashboard","end":""}],
    types: placeholder as Registry['dashboard']['types'],
  },
  'planning.index': {
    methods: ["GET","HEAD"],
    pattern: '/planning',
    tokens: [{"old":"/planning","type":0,"val":"planning","end":""}],
    types: placeholder as Registry['planning.index']['types'],
  },
  'settings.index': {
    methods: ["GET","HEAD"],
    pattern: '/settings',
    tokens: [{"old":"/settings","type":0,"val":"settings","end":""}],
    types: placeholder as Registry['settings.index']['types'],
  },
  'settings.profile.update': {
    methods: ["PUT"],
    pattern: '/settings/profile',
    tokens: [{"old":"/settings/profile","type":0,"val":"settings","end":""},{"old":"/settings/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['settings.profile.update']['types'],
  },
  'settings.org.update': {
    methods: ["PUT"],
    pattern: '/settings/org',
    tokens: [{"old":"/settings/org","type":0,"val":"settings","end":""},{"old":"/settings/org","type":0,"val":"org","end":""}],
    types: placeholder as Registry['settings.org.update']['types'],
  },
  'locale.set': {
    methods: ["POST"],
    pattern: '/locale',
    tokens: [{"old":"/locale","type":0,"val":"locale","end":""}],
    types: placeholder as Registry['locale.set']['types'],
  },
  'maintenance.history': {
    methods: ["GET","HEAD"],
    pattern: '/maintenance/history',
    tokens: [{"old":"/maintenance/history","type":0,"val":"maintenance","end":""},{"old":"/maintenance/history","type":0,"val":"history","end":""}],
    types: placeholder as Registry['maintenance.history']['types'],
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
