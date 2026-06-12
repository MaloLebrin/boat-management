export interface UserForFront {
  id: number
  fullName: string | null
  email: string
  createdAt: string
  updatedAt: string | null
  initials: string
}

export interface UserProfile {
  fullName: string | null
  email: string
  locale: string
  avatar: string | null
}

export interface UserSettings {
  locale: string
  emailNotifications: boolean
  timezone: string
}
