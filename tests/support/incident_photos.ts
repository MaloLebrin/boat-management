import { MediaFactory } from '#database/factories/media_factory'
import type BoatIncident from '#models/boat_incident'
import type Media from '#models/media'

/**
 * Attache une photo à un incident.
 *
 * `BoatIncidentFactory` écrit en base sans passer par le service et laisse
 * volontairement l'incident **sans** photo : c'est ce qui permet de continuer
 * à tester le badge « photo manquante » et le refus de clôture. Les tests qui
 * ont besoin d'un incident clôturable passent par ici.
 *
 * Le lien `media` est polymorphe et sans FK — d'où un helper plutôt qu'une
 * `.relation()` sur la fabrique.
 */
export function attachIncidentPhoto(incident: BoatIncident): Promise<Media> {
  return MediaFactory.merge({
    entityType: 'boat_incident',
    entityId: incident.id,
    kind: 'photo',
  }).create()
}
