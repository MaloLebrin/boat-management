import env from '#start/env'

/**
 * Web Push (#497). Désactivé tant que les clés VAPID ne sont pas fournies :
 * test, CI et local démarrent sans configuration et le job d'envoi devient un
 * no-op. En production les clés sont obligatoires (#865) : `/up` signale
 * `checks.vapid: missing` sans faire échouer la probe.
 */
const pushConfig = {
  enabled: Boolean(env.get('VAPID_PUBLIC_KEY') && env.get('VAPID_PRIVATE_KEY')),
  vapidPublicKey: env.get('VAPID_PUBLIC_KEY'),
  vapidPrivateKey: env.get('VAPID_PRIVATE_KEY'),
  // `mailto:` de contact exigé par la spec VAPID — repli sur l'adresse d'envoi
  vapidSubject: env.get('VAPID_SUBJECT', `mailto:${env.get('MAIL_FROM_ADDRESS')}`),
}

export default pushConfig
