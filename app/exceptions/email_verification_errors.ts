/**
 * Action réservée aux comptes dont l'adresse est vérifiée (#768).
 *
 * L'app reste accessible sans vérification — bloquer tout casserait l'essai
 * immédiat. Ce qui est gardé, ce sont les actions qui **engagent des tiers ou
 * de l'argent** : envoyer un e-mail sortant, inviter un membre, passer au
 * paiement. Une vérification qui ne garde rien est décorative ; une
 * vérification qui garde tout chasse l'utilisateur avant qu'il ait vu le
 * produit.
 */
export class EmailNotVerifiedError extends Error {
  constructor() {
    super('Email address is not verified')
    this.name = 'EmailNotVerifiedError'
  }
}
