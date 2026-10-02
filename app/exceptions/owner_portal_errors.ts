/** Tâche absente, ou qui n'est ni une demande ni un devis du bateau du propriétaire (#890). */
export class OwnerTaskNotFoundError extends Error {
  name = 'OwnerTaskNotFoundError'
}

/** Accord demandé sur un devis qui n'attend plus de décision (#890). */
export class OwnerApprovalNotPendingError extends Error {
  name = 'OwnerApprovalNotPendingError'
}
