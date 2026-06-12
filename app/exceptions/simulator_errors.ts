export class SimulatorShareNotFoundError extends Error {
  name = 'SimulatorShareNotFoundError'
  status = 404
  code = 'E_SIMULATOR_SHARE_NOT_FOUND'
}

export class SimulatorShareExpiredError extends Error {
  name = 'SimulatorShareExpiredError'
  status = 410
  code = 'E_SIMULATOR_SHARE_EXPIRED'
}
