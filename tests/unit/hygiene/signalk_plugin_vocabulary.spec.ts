import { test } from '@japa/runner'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SIGNALK_PLUGIN_CONFIG_FILE,
  SIGNALK_PLUGIN_ENDPOINT_MARKER,
  SIGNALK_PLUGIN_ENV_ENDPOINT,
  SIGNALK_PLUGIN_ENV_TOKEN,
  SIGNALK_PLUGIN_INSTALL_PATH,
  SIGNALK_PLUGIN_PACKAGE,
} from '#shared/constants/instruments'

/**
 * Garde de vocabulaire du plugin Signal K (#1021). Le script bash ne peut pas
 * importer les constantes : on le relit sur disque et on le compare. Les textes
 * (`instruments`, `marketing`) ne doivent citer aucun autre nom de paquet.
 */

const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const SCRIPT = readFileSync(join(ROOT, 'resources/install/signalk-plugin.sh'), 'utf8')

test.group('Vocabulaire du plugin Signal K (hygiène)', () => {
  test('le script utilise exactement les constantes partagées', ({ assert }) => {
    assert.include(SCRIPT, `PACKAGE="${SIGNALK_PLUGIN_PACKAGE}"`)
    assert.include(SCRIPT, `CONFIG_FILE="${SIGNALK_PLUGIN_CONFIG_FILE}"`)
    assert.include(SCRIPT, `DEFAULT_ENDPOINT="${SIGNALK_PLUGIN_ENDPOINT_MARKER}"`)
    assert.include(SCRIPT, `\${${SIGNALK_PLUGIN_ENV_TOKEN}:-}`)
    assert.include(SCRIPT, `\${${SIGNALK_PLUGIN_ENV_ENDPOINT}:-`)
    assert.include(SCRIPT, SIGNALK_PLUGIN_INSTALL_PATH)
  })

  test('toute occurrence signalk-xxx des textes est le paquet du plugin', ({ assert }) => {
    for (const locale of readdirSync(join(ROOT, 'resources/lang'))) {
      for (const file of ['instruments.json', 'marketing.json']) {
        let source: string
        try {
          source = readFileSync(join(ROOT, 'resources/lang', locale, file), 'utf8')
        } catch {
          continue
        }
        for (const [name] of source.matchAll(/signalk-[a-z]+/g)) {
          assert.equal(name, SIGNALK_PLUGIN_PACKAGE, `${locale}/${file}`)
        }
      }
    }
  })
})
