import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import SendReminderEmails from '#jobs/send_reminder_emails'
import ReminderEmailService from '#services/reminder_email_service'

/**
 * Campagnes de rappel — cron quotidien 08:00 (#699).
 *
 * Ce job n'a pas de logique propre : il enchaîne neuf appels à
 * `ReminderEmailService`. Son contrat est donc **la liste et l'ordre de ces
 * appels**, et c'est exactement ce qui se perd en silence — retirer une ligne
 * arrête une campagne entière sans qu'aucun test ne bronche, et sans qu'aucun
 * utilisateur ne signale un e-mail qu'il n'a pas reçu.
 *
 * Les campagnes elles-mêmes (qui reçoit quoi, à quel seuil) appartiennent au
 * service ; on ne les rejoue pas ici.
 *
 * ⚠️ Ce que ces tests **mettent au jour** : les neuf appels sont enchaînés sans
 * `try/catch`. Une campagne qui lève arrête donc toutes les suivantes, et le
 * `failed()` du job se contente de logger. C'est figé tel quel ci-dessous —
 * comportement actuel, pas comportement souhaitable.
 */

const CAMPAIGNS = [
  'sendInactiveAccountReminders',
  'sendIncompleteBoatReminders',
  'sendIncompletePortReminders',
  'sendInactiveLoginReminders',
  'sendOverdueTaskReminders',
  'sendEngineTaskReminders',
  'sendBoatCheckReminders',
  'sendDocumentExpirationReminders',
  'sendDocumentExpirationReminders',
] as const

type Call = { name: string; args: unknown[] }

function swapReminderService(failOn?: string): Call[] {
  const calls: Call[] = []
  const record = (name: string) => {
    return async (...args: unknown[]) => {
      calls.push({ name, args })
      if (name === failOn) throw new Error(`${name} a échoué`)
    }
  }

  app.container.swap(ReminderEmailService, () => {
    const fake: Record<string, unknown> = {}
    for (const name of new Set(CAMPAIGNS)) fake[name] = record(name)
    return fake as unknown as ReminderEmailService
  })

  return calls
}

test.group('SendReminderEmails (cron 08:00)', (group) => {
  group.each.teardown(() => {
    app.container.restore(ReminderEmailService)
  })

  test('runs the nine campaigns, in order', async ({ assert }) => {
    const calls = swapReminderService()
    const job = await app.container.make(SendReminderEmails)

    await job.execute()

    assert.deepEqual(
      calls.map((call) => call.name),
      [...CAMPAIGNS]
    )
  })

  test('document expiration runs twice, on its two distinct windows', async ({ assert }) => {
    // 8→30 jours puis 0→7 : deux relances d'urgence différente. Perdre la
    // seconde, c'est ne plus prévenir sur un document qui expire cette semaine.
    const calls = swapReminderService()
    const job = await app.container.make(SendReminderEmails)

    await job.execute()

    const windows = calls
      .filter((call) => call.name === 'sendDocumentExpirationReminders')
      .map((call) => call.args)

    assert.deepEqual(windows, [
      [8, 30],
      [0, 7],
    ])
  })

  test('a failing campaign stops every campaign after it', async ({ assert }) => {
    // Comportement **actuel**, figé délibérément : aucun `try/catch` n'isole les
    // campagnes. Les six qui suivent `sendIncompletePortReminders` ne partent
    // pas, et seul un log en témoigne. Si cette isolation est ajoutée un jour,
    // ce test doit tomber — c'est le but.
    const calls = swapReminderService('sendIncompletePortReminders')
    const job = await app.container.make(SendReminderEmails)

    await assert.rejects(() => job.execute(), 'sendIncompletePortReminders a échoué')

    assert.deepEqual(
      calls.map((call) => call.name),
      ['sendInactiveAccountReminders', 'sendIncompleteBoatReminders', 'sendIncompletePortReminders']
    )
  })
})
