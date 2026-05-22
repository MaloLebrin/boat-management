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
