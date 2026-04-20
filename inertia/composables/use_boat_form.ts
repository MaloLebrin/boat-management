import { computed, ref } from 'vue'
import type {
  BoatEditPayload,
  EngineFormRow,
  PropulsionTypeUi,
  RigFormRow,
  SailFormRow,
} from '~/types/boat_form'
import {
  parseEngineFuel,
  parseEngineKind,
  parsePropulsionType,
  parseRigType,
  parseSailType,
} from '~/types/boat_form'

export function createEmptyEngineRow(): EngineFormRow {
  return {
    kind: 'inboard',
    fuel: 'diesel',
    brand: '',
    model: '',
    serialNumber: '',
    powerHp: '',
    hours: '',
  }
}

export function createEmptySailRow(): SailFormRow {
  return { sailType: 'main', areaM2: '', material: '', reefPoints: '' }
}

export function createDefaultRigRow(): RigFormRow {
  return { rigType: 'sloop', mastCount: '', spreaders: '' }
}

export function useBoatForm() {
  const propulsionType = ref<PropulsionTypeUi>('')
  const engines = ref<EngineFormRow[]>([createEmptyEngineRow()])
  const sails = ref<SailFormRow[]>([])
  const rig = ref<RigFormRow>(createDefaultRigRow())

  const showSailFields = computed(() => propulsionType.value === 'sailboat')

  function initEmpty() {
    propulsionType.value = ''
    engines.value = [createEmptyEngineRow()]
    sails.value = []
    rig.value = createDefaultRigRow()
  }

  function initFromBoat(boat: BoatEditPayload) {
    propulsionType.value = parsePropulsionType(boat.propulsionType)

    engines.value = boat.engines.length
      ? boat.engines.map((e) => ({
          kind: parseEngineKind(e.kind),
          fuel: parseEngineFuel(e.fuel),
          brand: e.brand ?? '',
          model: e.model ?? '',
          serialNumber: e.serialNumber ?? '',
          powerHp: e.powerHp === null ? '' : String(e.powerHp),
          hours: e.hours === null ? '' : String(e.hours),
        }))
      : [createEmptyEngineRow()]

    sails.value = boat.sails.map((s) => ({
      sailType: parseSailType(s.sailType),
      areaM2: s.areaM2 === null ? '' : String(s.areaM2),
      material: s.material ?? '',
      reefPoints: s.reefPoints === null ? '' : String(s.reefPoints),
    }))

    rig.value = {
      rigType: parseRigType(boat.rig?.rigType ?? 'sloop'),
      mastCount:
        boat.rig?.mastCount === null || boat.rig?.mastCount === undefined
          ? ''
          : String(boat.rig.mastCount),
      spreaders:
        boat.rig?.spreaders === null || boat.rig?.spreaders === undefined
          ? ''
          : String(boat.rig.spreaders),
    }
  }

  function addEngine() {
    engines.value.push(createEmptyEngineRow())
  }

  function removeEngine(index: number) {
    if (engines.value.length > 1) engines.value.splice(index, 1)
  }

  function addSail() {
    sails.value.push(createEmptySailRow())
  }

  function removeSail(index: number) {
    sails.value.splice(index, 1)
  }

  return {
    propulsionType,
    engines,
    sails,
    rig,
    showSailFields,
    initEmpty,
    initFromBoat,
    addEngine,
    removeEngine,
    addSail,
    removeSail,
  }
}
