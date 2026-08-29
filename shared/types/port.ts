export type PortAggRow = { port_id: number; count: string }

/**
 * Port de l'organisation réduit à ce qu'il faut pour une liste de suggestions
 * (#579) : les champs texte qui désignent un port (`boats.home_port`,
 * `boat_port_stays.port_name`) restent libres, la liste ne fait qu'assister la
 * saisie.
 */
export type PortNameOption = { id: number; name: string }

export type PortPayload = {
  name: string
  city?: string | null
  country?: string | null
  address?: string | null
  notes?: string | null
}
