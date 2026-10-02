import vine from '@vinejs/vine'

/** Suppression du compte (#886) : mot de passe + case de confirmation. */
export const deleteAccountValidator = vine.create({
  password: vine.string().minLength(1).maxLength(255),
  confirm: vine.accepted(),
})

/** Suppression de l'organisation (#886) : mot de passe + saisie de son nom. */
export const deleteOrganizationValidator = vine.create({
  password: vine.string().minLength(1).maxLength(255),
  organizationName: vine.string().trim().minLength(1).maxLength(255),
})
