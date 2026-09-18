import { test } from '@japa/runner'
import ProcessMedia from '#jobs/process_media'

/**
 * `ProcessMedia` (#692).
 *
 * ⚠️ Ce job est **du code mort**. Recherché dans tout le dépôt hors de sa
 * propre définition : personne ne l'enfile — ni le téléversement de médias, ni
 * aucun contrôleur, service, listener ou cron. Et `execute()` ne traite rien :
 * il logge un message et marque sa clé de déduplication, exactement comme
 * `GenerateExport` (#699).
 *
 * La garde `tests/unit/hygiene/scheduled_jobs_covered.spec.ts` l'exemptait au
 * motif « couvert par le domaine bateau (#692), avec les fabriques
 * Cloudinary ». Ce motif était faux : les médias de bateau passent par
 * `MediaService` et `CloudinaryService` en direct, jamais par ce job. Une
 * exemption au mauvais motif est pire qu'une absence de test — elle annonce
 * une couverture qui ne viendra pas.
 *
 * Ce qu'on peut tester sans rien simuler : sa clé de déduplication, qui est
 * une fonction pure et bien réelle. L'exemption est levée en conséquence.
 */
test.group('ProcessMedia (placeholder jamais enfilé)', () => {
  test('sa clé de déduplication isole une organisation, une action et un média', ({ assert }) => {
    assert.equal(
      ProcessMedia.dedupKey({
        organizationId: 3,
        requestedByUserId: 1,
        mediaId: 'abc',
        action: 'resize',
      }),
      'media:3:resize:abc'
    )
  })

  test('deux actions différentes sur le même média ne se bloquent pas', ({ assert }) => {
    const base = { organizationId: 3, requestedByUserId: 1, mediaId: 'abc' } as const

    assert.notEqual(
      ProcessMedia.dedupKey({ ...base, action: 'resize' }),
      ProcessMedia.dedupKey({ ...base, action: 'optimize' })
    )
  })

  test("la clé ne dépend pas de l'utilisateur qui demande le traitement", ({ assert }) => {
    // Deux utilisateurs de la même organisation qui demandent le même
    // redimensionnement doivent être dédupliqués ensemble : c'est le même
    // travail. `requestedByUserId` est dans la charge utile, pas dans la clé.
    const base = { organizationId: 3, mediaId: 'abc', action: 'resize' } as const

    assert.equal(
      ProcessMedia.dedupKey({ ...base, requestedByUserId: 1 }),
      ProcessMedia.dedupKey({ ...base, requestedByUserId: 2 })
    )
  })

  test('deux organisations ne partagent jamais une clé', ({ assert }) => {
    const base = { requestedByUserId: 1, mediaId: 'abc', action: 'resize' } as const

    assert.notEqual(
      ProcessMedia.dedupKey({ ...base, organizationId: 3 }),
      ProcessMedia.dedupKey({ ...base, organizationId: 4 })
    )
  })
})
