import { test } from '@japa/runner'
import ProcessBoatMaintenanceImport from '#jobs/process_boat_maintenance_import'

/**
 * `ProcessBoatMaintenanceImport` (#693).
 *
 * ⚠️ Ce job est **du code mort**, jumeau ligne pour ligne de `process_media`
 * traité en #692 : même `QueueDedupService`, même `maxRetries`, même `execute()`
 * réduit à `markRunning` → `logger.info(…)` → `markCompleted`. Recherché dans
 * tout le dépôt hors de sa propre définition : personne ne l'enfile.
 *
 * L'import CSV de maintenance est **entièrement synchrone**, dans la requête
 * HTTP : `CsvImportController.confirm` appelle `importMaintenanceRows` et
 * attend. Aucune file n'intervient — c'est `csv_import_confirm.spec.ts` qui
 * couvre le vrai travail.
 *
 * La garde de #699 exemptait ce job au motif qu'il serait « couvert par le
 * domaine maintenance (#693), avec ses fichiers d'exemple ». Motif doublement
 * faux : ce n'est pas ce job qui importe, et il n'existe aucun fichier CSV dans
 * le dépôt — tous les CSV de test sont des littéraux inline. L'exemption est
 * levée, et la map `EXEMPT` devient vide.
 *
 * Reste testable sans rien simuler : sa clé de déduplication, fonction pure.
 */
test.group('ProcessBoatMaintenanceImport (placeholder jamais enfilé)', () => {
  test('sa clé de déduplication isole une organisation, un bateau et un import', ({ assert }) => {
    assert.equal(
      ProcessBoatMaintenanceImport.dedupKey({
        organizationId: 3,
        boatId: 7,
        requestedByUserId: 1,
        importId: 'abc',
      }),
      'maintenance_import:3:7:abc'
    )
  })

  test('deux imports distincts sur le même bateau ne se bloquent pas', ({ assert }) => {
    const base = { organizationId: 3, boatId: 7, requestedByUserId: 1 } as const

    assert.notEqual(
      ProcessBoatMaintenanceImport.dedupKey({ ...base, importId: 'abc' }),
      ProcessBoatMaintenanceImport.dedupKey({ ...base, importId: 'def' })
    )
  })

  test('le même import sur deux bateaux donne deux clés', ({ assert }) => {
    const base = { organizationId: 3, requestedByUserId: 1, importId: 'abc' } as const

    assert.notEqual(
      ProcessBoatMaintenanceImport.dedupKey({ ...base, boatId: 7 }),
      ProcessBoatMaintenanceImport.dedupKey({ ...base, boatId: 8 })
    )
  })

  test("la clé ne dépend pas de l'utilisateur qui demande l'import", ({ assert }) => {
    // Deux utilisateurs de la même organisation qui relancent le même import
    // doivent être dédupliqués ensemble : c'est le même travail.
    const base = { organizationId: 3, boatId: 7, importId: 'abc' } as const

    assert.equal(
      ProcessBoatMaintenanceImport.dedupKey({ ...base, requestedByUserId: 1 }),
      ProcessBoatMaintenanceImport.dedupKey({ ...base, requestedByUserId: 2 })
    )
  })

  test('deux organisations ne partagent jamais une clé', ({ assert }) => {
    const base = { boatId: 7, requestedByUserId: 1, importId: 'abc' } as const

    assert.notEqual(
      ProcessBoatMaintenanceImport.dedupKey({ ...base, organizationId: 3 }),
      ProcessBoatMaintenanceImport.dedupKey({ ...base, organizationId: 4 })
    )
  })
})
