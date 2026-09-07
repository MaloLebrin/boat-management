import type { Capability } from '#shared/types/permissions'
import type { PlanQuotas } from '#shared/types/plan'

/**
 * Outils de lecture du copilote FleetAi (#642).
 *
 * Le modèle récupère les données de l'organisation en appelant des outils
 * bornés (function calling) plutôt qu'en recevant tout le contexte dans le
 * prompt. Chaque outil enveloppe un service existant déjà scopé à
 * l'organisation — l'utilisateur et l'org viennent toujours du contexte
 * authentifié, jamais des arguments du modèle. Aucun outil d'écriture.
 */

/** Troncature d'un résultat d'outil sérialisé — sans elle, `list_boats` sur une grosse flotte fait exploser le tour. */
export const ASSISTANT_TOOL_RESULT_MAX_CHARS = 4000

/** Nombre max d'allers-retours outillés par question. */
export const ASSISTANT_MAX_TOOL_ROUNDS = 3

/** Nombre max d'appels d'outils exécutés par question, tous tours confondus. */
export const ASSISTANT_MAX_TOOL_CALLS_PER_TURN = 6

/** Flags booléens de `PlanQuotas` utilisables comme garde de plan d'un outil. */
export type AssistantToolPlanFlag = {
  [K in keyof PlanQuotas]: PlanQuotas[K] extends boolean ? K : never
}[keyof PlanQuotas]

/**
 * Métadonnées d'un outil du copilote. `capability` et `planFlags` filtrent la
 * liste servie au modèle : un outil n'est proposé que si le rôle possède la
 * capability ET qu'au moins un des flags de plan (résolus sur les quotas
 * effectifs — tier + modules + add-ons) est actif.
 */
export interface AssistantToolSpec {
  name: string
  description: string
  /** JSON Schema d'objet, envoyé tel quel aux quatre fournisseurs. */
  parameters: Record<string, unknown>
  capability?: Capability
  planFlags?: AssistantToolPlanFlag[]
}
