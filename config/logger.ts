import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, targets } from '@adonisjs/core/logger'

const loggerConfig = defineConfig({
  /**
   * Default logger name used by ctx.logger and app logger calls.
   */
  default: 'app',

  loggers: {
    app: {
      /**
       * Toggle this logger on/off.
       */
      enabled: true,

      /**
       * Logger name shown in log records.
       */
      name: env.get('APP_NAME'),

      /**
       * Minimum level to output (trace, debug, info, warn, error, fatal).
       */
      level: env.get('LOG_LEVEL'),

      /**
       * Champs retirés des journaux, quel qu'en soit l'émetteur (#769).
       *
       * Filet de sécurité **indépendant** du typage `Env.schema.secret` :
       * celui-ci protège ce qu'on lit depuis `env`, ceci protège ce qui
       * transite par le logger. Aucun appel du dossier `app/` ne journalise
       * volontairement un secret aujourd'hui — le risque est structurel. Il
       * suffit d'un `logger.error({ err, config })`, d'une erreur d'une
       * bibliothèque tierce qui embarque sa configuration de connexion (les
       * erreurs `pg` et `nodemailer` le font volontiers), ou d'un
       * `logger.info({ req })` qui traîne un en-tête `Cookie`, pour que la
       * valeur atterrisse en clair dans les journaux de production — et de là
       * dans l'agrégateur de logs, qui n'a pas le même périmètre de
       * confidentialité que le serveur.
       *
       * Les chemins sont doublés (`req.headers.*` et `headers.*`) parce que
       * l'objet journalisé est tantôt la requête, tantôt l'objet d'erreur qui
       * la contient.
       */
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'headers.authorization',
          'headers.cookie',
          'config.password',
          'password',
          '*.password',
          '*.apiKey',
          '*.api_key',
          '*.apiSecret',
          '*.api_secret',
          '*.secret',
          '*.token',
          '*.accessToken',
          '*.refreshToken',
          '*.authorization',
          '*.cookie',
        ],
        censor: '[redacted]',
      },

      /**
       * Configure where logs are written.
       * Pretty logs in development, stdout in production.
       */
      transport: {
        targets: targets()
          .pushIf(!app.inProduction, targets.pretty())
          .pushIf(app.inProduction, targets.file({ destination: 1 }))
          .toArray(),
      },
    },
  },
})

export default loggerConfig

/**
 * Inferring types for the list of loggers you have configured
 * in your application.
 */
declare module '@adonisjs/core/types' {
  type LoggersBase = (typeof loggerConfig)['loggers']
  export interface LoggersList extends LoggersBase {}
}
