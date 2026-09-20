import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'fullName',
        'email',
        'createdAt',
        'updatedAt',
        'initials',
      ]),
      // Un booléen, pas la date (#768) : le front n'a besoin que de savoir
      // s'il doit afficher la bannière de rappel, et une date de vérification
      // n'a rien à faire dans les props de chaque page.
      emailVerified: this.resource.emailVerifiedAt !== null,
    }
  }
}
