import { test } from '@japa/runner'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Garde de confidentialité de l'inventaire (#1036) : le lot porte des numéros
 * de série (hachés ou non) ; ni le contrôleur, ni le service, ni le modèle ne
 * doivent journaliser. On relit les sources : un `logger` ou un `console`
 * ajouté demain fait échouer ce test.
 */

const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const FILES = [
  'app/controllers/instrument_inventory_controller.ts',
  'app/services/instrument_inventory_service.ts',
  'app/models/boat_instrument_device.ts',
  'app/transformers/instrument_transformer.ts',
]

test.group('Inventaire des appareils — pas de journalisation (hygiène)', () => {
  for (const file of FILES) {
    test(`${file} ne journalise rien`, ({ assert }) => {
      const source = readFileSync(join(ROOT, file), 'utf8')
      assert.notMatch(source, /\blogger\b/)
      assert.notMatch(source, /\bconsole\./)
    })
  }

  test('le transformer ne porte pas le numéro de série', ({ assert }) => {
    const source = readFileSync(join(ROOT, 'app/transformers/instrument_transformer.ts'), 'utf8')
    const start = source.indexOf('export function toInstrumentDevice')
    const body = source.slice(start, source.indexOf('\n}\n', start))
    assert.notInclude(body, 'serialNumber')
  })
})
