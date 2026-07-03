import { test } from '@japa/runner'
import { parseMaintenanceCsv } from '#services/csv_import_service'

const HEADER = 'date;title;subject;notes;engine_caption;sail_caption;cost'

test.group('parseMaintenanceCsv (unit)', () => {
  test('ne retourne aucune erreur pour une ligne valide', ({ assert }) => {
    const csv = `${HEADER}\n2024-01-15;Vidange moteur;engine;RAS;Moteur bâbord;;150\n`

    const { previewRows } = parseMaintenanceCsv(csv, 'maintenance')

    assert.lengthOf(previewRows[0].errors, 0)
  })

  test('retourne une clé i18n (pas un message en dur) pour une date invalide', ({ assert }) => {
    const csv = `${HEADER}\nnot-a-date;Vidange moteur;engine;RAS;Moteur bâbord;;150\n`

    const { previewRows } = parseMaintenanceCsv(csv, 'maintenance')
    const error = previewRows[0].errors.find((e) => e.column === 'date')

    assert.exists(error)
    assert.equal(error!.key, 'flash.csv.rowErrors.dateInvalidFormat')
    assert.notInclude(Object.values(error!), 'Date invalide (format attendu : YYYY-MM-DD)')
  })

  test('retourne une clé i18n pour un titre manquant', ({ assert }) => {
    const csv = `${HEADER}\n2024-01-15;;engine;RAS;Moteur bâbord;;150\n`

    const { previewRows } = parseMaintenanceCsv(csv, 'maintenance')
    const error = previewRows[0].errors.find((e) => e.column === 'title')

    assert.exists(error)
    assert.equal(error!.key, 'flash.csv.rowErrors.titleRequired')
  })

  test('retourne une clé i18n avec des params pour un sujet invalide', ({ assert }) => {
    const csv = `${HEADER}\n2024-01-15;Vidange moteur;invalid_subject;RAS;;;150\n`

    const { previewRows } = parseMaintenanceCsv(csv, 'maintenance')
    const error = previewRows[0].errors.find((e) => e.column === 'subject')

    assert.exists(error)
    assert.equal(error!.key, 'flash.csv.rowErrors.subjectInvalid')
    assert.include(error!.params?.values, 'engine')
  })

  test('retourne une clé i18n quand la légende moteur est manquante pour le sujet engine', ({
    assert,
  }) => {
    const csv = `${HEADER}\n2024-01-15;Vidange moteur;engine;RAS;;;150\n`

    const { previewRows } = parseMaintenanceCsv(csv, 'maintenance')
    const error = previewRows[0].errors.find((e) => e.column === 'engine_caption')

    assert.exists(error)
    assert.equal(error!.key, 'flash.csv.rowErrors.engineCaptionRequired')
  })

  test('retourne une clé i18n quand la légende voile est manquante pour le sujet sail', ({
    assert,
  }) => {
    const csv = `${HEADER}\n2024-01-15;Révision voile;sail;RAS;;;150\n`

    const { previewRows } = parseMaintenanceCsv(csv, 'maintenance')
    const error = previewRows[0].errors.find((e) => e.column === 'sail_caption')

    assert.exists(error)
    assert.equal(error!.key, 'flash.csv.rowErrors.sailCaptionRequired')
  })

  test('retourne une clé i18n pour un coût invalide', ({ assert }) => {
    const csv = `${HEADER}\n2024-01-15;Vidange moteur;engine;RAS;Moteur bâbord;;not-a-number\n`

    const { previewRows } = parseMaintenanceCsv(csv, 'maintenance')
    const error = previewRows[0].errors.find((e) => e.column === 'cost')

    assert.exists(error)
    assert.equal(error!.key, 'flash.csv.rowErrors.costInvalid')
  })
})
