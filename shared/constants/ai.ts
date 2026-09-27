/**
 * Bornes de durée des appels aux fournisseurs IA (#853).
 *
 * Sans elles, les SDK attendent longtemps : 10 minutes avec 2 relances pour
 * `openai` et `@anthropic-ai/sdk`, aucune limite pour `@mistralai/mistralai`.
 * Un fournisseur lent occupait alors une requête Node pendant tout ce temps.
 * Or `web` tourne en instance unique, et les chats publics n'exigent pas de
 * compte.
 *
 * Le délai couvre **l'appel entier**, relances comprises, et pas chaque
 * tentative.
 */

/**
 * Un tour de chat répondu dans la requête HTTP : assistant, diagnostic public,
 * recherche de pièces. Caddy coupe une connexion inactive vers 30 s, donc un
 * tour plus long finirait de toute façon en 502 côté navigateur.
 */
export const AI_CHAT_TIMEOUT_MS = 30_000

/**
 * Génération d'une analyse ou de suggestions (JSON long), et chat en queue
 * `ai`. La sortie est plus longue qu'un tour de chat : il lui faut plus de marge.
 */
export const AI_ANALYSIS_TIMEOUT_MS = 120_000

/**
 * Relances automatiques côté SDK (`openai`, `@anthropic-ai/sdk`). Une seule :
 * elle absorbe un 5xx isolé, et le délai global borne l'ensemble.
 */
export const AI_SDK_MAX_RETRIES = 1
