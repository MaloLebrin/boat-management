import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import BoatShowTabTasks from '../../inertia/components/boats/show/tabs/BoatShowTabTasks.vue'
import type { BoatShowDetail, MaintenanceTaskRow } from '../../inertia/types/boat_show'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string) => key,
    locale: { value: 'en' },
  }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: {
    template: '<form @submit.prevent><slot :processing="false" /></form>',
  },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: { template: '<button><slot /></button>' },
}))

// Stub reproducing the panel's own empty-state contract (`tasks.empty` when
// there is no open task) so the interaction between the two empty states
// can be verified without pulling in the panel's full form logic.
vi.mock('~/components/boats/maintenance/BoatMaintenanceTasksPanel.vue', () => ({
  default: {
    props: ['tasks'],
    template:
      '<div>{{ tasks.filter((t) => t.status === "open").length === 0 ? "boats.maintenance.tasks.empty" : "PANEL_LIST" }}</div>',
  },
}))

const minimalBoat: BoatShowDetail = {
  id: 10,
  name: 'Test Boat',
  registrationNumber: null,
  type: null,
  propulsionType: null,
  lengthM: null,
  beamM: null,
  draftM: null,
  mastHeightM: null,
  hullMaterial: null,
  yearBuilt: null,
  manufacturer: null,
  model: null,
  homePort: null,
  navigationCategory: null,
  hullIdentificationNumber: null,
  francisationNumber: null,
  flagCountry: null,
  maxPersons: null,
  mmsi: null,
  imoNumber: null,
  spotId: null,
  spot: null,
  positionHistory: [],
  engines: [],
  sails: [],
  rig: null,
  media: [],
  safetyEquipment: [],
  genericEquipment: [],
}

const openTask: MaintenanceTaskRow = {
  id: 1,
  subject: 'boat',
  title: 'Change oil',
  notes: null,
  status: 'open',
  dueAt: null,
  dueEngineHours: null,
  boatEngineId: null,
  boatSailId: null,
  boatRigId: null,
  recurrenceIntervalMonths: null,
  recurrenceIntervalEngineHours: null,
}

test('shows only the panel empty state when there is no maintenance task at all', () => {
  const w = mount(BoatShowTabTasks, {
    props: { boat: minimalBoat, maintenanceTasks: [], canManageMaintenance: true },
  })
  const occurrences = w.text().split('boats.maintenance.tasks.empty').length - 1
  expect(occurrences).toBe(1)
  expect(w.text()).not.toContain('boats.maintenance.tasks.emptyFiltered')
})

test('shows the "no match" empty state when the active filter excludes existing open tasks', async () => {
  const w = mount(BoatShowTabTasks, {
    props: { boat: minimalBoat, maintenanceTasks: [openTask], canManageMaintenance: true },
  })
  const undatedFilterButton = w
    .findAll('button')
    .find((b) => b.text().includes('boats.show.tasksFilter.overdue'))
  await undatedFilterButton?.trigger('click')
  expect(w.text()).toContain('boats.maintenance.tasks.emptyFiltered')
  expect(w.text()).toContain('PANEL_LIST')
})

const overdueTask: MaintenanceTaskRow = {
  ...openTask,
  id: 2,
  title: 'Vidange',
  dueAt: '2020-01-01',
  notes: 'Filtre à changer',
}

const soonTask: MaintenanceTaskRow = {
  ...openTask,
  id: 3,
  title: 'Gréement',
  dueAt: new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10),
}

// #407 — un seul libellé de clôture (« markDone »), plus de texte codé en dur.
test('unifies the close-task label on markDone and shows delete + notes', () => {
  const w = mount(BoatShowTabTasks, {
    props: { boat: minimalBoat, maintenanceTasks: [overdueTask], canManageMaintenance: true },
  })
  const text = w.text()
  expect(text).toContain('boats.maintenance.tasks.markDone')
  expect(text).not.toContain('Marquer fait')
  expect(text).not.toContain('boats.maintenance.tasks.done')
  expect(text).toContain('Filtre à changer')
  // Chaque tâche expose l'action « fait » et l'action « supprimer ».
  expect(w.findAll('form')).toHaveLength(2)
})

// #407 — le libellé « bientôt dû » passe par la clé de statut unifiée.
test('uses the unified due-soon status key for the soon section header', () => {
  const w = mount(BoatShowTabTasks, {
    props: { boat: minimalBoat, maintenanceTasks: [soonTask], canManageMaintenance: true },
  })
  const text = w.text()
  expect(text).toContain('boats.show.status.dueSoon')
  expect(text).not.toContain('A venir bientot')
})
