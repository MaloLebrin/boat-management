/**
 * Durées de conservation des données personnelles (#775).
 *
 * Deux purges existaient — journaux d'audit et traces d'événements Stripe —
 * et tout le reste s'accumulait sans limite, dont les tables que n'importe
 * quel visiteur remplit depuis le site public et qui contiennent des adresses
 * e-mail. L'app publie par ailleurs une politique de confidentialité : l'écart
 * entre le texte et le comportement réel était le vrai problème, plus que la
 * volumétrie.
 *
 * Les durées ci-dessous sont celles qu'annonce la section « Durée de
 * conservation » de `marketing.json` — les deux se lisent ensemble, et une
 * modification ici doit s'y refléter.
 */

/**
 * Messages du formulaire de contact public : 24 mois.
 *
 * Un message de contact est une sollicitation commerciale ; la CNIL retient
 * trois ans à compter du dernier contact pour la prospection. Deux ans, avec
 * un compteur qui part de la réception, restent en deçà.
 */
export const CONTACT_MESSAGE_RETENTION_DAYS = 730

/**
 * Leads du simulateur : 24 mois **depuis le dernier contact**, pas depuis le
 * premier.
 *
 * `SimulatorLeadService.create()` fait un `updateOrCreate` clé sur l'e-mail :
 * un visiteur qui refait une simulation réécrit sa ligne. La table n'avait
 * que `created_at`, donc le compteur serait parti de la toute première visite
 * et aurait supprimé un prospect encore actif. D'où `updated_at` (#775) — et
 * c'est lui que la purge regarde.
 */
export const SIMULATOR_LEAD_RETENTION_DAYS = 730

/**
 * Durée de vie d'un lien de partage du simulateur : 6 mois.
 *
 * Le contenu partagé ne comporte aucune donnée personnelle — le défaut était
 * l'immortalité du lien, pas sa devinabilité. La durée est **matérialisée en
 * base** (`simulator_shares.expires_at`) plutôt que calculée à la lecture :
 * c'est ce qui permet à la purge et à la page de lecture de s'accorder sans
 * se répéter, et à un partage émis avant un changement de politique de garder
 * l'échéance qu'on lui avait promise.
 */
export const SIMULATOR_SHARE_LIFETIME_DAYS = 180

/**
 * Délai de grâce avant de supprimer un jeton déjà expiré (reset de mot de
 * passe, invitation).
 *
 * Zéro suffirait — un jeton expiré n'a aucune utilité. Ces quelques jours
 * laissent le temps de diagnostiquer « mon lien ne marche pas » en regardant
 * la ligne, au lieu de constater son absence.
 */
export const EXPIRED_TOKEN_GRACE_DAYS = 7
