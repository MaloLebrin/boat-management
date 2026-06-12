export class PlanningConflictError extends Error {
  name = 'PlanningConflictError'
  status = 409
  code = 'E_PLANNING_CONFLICT'
}

export class PlanningPermissionError extends Error {
  name = 'PlanningPermissionError'
  status = 403
  code = 'E_PLANNING_PERMISSION'
}
