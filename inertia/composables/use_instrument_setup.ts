import { router } from '@inertiajs/vue3'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { BoatShowEngine } from '~/types/boat_show'
import {
  INSTRUMENT_SETUP_POLL_INTERVAL_MS,
  INSTRUMENT_SETUP_POLL_MAX_MS,
  INSTRUMENT_SETUP_RECENT_MS,
  INSTRUMENT_SETUP_STORAGE_PREFIX,
} from '#shared/constants/instruments'
import type {
  InstrumentSetupHardware,
  InstrumentSetupPath,
  InstrumentSetupStep,
  InstrumentSetupStepKey,
  InstrumentSetupStored,
  InstrumentSourceRow,
} from '#shared/types/instruments'

export interface InstrumentSetupOptions {
  boatId: () => number
  source: () => InstrumentSourceRow | null
  engines: () => BoatShowEngine[]
  /** Chemins des dernières valeurs connues (`propulsion.<id>.…` révèle les moteurs). */
  latestPaths: () => string[]
  /** Identifiants de moteurs vus par la sonde de l'étape « Application ». */
  probedEngineIds: () => string[]
  /** Le flux du navigateur est ouvert : la connexion est avérée sans attendre un lot. */
  streamOpen: () => boolean
  now?: () => number
}

const EMPTY: InstrumentSetupStored = {
  hardware: null,
  path: null,
  dismissed: false,
  pendingTest: false,
}

function storageKey(boatId: number): string {
  return `${INSTRUMENT_SETUP_STORAGE_PREFIX}${boatId}`
}

/** Lecture protégée : stockage absent, bloqué ou corrompu → état vide. */
export function readSetupStorage(boatId: number): InstrumentSetupStored {
  try {
    const raw = window.localStorage.getItem(storageKey(boatId))
    if (!raw) return { ...EMPTY }
    const data = JSON.parse(raw) as Partial<InstrumentSetupStored>
    return {
      hardware: ['none', 'cerbo', 'signalk'].includes(data.hardware ?? '')
        ? (data.hardware as InstrumentSetupHardware)
        : null,
      path: data.path === 'plugin' || data.path === 'app' ? data.path : null,
      dismissed: data.dismissed === true,
      pendingTest: data.pendingTest === true,
    }
  } catch {
    return { ...EMPTY }
  }
}

function writeSetupStorage(boatId: number, value: InstrumentSetupStored) {
  try {
    window.localStorage.setItem(storageKey(boatId), JSON.stringify(value))
  } catch {
    // Stockage indisponible : l'assistant fonctionne, sans mémoire.
  }
}

const ENGINE_PATH_RE = /^propulsion\.([^.]+)\./

/**
 * État de l'assistant « Connecter mon bateau » (#1023). La progression est
 * **dérivée des données** (source, jeton, `lastSeenAt`, moteurs reliés) ;
 * `localStorage` ne garde que les choix (matériel, chemin) et deux drapeaux.
 * Le stockage n'est lu qu'au montage : le rendu serveur et le premier rendu
 * client sont identiques.
 */
export function useInstrumentSetup(options: InstrumentSetupOptions) {
  const now = options.now ?? (() => Date.now())
  const stored = ref<InstrumentSetupStored>({ ...EMPTY })
  const clock = ref(now())
  const override = ref<InstrumentSetupStepKey | null>(null)

  function update(patch: Partial<InstrumentSetupStored>) {
    stored.value = { ...stored.value, ...patch }
    writeSetupStorage(options.boatId(), stored.value)
  }

  onMounted(() => {
    stored.value = readSetupStorage(options.boatId())
    clock.value = now()
  })

  const source = computed(() => options.source())
  const hasSource = computed(() => source.value !== null)
  const hasToken = computed(() => Boolean(source.value?.hasIngestToken))
  const lastSeenMs = computed(() => {
    const iso = source.value?.lastSeenAt
    return iso ? Date.parse(iso) : null
  })

  /** Un lot récent est arrivé, ou le flux du navigateur est ouvert. */
  const connected = computed(
    () =>
      (hasSource.value && options.streamOpen()) ||
      (lastSeenMs.value !== null && clock.value - lastSeenMs.value <= INSTRUMENT_SETUP_RECENT_MS)
  )

  /** Chemin choisi, ou déduit d'une source déjà posée avant l'assistant. */
  const path = computed<InstrumentSetupPath | null>(
    () => stored.value.path ?? (hasToken.value ? 'plugin' : hasSource.value ? 'app' : null)
  )

  const detectedEngineIds = computed(() => {
    const ids = new Set(options.probedEngineIds())
    for (const p of options.latestPaths()) {
      const id = ENGINE_PATH_RE.exec(p)?.[1]
      if (id) ids.add(id)
    }
    return [...ids].sort()
  })

  /** Passable sans moteur : rien à relier, ou tous reliés. */
  const enginesLinked = computed(() => {
    const engines = options.engines()
    return engines.length === 0 || engines.every((engine) => Boolean(engine.instrumentKey))
  })

  const completed = computed(() => connected.value && enginesLinked.value)

  const steps = computed<InstrumentSetupStep[]>(() => [
    { key: 'hardware', done: stored.value.hardware !== null || hasSource.value },
    { key: 'path', done: path.value !== null },
    { key: 'connect', done: connected.value },
    { key: 'engines', done: connected.value && enginesLinked.value },
    { key: 'done', done: completed.value },
  ])

  const currentStep = computed<InstrumentSetupStepKey>(
    () => steps.value.find((step) => !step.done)?.key ?? 'done'
  )
  const openStep = computed(() => override.value ?? currentStep.value)

  function openStepManually(key: InstrumentSetupStepKey) {
    override.value = key
  }

  // L'étape courante reprend la main dès qu'elle avance.
  watch(currentStep, () => (override.value = null))

  // --- Attente du premier lot (précédent : use_telemetry_sync) ----------------
  const waiting = ref(false)
  const timedOut = ref(false)
  const firstBatchAt = ref<string | null>(null)
  let startedAt = 0
  let timer: ReturnType<typeof setInterval> | null = null

  function stopWaiting() {
    waiting.value = false
    if (timer !== null) clearInterval(timer)
    timer = null
  }

  function startWaiting() {
    if (waiting.value) return
    startedAt = now()
    timedOut.value = false
    firstBatchAt.value = null
    waiting.value = true
    timer = setInterval(() => {
      clock.value = now()
      if (clock.value - startedAt >= INSTRUMENT_SETUP_POLL_MAX_MS) {
        stopWaiting()
        timedOut.value = true
        return
      }
      router.reload({ only: ['instruments'] })
    }, INSTRUMENT_SETUP_POLL_INTERVAL_MS)
  }

  watch(lastSeenMs, (seen) => {
    if (!waiting.value || seen === null || seen <= startedAt) return
    firstBatchAt.value = source.value?.lastSeenAt ?? null
    clock.value = now()
    stopWaiting()
  })

  onBeforeUnmount(stopWaiting)

  return {
    stored,
    update,
    steps,
    currentStep,
    openStep,
    openStepManually,
    path,
    connected,
    enginesLinked,
    completed,
    detectedEngineIds,
    waiting,
    timedOut,
    firstBatchAt,
    startWaiting,
    stopWaiting,
  }
}
