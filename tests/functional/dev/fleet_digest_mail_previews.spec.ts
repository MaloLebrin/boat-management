import { test } from '@japa/runner'

/** Aperçus `/dev/mails` des rapports de flotte (#871), dans les deux langues. */
test.group('Dev mail previews — fleet reports (#871)', () => {
  test('the four previews render and are listed', async ({ client, assert }) => {
    const index = await client.get('/dev/mails')
    index.assertStatus(200)
    for (const name of [
      'fleet-weekly-digest-fr',
      'fleet-weekly-digest-en',
      'fleet-monthly-report-fr',
      'fleet-monthly-report-en',
    ]) {
      assert.include(index.text(), name)
      const preview = await client.get(`/dev/mails/${name}`)
      preview.assertStatus(200)
      assert.include(preview.text(), 'Yacht Club Bordeaux')
    }

    const english = await client.get('/dev/mails/fleet-weekly-digest-en')
    assert.include(english.text(), 'overdue tasks')
  })
})
