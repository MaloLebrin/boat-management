export class PricingSeasonNotFoundError extends Error {
  name = 'PricingSeasonNotFoundError'
}

export class SeasonOverlapError extends Error {
  name = 'SeasonOverlapError'

  constructor() {
    super('Season period overlaps with an existing season in the same scope')
  }
}

export class InvalidSeasonDateRangeError extends Error {
  name = 'InvalidSeasonDateRangeError'

  constructor() {
    super('End date must be after or equal to start date')
  }
}

export class InvalidSeasonPriceError extends Error {
  name = 'InvalidSeasonPriceError'

  constructor() {
    super('Exactly one of dailyPrice or multiplier must be provided')
  }
}

export class SeasonBoatNotFoundError extends Error {
  name = 'SeasonBoatNotFoundError'

  constructor() {
    super('Boat does not belong to this organization')
  }
}
