import { test } from '@japa/runner'
import ExcelJS from 'exceljs'
import {
  cellToString,
  normalizeImportToken,
  parseCsvContent,
  parseXlsxBuffer,
} from '#services/table_file_parser_service'

/** Classeur minimal : une feuille, une ligne d'en-têtes, des lignes de données. */
async function buildWorkbook(rows: unknown[][], sheetName = 'Dépenses'): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(sheetName)
  for (const row of rows) sheet.addRow(row)
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

test.group('normalizeImportToken (unit)', () => {
  test('retire accents, casse, BOM et espaces superflus', ({ assert }) => {
    assert.equal(normalizeImportToken('﻿  Libellé '), 'libelle')
    assert.equal(normalizeImportToken('CATÉGORIE'), 'categorie')
    assert.equal(normalizeImportToken('Coût   total'), 'cout total')
    assert.equal(normalizeImportToken('Équipement'), 'equipement')
  })
})

test.group('parseCsvContent (unit)', () => {
  test('sépare sur le point-virgule et met les en-têtes en minuscules', ({ assert }) => {
    const table = parseCsvContent('﻿Date;Libellé;Montant\n2024-01-15;"Plein; gasoil";120,50\n')

    assert.deepEqual(table.headers, ['date', 'libellé', 'montant'])
    assert.deepEqual(table.rows, [['2024-01-15', 'Plein; gasoil', '120,50']])
  })
})

test.group('cellToString (unit)', () => {
  test('une date Excel sort en ISO, en UTC', ({ assert }) => {
    assert.equal(cellToString(new Date(Date.UTC(2026, 0, 15))), '2026-01-15')
  })

  test('nombres, booléens et vides', ({ assert }) => {
    assert.equal(cellToString(120.5), '120.5')
    assert.equal(cellToString(true), 'true')
    assert.equal(cellToString(null), '')
    assert.equal(cellToString(undefined), '')
  })

  test('texte riche, formule et lien', ({ assert }) => {
    assert.equal(
      cellToString({ richText: [{ text: 'Plein ' }, { text: 'gasoil' }] }),
      'Plein gasoil'
    )
    assert.equal(cellToString({ formula: 'A1*2', result: 241 }), '241')
    assert.equal(cellToString({ formula: 'A1*2' }), '')
    assert.equal(cellToString({ text: 'Facture', hyperlink: 'https://example.com' }), 'Facture')
    assert.equal(cellToString({ error: '#N/A' }), '')
  })
})

test.group('parseXlsxBuffer (unit)', () => {
  test('première feuille : ligne 1 en en-têtes minuscules, données en texte', async ({
    assert,
  }) => {
    const buffer = await buildWorkbook([
      ['Date', 'Libellé', 'Montant', 'Catégorie'],
      [new Date(Date.UTC(2026, 0, 15)), 'Antifouling', 350, 'maintenance'],
      [new Date(Date.UTC(2026, 1, 3)), 'Plein gasoil', 120.5, 'carburant'],
    ])

    const table = await parseXlsxBuffer(buffer)

    assert.deepEqual(table.headers, ['date', 'libellé', 'montant', 'catégorie'])
    assert.deepEqual(table.rows, [
      ['2026-01-15', 'Antifouling', '350', 'maintenance'],
      ['2026-02-03', 'Plein gasoil', '120.5', 'carburant'],
    ])
  })

  test('les lignes entièrement vides sont ignorées, les cellules manquantes valent ""', async ({
    assert,
  }) => {
    const buffer = await buildWorkbook([
      ['date', 'label', 'amount'],
      ['2026-01-15', 'Antifouling'],
      [null, null, null],
      ['2026-01-16', 'Bouée', 45],
    ])

    const table = await parseXlsxBuffer(buffer)

    assert.deepEqual(table.rows, [
      ['2026-01-15', 'Antifouling', ''],
      ['2026-01-16', 'Bouée', '45'],
    ])
  })

  test('le résultat d’une formule est pris, pas la formule', async ({ assert }) => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('S')
    sheet.addRow(['date', 'label', 'amount'])
    const row = sheet.addRow(['2026-01-15', 'Deux pleins', null])
    row.getCell(3).value = { formula: '60*2', result: 120 }
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer())

    const table = await parseXlsxBuffer(buffer)

    assert.deepEqual(table.rows, [['2026-01-15', 'Deux pleins', '120']])
  })

  test('un classeur sans feuille ou sans en-têtes rend une table vide', async ({ assert }) => {
    const empty = new ExcelJS.Workbook()
    const emptyBuffer = Buffer.from(await empty.xlsx.writeBuffer())
    assert.deepEqual(await parseXlsxBuffer(emptyBuffer), { headers: [], rows: [] })

    const blank = await buildWorkbook([[null, null]])
    assert.deepEqual(await parseXlsxBuffer(blank), { headers: [], rows: [] })
  })

  test('un fichier qui n’est pas un classeur lève', async ({ assert }) => {
    await assert.rejects(() => parseXlsxBuffer(Buffer.from('date;label;amount\n')))
  })
})
