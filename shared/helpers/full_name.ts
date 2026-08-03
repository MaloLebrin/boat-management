/**
 * Splits a display name into the first/last name pair that
 * `UserService.signupWithOrganization` expects (#448).
 *
 * The signup form collects the two parts separately; programmatic callers
 * (seeders, fixtures) usually only hold a single display string. The first
 * whitespace-separated token becomes the first name, the rest the last name.
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)

  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  }
}

/**
 * Inverse of {@link splitFullName}: joins both parts into the single
 * `users.full_name` column, or `null` when nothing was provided.
 */
export function joinFullName(firstName: string, lastName: string): string | null {
  return (
    [firstName, lastName]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' ') || null
  )
}
