export class UserNotInOrganizationError extends Error {
  constructor() {
    super('User must belong to an organization to perform this action')
    this.name = 'UserNotInOrganizationError'
  }
}

export class MemberNotFoundError extends Error {
  constructor() {
    super('Member not found in this organization')
    this.name = 'MemberNotFoundError'
  }
}

export class AlreadyMemberError extends Error {
  constructor() {
    super('User is already a member of this organization')
    this.name = 'AlreadyMemberError'
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super('No user found with this email address')
    this.name = 'UserNotFoundError'
  }
}

export class LastAdminError extends Error {
  constructor() {
    super('Cannot remove or demote the last admin of an organization')
    this.name = 'LastAdminError'
  }
}

export class InvitationNotFoundError extends Error {
  constructor() {
    super('Invitation not found')
    this.name = 'InvitationNotFoundError'
  }
}

export class InvitationExpiredError extends Error {
  constructor() {
    super('Invitation has expired')
    this.name = 'InvitationExpiredError'
  }
}

export class InvitationAlreadyAcceptedError extends Error {
  constructor() {
    super('Invitation has already been accepted or cancelled')
    this.name = 'InvitationAlreadyAcceptedError'
  }
}

export class InvitationAlreadyExistsError extends Error {
  constructor() {
    super('An invitation is already pending for this email')
    this.name = 'InvitationAlreadyExistsError'
  }
}

export class InvitationEmailMismatchError extends Error {
  constructor() {
    super('This invitation was sent to a different email address')
    this.name = 'InvitationEmailMismatchError'
  }
}
