import { test } from '@japa/runner'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import loggerConfig from '#config/logger'

/**
 * Garde des secrets d'environnement et de la redaction des journaux (#769).
 *
 * Deux moitiés d'un même problème, et il manquait les deux au même endroit :
 * `Env.schema.secret` protège la valeur **lue depuis `env`** (elle est masquée
 * à la sérialisation et à la journalisation), la liste `redact` de Pino
 * protège **ce qui transite par le logger**, quel qu'en soit l'émetteur.
 *
 * Le risque n'était pas actuel — aucun appel de `app/` ne journalise
 * volontairement un secret — mais structurel. Il suffit d'un
 * `logger.error({ err, config })`, d'une erreur `pg` ou `nodemailer` qui
 * embarque sa configuration de connexion, ou d'un `logger.info({ req })` qui
 * traîne un en-tête `Cookie`, pour que la valeur parte en clair dans les
 * journaux de production, et de là dans l'agrégateur de logs — qui n'a pas le
 * même périmètre de confidentialité que le serveur.
 *
 * ⚠️ Ce test **relit `start/env.ts` sur le disque** plutôt que d'importer la
 * config : importer `#start/env` valide l'environnement complet, et on ne
 * saurait pas distinguer un `Secret` d'une `string` après coup — `env.get()`
 * rend la valeur, pas le schéma. Comme les autres gardes d'hygiène du repo,
 * l'assertion partage donc sa source avec sa cible.
 */

const ENV_SOURCE = readFileSync(
  fileURLToPath(new URL('../../../start/env.ts', import.meta.url)),
  'utf-8'
)

/** Un mot de ce lexique dans le nom d'une variable déclenche la règle. */
const SENSITIVE_NAME = /(KEY|SECRET|PASSWORD|TOKEN|CREDENTIAL)/

/**
 * Variables dont le nom déclenche la règle mais qui sont **publiques par
 * conception** — elles partent dans le navigateur. Les masquer n'apporterait
 * rien et brouillerait le signal.
 */
const PUBLIC_BY_DESIGN = new Set(['STRIPE_PUBLIC_KEY', 'VAPID_PUBLIC_KEY'])

/** Les cinq que cette issue a fait basculer, nommées pour la régression. */
const FIXED_BY_769 = [
  'DB_PASSWORD',
  'CLOUDINARY_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SMTP_PASSWORD',
]

interface EnvDeclaration {
  name: string
  schema: string
}

function readEnvDeclarations(): EnvDeclaration[] {
  const declarations: EnvDeclaration[] = []
  const pattern = /^\s+([A-Z0-9_]+):\s*Env\.schema\.([A-Za-z.]+)/gm

  let match: RegExpExecArray | null
  while ((match = pattern.exec(ENV_SOURCE)) !== null) {
    declarations.push({ name: match[1], schema: match[2] })
  }
  return declarations
}

function isSecret(declaration: EnvDeclaration): boolean {
  return declaration.schema === 'secret' || declaration.schema.startsWith('secret.')
}

test.group('Env secrets and log redaction (unit)', () => {
  test('the parser actually sees the environment schema', ({ assert }) => {
    // Sans ce témoin, une regex qui ne matche plus rendrait les assertions
    // suivantes vertes pour de mauvaises raisons.
    const declarations = readEnvDeclarations()

    assert.isAbove(declarations.length, 30)
    assert.include(
      declarations.map((declaration) => declaration.name),
      'APP_KEY'
    )
  })

  test('every secret-looking variable uses Env.schema.secret', ({ assert }) => {
    const offenders = readEnvDeclarations()
      .filter((declaration) => SENSITIVE_NAME.test(declaration.name))
      .filter((declaration) => !PUBLIC_BY_DESIGN.has(declaration.name))
      .filter((declaration) => !isSecret(declaration))
      .map((declaration) => `${declaration.name} (${declaration.schema})`)

    assert.deepEqual(
      offenders,
      [],
      `Ces variables portent un nom de secret sans \`Env.schema.secret\` : ${offenders.join(', ')}. ` +
        'Passez-les en `secret`, ou inscrivez-les dans PUBLIC_BY_DESIGN si elles partent vraiment au navigateur.'
    )
  })

  test('the five variables this issue fixed are still secrets', ({ assert }) => {
    const declarations = readEnvDeclarations()

    for (const name of FIXED_BY_769) {
      const declaration = declarations.find((candidate) => candidate.name === name)
      assert.isDefined(declaration, `${name} a disparu de start/env.ts`)
      assert.isTrue(isSecret(declaration!), `${name} doit être un \`Env.schema.secret\``)
    }
  })

  test('the public-by-design allowlist does not outlive its variables', ({ assert }) => {
    const known = new Set(readEnvDeclarations().map((declaration) => declaration.name))
    const stale = [...PUBLIC_BY_DESIGN].filter((name) => !known.has(name))

    assert.deepEqual(stale, [], `Entrées PUBLIC_BY_DESIGN sans variable : ${stale.join(', ')}.`)
  })

  // --- le second filet : la redaction Pino ---

  test('the logger declares a redact list', ({ assert }) => {
    const redact = loggerConfig.loggers.app.redact

    assert.isDefined(redact, 'config/logger.ts doit déclarer `redact`')
    assert.equal(redact!.censor, '[redacted]')
  })

  test('the redact list covers the paths a leak would take', ({ assert }) => {
    const paths = loggerConfig.loggers.app.redact!.paths

    for (const expected of [
      // L'objet de requête, tantôt journalisé tel quel, tantôt imbriqué dans
      // une erreur — d'où les deux formes.
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'headers.cookie',
      // Ce qu'embarquent les erreurs `pg` et `nodemailer`.
      '*.password',
      // Les clés d'API et les jetons, quelle que soit la casse du champ.
      '*.apiKey',
      '*.api_key',
      '*.secret',
      '*.token',
    ]) {
      assert.include(paths, expected)
    }
  })
})
