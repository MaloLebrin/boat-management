/** Erreurs de l'exploitation marina (#891) : escales et contrats d'amarrage. */

export class MarinaStayNotFoundError extends Error {
  name = 'MarinaStayNotFoundError'
}

export class MooringContractNotFoundError extends Error {
  name = 'MooringContractNotFoundError'
}

/** La place n'appartient pas au port de l'URL (ou à l'organisation). */
export class SpotNotInPortError extends Error {
  name = 'SpotNotInPortError'
}

/** Place hors service : aucune escale ni contrat ne s'y pose. */
export class SpotOutOfServiceError extends Error {
  name = 'SpotOutOfServiceError'
}

/** Une autre escale attendue ou en cours tient déjà la place sur ces dates. */
export class MarinaStayOverlapError extends Error {
  name = 'MarinaStayOverlapError'

  constructor(readonly guestName: string) {
    super(`Spot already held by "${guestName}" on these dates`)
  }
}

/** Une escale accueille un bateau de la flotte ou un visiteur nommé — jamais personne. */
export class MarinaStayGuestRequiredError extends Error {
  name = 'MarinaStayGuestRequiredError'
}

/** Un contrat actif couvre déjà la place. */
export class MooringContractOverlapError extends Error {
  name = 'MooringContractOverlapError'
}

/** Transition d'escale non permise (ex. `departed` → `arrived`). */
export class MarinaStayTransitionError extends Error {
  name = 'MarinaStayTransitionError'
}

/** L'escale n'est pas (ou plus) facturable : pas arrivée, ou déjà facturée. */
export class MarinaStayNotInvoiceableError extends Error {
  name = 'MarinaStayNotInvoiceableError'
}

/** Une escale facturée ne se supprime plus : la facture la référence. */
export class MarinaStayLockedError extends Error {
  name = 'MarinaStayLockedError'
}

/** Un contrat qui a déjà émis une facture se résilie, il ne se supprime pas. */
export class MooringContractLockedError extends Error {
  name = 'MooringContractLockedError'
}

/** Une place tenue par une escale active ou un contrat actif ne se supprime pas. */
export class SpotHasActiveBookingError extends Error {
  name = 'SpotHasActiveBookingError'
}

/** Le client du contrat n'existe pas dans l'organisation. */
export class MarinaClientNotFoundError extends Error {
  name = 'MarinaClientNotFoundError'
}
