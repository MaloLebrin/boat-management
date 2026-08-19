import {
  ENGINE_FUEL_OPTIONS,
  ENGINE_KIND_OPTIONS,
  RIG_TYPE_OPTIONS,
  SAIL_TYPE_OPTIONS,
} from '../../shared/constants/boats/boat_form_options'
import { MAINTENANCE_SUBJECT_OPTIONS } from '../../shared/constants/maintenance/maintenance_subjects'

type T = (key: string) => string

function labelFor(
  options: ReadonlyArray<{ value: string }>,
  namespace: string,
  t: T,
  value: string | null | undefined
): string | null {
  if (!value) return null
  const isKnown = options.some((option) => option.value === value)
  return isKnown ? t(`${namespace}.${value}`) : value
}

/** Translated label for a boat engine's kind enum value (inboard/outboard/electric...). */
export function engineKindLabel(t: T, value: string | null | undefined): string | null {
  return labelFor(ENGINE_KIND_OPTIONS, 'boats.options.engineKind', t, value)
}

/** Translated label for a boat engine's fuel enum value (diesel/essence/electric...). */
export function engineFuelLabel(t: T, value: string | null | undefined): string | null {
  return labelFor(ENGINE_FUEL_OPTIONS, 'boats.options.engineFuel', t, value)
}

/** Translated label for a sail's type enum value (main/genoa/jib...). */
export function sailTypeLabel(t: T, value: string | null | undefined): string | null {
  return labelFor(SAIL_TYPE_OPTIONS, 'boats.options.sailType', t, value)
}

/** Translated label for a rig's type enum value (sloop/cutter/ketch...). */
export function rigTypeLabel(t: T, value: string | null | undefined): string | null {
  return labelFor(RIG_TYPE_OPTIONS, 'boats.options.rigType', t, value)
}

/** Translated label for a maintenance/planning subject enum value (boat/engine/sail/rig...). */
export function maintenanceSubjectLabel(t: T, value: string | null | undefined): string | null {
  return labelFor(MAINTENANCE_SUBJECT_OPTIONS, 'maintenance.history.subjects', t, value)
}

/**
 * Translated label for the caption of an engine maintenance event.
 *
 * The caption is free text, but when the linked engine has no brand/model/serial
 * number it falls back to the raw `kind` enum token (« inboard »), which used to
 * surface untranslated in the history — including for rows already stored in
 * database. A caption that is exactly an enum value is therefore translated, any
 * other caption is returned as-is (#472).
 */
export function engineCaptionLabel(t: T, caption: string | null | undefined): string | null {
  return engineKindLabel(t, caption)
}

interface EngineTitleLike {
  brand: string | null
  model: string | null
  kind: string
}

/**
 * Display title of an engine: its brand and model, falling back to the
 * translated `kind` when the engine carries neither (#472).
 */
export function engineDisplayTitle(t: T, engine: EngineTitleLike): string {
  const identity = [engine.brand, engine.model].filter(Boolean).join(' ').trim()
  return identity || engineKindLabel(t, engine.kind) || engine.kind
}
