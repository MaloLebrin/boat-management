/**
 * Erreurs métier de la gestion du compte en libre-service (#886).
 */

/**
 * Suppression du compte refusée : l'utilisateur est le dernier admin d'une
 * organisation active. Il doit d'abord nommer un autre admin ou supprimer
 * l'organisation.
 */
export class LastAdminOfActiveOrganizationError extends Error {
  constructor(public organizationNames: string[]) {
    super('User is the last admin of an active organization')
    this.name = 'LastAdminOfActiveOrganizationError'
  }
}

/** Quitter sa seule organisation laisserait un compte sans espace de travail. */
export class OnlyOrganizationError extends Error {
  constructor() {
    super('Cannot leave the only organization of the account')
    this.name = 'OnlyOrganizationError'
  }
}

/** Organisation dont l'utilisateur n'est pas membre. */
export class MembershipNotFoundError extends Error {
  constructor() {
    super('Membership not found')
    this.name = 'MembershipNotFoundError'
  }
}

/** Annulation d'une suppression d'organisation qui n'est pas programmée. */
export class OrganizationDeletionNotScheduledError extends Error {
  constructor() {
    super('Organization deletion is not scheduled')
    this.name = 'OrganizationDeletionNotScheduledError'
  }
}

/** Le compte démo est partagé par tous les visiteurs : ni export, ni départ, ni suppression. */
export class DemoAccountProtectedError extends Error {
  constructor() {
    super('The demo account cannot be modified')
    this.name = 'DemoAccountProtectedError'
  }
}
