import { test } from '@japa/runner'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SIGNALK_PLUGIN_CONFIG_FILE, SIGNALK_PLUGIN_ENV_TOKEN } from '#shared/constants/instruments'

const SCRIPT = fileURLToPath(
  new URL('../../../resources/install/signalk-plugin.sh', import.meta.url)
)
const TOKEN = 'fai_ing_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG'

/** Dossier de config + un faux `signalk-server` dans le PATH. */
function sandbox(withSignalk: boolean) {
  const dir = mkdtempSync(join(tmpdir(), 'fleetai-sk-'))
  const config = join(dir, 'config')
  const bin = join(dir, 'bin')
  mkdirSync(config)
  mkdirSync(bin)
  if (withSignalk) {
    writeFileSync(join(bin, 'signalk-server'), '#!/bin/sh\n')
    chmodSync(join(bin, 'signalk-server'), 0o755)
  }
  return { dir, config, bin }
}

function run(env: Record<string, string>, bin: string) {
  return spawnSync('bash', [SCRIPT], {
    encoding: 'utf8',
    stdin: 'ignore',
    env: {
      PATH: `${bin}:${process.env.PATH}`,
      HOME: env.HOME ?? '/nonexistent',
      FLEETAI_DRY_RUN: '1',
      FLEETAI_ALLOW_ROOT: '1',
      ...env,
    },
  } as never)
}

test.group('resources/install/signalk-plugin.sh (#1021)', () => {
  test('est syntaxiquement valide (bash -n)', ({ assert }) => {
    assert.equal(spawnSync('bash', ['-n', SCRIPT]).status, 0)
  })

  test('refuse sans jeton', ({ assert }) => {
    const { config, bin } = sandbox(true)
    const result = run({ SIGNALK_NODE_CONFIG_DIR: config }, bin)
    assert.equal(result.status, 1)
    assert.include(result.stderr, SIGNALK_PLUGIN_ENV_TOKEN)
  })

  test('refuse un jeton sans le préfixe fai_ing_', ({ assert }) => {
    const { config, bin } = sandbox(true)
    const result = run({ SIGNALK_NODE_CONFIG_DIR: config, FLEETAI_TOKEN: 'autre_chose' }, bin)
    assert.equal(result.status, 1)
    assert.include(result.stderr, 'fai_ing_')
  })

  test('refuse sans Signal K (code 2, lien vers les installateurs)', ({ assert }) => {
    const { config, bin } = sandbox(false)
    const result = run({ SIGNALK_NODE_CONFIG_DIR: config, FLEETAI_TOKEN: TOKEN }, bin)
    assert.equal(result.status, 2)
    assert.include(result.stderr, 'openplotter')
  })

  test('refuse sans dossier de configuration', ({ assert }) => {
    const { dir, bin } = sandbox(true)
    const result = run({ SIGNALK_NODE_CONFIG_DIR: join(dir, 'absent'), FLEETAI_TOKEN: TOKEN }, bin)
    assert.equal(result.status, 2)
  })

  test('écrit la config sans afficher le jeton, puis la fusionne', ({ assert }) => {
    const { config, bin } = sandbox(true)
    const file = join(config, SIGNALK_PLUGIN_CONFIG_FILE)
    const env = { SIGNALK_NODE_CONFIG_DIR: config, FLEETAI_ENDPOINT: 'https://a.test/ingest' }

    const first = run({ ...env, FLEETAI_TOKEN: TOKEN }, bin)
    assert.equal(first.status, 0, first.stderr)
    assert.notInclude(first.stdout + first.stderr, TOKEN)
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), {
      enabled: true,
      configuration: { periodSeconds: 60, endpoint: 'https://a.test/ingest', token: TOKEN },
    })

    // Réglage de l'utilisateur conservé, jeton remplacé.
    const edited = JSON.parse(readFileSync(file, 'utf8'))
    edited.configuration.periodSeconds = 120
    edited.configuration.extra = 'garde-moi'
    writeFileSync(file, JSON.stringify(edited))
    const newToken = `${TOKEN}Z`
    const second = run({ ...env, FLEETAI_TOKEN: newToken }, bin)
    assert.equal(second.status, 0, second.stderr)
    const merged = JSON.parse(readFileSync(file, 'utf8'))
    assert.equal(merged.configuration.periodSeconds, 120)
    assert.equal(merged.configuration.extra, 'garde-moi')
    assert.equal(merged.configuration.token, newToken)
    assert.isTrue(existsSync(file))
  })
})
