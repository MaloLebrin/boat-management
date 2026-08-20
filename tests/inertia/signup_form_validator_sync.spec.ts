import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, test, expect } from 'vitest'

/**
 * Static guard for #448.
 *
 * `signupValidator` and `inertia/pages/auth/signup.vue` drifted apart: the
 * validator required `fullName` and `passwordConfirmation`, the form posted
 * `firstName` / `lastName` / organization fields. Every signup was rejected on
 * a field that had no input to carry the error, so the page silently
 * re-rendered with no message at all.
 *
 * Reading both sources is the only level that can catch the drift: a mounted
 * component test cannot see the server-side schema, and a functional test only
 * covers the payloads it happens to send.
 */
const ROOT = resolve(__dirname, '../..')

const validatorSource = readFileSync(resolve(ROOT, 'app/validators/user.ts'), 'utf8')
const pageSource = readFileSync(resolve(ROOT, 'inertia/pages/auth/signup.vue'), 'utf8')

/** The page plus the section components it delegates its inputs to. */
const SECTIONS_DIR = resolve(ROOT, 'inertia/components/auth/signup')
const sectionFiles = readdirSync(SECTIONS_DIR).filter((file) => file.endsWith('.vue'))
const formSources = [
  pageSource,
  ...sectionFiles.map((file) => readFileSync(resolve(SECTIONS_DIR, file), 'utf8')),
].join('\n')

function validatorFields(): string[] {
  const start = validatorSource.indexOf('export const signupValidator = vine.create({')
  expect(start, 'signupValidator not found in app/validators/user.ts').toBeGreaterThan(-1)

  const body = validatorSource.slice(start).split('\n})')[0]

  return [...body.matchAll(/^ {2}(\w+):/gm)].map((m) => m[1])
}

/** Field names posted by the form (`name="…"` on inputs and selects). */
function formFieldNames(): string[] {
  return [...formSources.matchAll(/\bname="([\w.[\]]+)"/g)].map((m) => m[1])
}

/** The `RENDERED_FIELDS` list handed to `<BaseFormErrorSummary>`. */
function declaredRenderedFields(): string[] {
  const block = pageSource.split('const RENDERED_FIELDS = [')[1]?.split(']')[0]
  expect(block, 'RENDERED_FIELDS not found in signup.vue').toBeDefined()

  return [...block!.matchAll(/'([\w]+)'/g)].map((m) => m[1])
}

describe('signup form ↔ signupValidator (#448)', () => {
  test('the validator expects the fields the form actually posts', () => {
    const missing = validatorFields().filter((field) => !formFieldNames().includes(field))

    expect(
      missing,
      `signupValidator expects ${missing.join(', ')} but the signup form renders no such ` +
        'input — those errors would be invisible and the signup would fail silently (#448)'
    ).toEqual([])
  })

  test('the form does not post fields the validator drops', () => {
    const unknown = formFieldNames().filter((field) => !validatorFields().includes(field))

    expect(
      unknown,
      `the signup form posts ${unknown.join(', ')} but signupValidator ignores them — the ` +
        'data would be silently discarded (#448)'
    ).toEqual([])
  })

  test('every validator field is declared as rendered in the error summary', () => {
    expect(declaredRenderedFields().slice().sort()).toEqual(validatorFields().slice().sort())
  })

  test('the page renders the error summary that catches unhandled errors', () => {
    expect(pageSource).toContain('<BaseFormErrorSummary')
    expect(pageSource).toContain(':handled-keys="RENDERED_FIELDS"')
  })

  // Méta-test : le scan ci-dessus ne lit que `components/auth/signup/`. Si une
  // section vivait ailleurs, les champs qu'elle rend échapperaient au garde.
  test('the page imports every section component the scan reads, and no other', () => {
    const imported = [...pageSource.matchAll(/~\/components\/auth\/signup\/([\w]+\.vue)/g)].map(
      (m) => m[1]
    )

    expect(sectionFiles.length).toBeGreaterThan(0)
    // `SignupSectionHeader` est importé par les sections, pas par la page.
    expect(imported.every((file) => sectionFiles.includes(file))).toBe(true)
    expect(pageSource).not.toMatch(/<Base(Input|Select|Textarea)\b/)
  })

  test('the validator does not require a confirmation field the form has no input for', () => {
    const start = validatorSource.indexOf('export const signupValidator = vine.create({')
    const body = validatorSource.slice(start).split('\n})')[0]

    expect(body).not.toContain('confirmed(')
  })
})
