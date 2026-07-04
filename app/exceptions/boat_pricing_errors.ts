export class InvalidPricingRangeError extends Error {
  name = 'InvalidPricingRangeError'

  constructor() {
    super('Maximum duration must be greater than or equal to minimum duration')
  }
}
