import { test } from '@japa/runner'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('../../../', import.meta.url).pathname

function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => relative(ROOT, join(entry.parentPath, entry.name)))
}

function offenders(files: string[], pattern: RegExp): string[] {
  return files.filter((file) => pattern.test(readFileSync(join(ROOT, file), 'utf8')))
}

/**
 * Garde d'hygiène des imports (vague 1.6). Chaque règle a eu ses contrevenants
 * au moment de son introduction ; la liste doit rester vide.
 */
test.group('Import hygiene (unit)', () => {
  const app = sourceFiles('app')
  const tests = sourceFiles('tests')

  test('app/ imports shared/ through the #shared alias, never a relative path', ({ assert }) => {
    assert.deepEqual(offenders(app, /from '(\.\.\/)+shared\//), [])
  })

  test('the BoatService façade is gone: everyone names BoatHullService', ({ assert }) => {
    assert.deepEqual(offenders([...app, ...tests], /'#services\/boat_service'/), [])
  })

  test('business errors are imported from #exceptions, never re-exported by a service', ({
    assert,
  }) => {
    const pattern = /import [^\n]*\b\w+Error\b[^\n]* from '#services\//
    assert.deepEqual(offenders([...app, ...tests], pattern), [])
  })

  test('start/routes/ declares no inline handler for preferences', ({ assert }) => {
    const settings = readFileSync(join(ROOT, 'start/routes/settings.ts'), 'utf8')
    assert.notMatch(settings, /\.post\('\/(locale|theme)', async/)
  })
})
