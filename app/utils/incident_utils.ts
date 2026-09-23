import BoatIncident from '#models/boat_incident'

/**
 * Garde de périmètre d'une suite d'incident (#815) : l'incident tracé par une
 * tâche ou une action doit appartenir au bateau visé. Un id d'un autre bateau
 * (ou d'une autre organisation) est traité comme inexistant. Chaque service
 * lève ensuite l'erreur de validation de son propre domaine.
 */
export async function incidentBelongsToBoat(boatId: number, incidentId: number) {
  const incident = await BoatIncident.query()
    .where('id', incidentId)
    .where('boatId', boatId)
    .select('id')
    .first()
  return incident !== null
}
