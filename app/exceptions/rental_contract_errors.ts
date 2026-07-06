export class RentalContractNotFoundError extends Error {
  name = 'RentalContractNotFoundError'
}

export class RentalContractAlreadyExistsError extends Error {
  name = 'RentalContractAlreadyExistsError'
}

export class RentalContractInvalidTransitionError extends Error {
  name = 'RentalContractInvalidTransitionError'
}

export class RentalContractNoClientEmailError extends Error {
  name = 'RentalContractNoClientEmailError'
}
