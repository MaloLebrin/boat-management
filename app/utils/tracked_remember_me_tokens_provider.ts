import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import type { RememberMeToken } from '@adonisjs/auth/session'
import db from '@adonisjs/lucid/services/db'
import type { LucidModel } from '@adonisjs/lucid/types/model'

type TokenIdentifier = Parameters<DbRememberMeTokensProvider<LucidModel>['delete']>[1]

/** Dernier remember-me émis pour une instance d'utilisateur, le temps de la requête. */
const issuedTokenIds = new WeakMap<object, number>()

/**
 * Provider de remember-me qui garde le lien avec le registre des sessions
 * (#885).
 *
 * Le guard ne rend jamais le jeton qu'il émet : ni `login(user, true)` ni la
 * restauration depuis le cookie (qui **recycle** le jeton, donc en change
 * l'identifiant) ne l'exposent. Sans ce lien, couper une session laissait son
 * remember-me la rouvrir à la requête suivante.
 *
 * - `create` mémorise l'identifiant émis sur l'instance d'utilisateur —
 *   la même que `auth.user` — pour `takeIssuedRememberMeTokenId()`.
 * - `recycle` crée le nouveau jeton **avant** de supprimer l'ancien et
 *   reporte le lien entre les deux : dans l'ordre d'origine, la clé étrangère
 *   `ON DELETE SET NULL` aurait effacé le lien.
 */
export class TrackedRememberMeTokensProvider<
  TokenableModel extends LucidModel,
> extends DbRememberMeTokensProvider<TokenableModel> {
  async create(
    user: InstanceType<TokenableModel>,
    expiresIn: string | number
  ): Promise<RememberMeToken> {
    const token = await super.create(user, expiresIn)
    issuedTokenIds.set(user, Number(token.identifier))
    return token
  }

  async recycle(
    user: InstanceType<TokenableModel>,
    identifier: TokenIdentifier,
    expiresIn: string | number
  ): Promise<RememberMeToken> {
    const token = await this.create(user, expiresIn)
    await db
      .from('user_sessions')
      .where('remember_me_token_id', Number(identifier))
      .update({ remember_me_token_id: Number(token.identifier) })
    await this.delete(user, identifier)
    return token
  }
}

/** Identifiant du remember-me émis pendant cette requête pour `user`, puis oublié. */
export function takeIssuedRememberMeTokenId(user: object): number | null {
  const id = issuedTokenIds.get(user) ?? null
  issuedTokenIds.delete(user)
  return id
}
