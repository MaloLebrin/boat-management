export class PortNotFoundError extends Error {
  name = 'PortNotFoundError'
}

export class PortHasBoatsError extends Error {
  name = 'PortHasBoatsError'
}

export class PontoonNotFoundError extends Error {
  name = 'PontoonNotFoundError'
}

export class PontoonHasBoatsError extends Error {
  name = 'PontoonHasBoatsError'
}

export class MouillageNotFoundError extends Error {
  name = 'MouillageNotFoundError'
}

export class MouillageHasBoatsError extends Error {
  name = 'MouillageHasBoatsError'
}

export class SpotNotFoundError extends Error {
  name = 'SpotNotFoundError'
}

/**
 * Refus de supprimer une place occupée (#720), par symétrie avec
 * `PontoonHasBoatsError` : sans elle, `boats.spot_id ON DELETE SET NULL`
 * démarrait le bateau en silence. Porte le nom du bateau pour que le flash
 * dise lequel libérer.
 */
export class SpotHasBoatError extends Error {
  name = 'SpotHasBoatError'

  constructor(readonly boatName: string) {
    super(`Spot is occupied by boat "${boatName}"`)
  }
}

/**
 * Refus de la cartographie de port lié au **profil** de l'organisation (compte
 * particulier), et non à son plan : aucun changement d'abonnement ne la
 * débloquera, d'où une erreur distincte de `QuotaExceededError` — le message
 * d'upsell vers un plan supérieur serait mensonger.
 */
export class PortsUnavailableForPrivateProfileError extends Error {
  name = 'PortsUnavailableForPrivateProfileError'
}
