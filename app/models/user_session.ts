import { UserSessionSchema } from '#database/schema'

/**
 * Session authentifiée recensée (#885) : appareil, IP, dernière activité, et
 * le remember-me émis avec elle. Le contenu de la session reste dans le store
 * configuré (`SESSION_DRIVER`) — cette ligne ne sert qu'à lister et révoquer.
 */
export default class UserSession extends UserSessionSchema {
  static table = 'user_sessions'
  static selfAssignPrimaryKey = true
}
