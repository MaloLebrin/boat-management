import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import GenerateAiSuggestions from '#jobs/generate_ai_suggestions'
import AiProactiveSuggestionService from '#services/ai_proactive_suggestion_service'

/**
 * Suggestions IA proactives — cron quotidien 05:00 (#699).
 *
 * Planifié **avant** le scan de flotte de 07:00, à dessein : les notifications
 * « nouvelles suggestions » doivent partir avec la fournée du matin. L'ordre des
 * deux crons est donc un contrat, pas un hasard — il est figé par les
 * expressions cron elles-mêmes, vérifiées par
 * `tests/unit/hygiene/scheduled_jobs_covered.spec.ts`.
 *
 * Le contenu des suggestions appartient à `AiProactiveSuggestionService`
 * (`tests/integration/services/ai_proactive_suggestion_service.spec.ts`). Ce qui
 * n'était couvert nulle part, c'est que le cron l'appelle.
 */

test.group('GenerateAiSuggestions (cron 05:00)', (group) => {
  group.each.teardown(() => {
    app.container.restore(AiProactiveSuggestionService)
  })

  test('the job reaches the proactive suggestion service', async ({ assert }) => {
    let runs = 0
    app.container.swap(
      AiProactiveSuggestionService,
      () =>
        ({
          async run() {
            runs++
            return { created: 0, skipped: 0 }
          },
        }) as unknown as AiProactiveSuggestionService
    )

    const job = await app.container.make(GenerateAiSuggestions)
    await job.execute()

    assert.equal(runs, 1, 'le cron n’a pas appelé son service')
  })

  test('a failing service surfaces instead of being swallowed', async ({ assert }) => {
    // `execute()` n'attrape rien : l'erreur remonte à la file, qui rejouera
    // (`maxRetries: 1`) puis appellera `failed()`. Un `try/catch` ajouté ici
    // rendrait un échec de génération indiscernable d'un succès.
    app.container.swap(
      AiProactiveSuggestionService,
      () =>
        ({
          async run() {
            throw new Error('Mistral indisponible')
          },
        }) as unknown as AiProactiveSuggestionService
    )

    const job = await app.container.make(GenerateAiSuggestions)

    await assert.rejects(() => job.execute(), 'Mistral indisponible')
  })
})
