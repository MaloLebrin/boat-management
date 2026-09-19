/**
 * Bornes de la surface IA publique (#762).
 *
 * Les deux chats publics — diagnostic de panne (#602) et recherche de
 * référence de pièce (#634) — appellent Mistral de façon **synchrone**, avec
 * la clé de l'app, pour des visiteurs anonymes dont le coût n'est imputé à
 * personne. Le seul plafond par visiteur vivait dans la **session** : vider
 * ses cookies le remettait à zéro. Restait le throttle par IP, 6 requêtes par
 * minute, soit ~8 600 appels par jour et par IP — et aucune borne du tout
 * depuis un pool d'IP résidentielles.
 */

/** Les deux surfaces publiques, comptées séparément. */
export const PUBLIC_AI_SURFACES = ['diagnosis', 'part_search'] as const
export type PublicAiSurface = (typeof PUBLIC_AI_SURFACES)[number]

/**
 * Conversations qu'une même IP peut ouvrir par jour et par surface.
 *
 * Le plafond de session (`PUBLIC_DIAGNOSIS_LIFETIME_LIMIT`, 2) reste en place
 * comme confort d'UX ; celui-ci est le garde-fou. Cinq plutôt que deux parce
 * qu'une IP est partagée — un NAT d'entreprise ou un réseau mobile place
 * plusieurs visiteurs derrière la même adresse — et trois ordres de grandeur
 * en dessous des ~8 600 que laisse passer le throttle par minute.
 *
 * Ce plafond ne protège pas d'un pool d'IP : c'est le rôle du budget global
 * ci-dessous.
 */
export const PUBLIC_AI_CONVERSATIONS_PER_IP_PER_DAY = 5

/**
 * Budget de tokens de la surface publique, toutes IP et les deux chats
 * confondus, par jour.
 *
 * C'est le seul garde-fou qui résiste à un pool d'IP : au-delà, les deux
 * chats se dégradent en invitant à créer un compte, au lieu de continuer à
 * facturer.
 *
 * Ordre de grandeur : une conversation tient en quatre tours et coûte de
 * l'ordre de 8 000 tokens, soit ~375 conversations par jour — large pour un
 * tunnel d'acquisition, et un plafond de coût dur si quelqu'un s'amuse.
 */
export const PUBLIC_AI_DAILY_TOKEN_BUDGET = 3_000_000

/**
 * Rétention des compteurs journaliers.
 *
 * Les lignes ne servent qu'au jour courant ; une semaine laisse de quoi
 * regarder après coup ce qu'a coûté la surface publique — mesure qui
 * n'existait nulle part. La clé client étant un HMAC salé par le jour, deux
 * jours ne se recoupent pas.
 */
export const PUBLIC_AI_USAGE_RETENTION_DAYS = 7

/** Ligne agrégée : surface `all`, client `global`. */
export const PUBLIC_AI_GLOBAL_SURFACE = 'all'
export const PUBLIC_AI_GLOBAL_CLIENT_KEY = 'global'
