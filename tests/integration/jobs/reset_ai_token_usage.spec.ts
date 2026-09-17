import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import AiTokenUsage from '#models/ai_token_usage'
import ResetAiTokenUsage from '#jobs/reset_ai_token_usage'
import { OrganizationFactory } from '#database/factories/organization_factory'

/**
 * Remise à zéro du compteur de tokens IA — cron mensuel, le 1er à 01:00 (#699).
 *
 * Le job efface **le mois précédent**, pas le mois courant :
 *
 * ```ts
 * const previousMonth = DateTime.now().minus({ months: 1 }).toFormat('yyyy-MM')
 * await this.aiTokenQuotaService.resetMonth(previousMonth)
 * ```
 *
 * L'asymétrie est facile à inverser par mégarde, et l'erreur serait invisible :
 * effacer le mois **courant** rendrait le quota IA illimité — chaque
 * organisation repartirait de zéro le 1er, puis garderait un compteur remis à
 * zéro à chaque passage. Personne ne s'en plaindrait, et la facture Mistral
 * parlerait à leur place.
 */

const MONTH_FORMAT = 'yyyy-MM'

async function run() {
  const job = await app.container.make(ResetAiTokenUsage)
  await job.execute()
}

function monthOf(offset: number) {
  return DateTime.now().plus({ months: offset }).toFormat(MONTH_FORMAT)
}

test.group('ResetAiTokenUsage (cron mensuel)', () => {
  test('the previous month is cleared', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    await AiTokenUsage.create({ organizationId: org.id, month: monthOf(-1), tokensUsed: 50_000 })

    await run()

    assert.lengthOf(await AiTokenUsage.query().where('month', monthOf(-1)), 0)
  })

  test('the current month survives — otherwise the quota would never bind', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    await AiTokenUsage.create({ organizationId: org.id, month: monthOf(0), tokensUsed: 120_000 })
    await AiTokenUsage.create({ organizationId: org.id, month: monthOf(-1), tokensUsed: 50_000 })

    await run()

    const current = await AiTokenUsage.query().where('month', monthOf(0))
    assert.lengthOf(current, 1)
    assert.equal(current[0].tokensUsed, 120_000)
  })

  test('every organization of the previous month is cleared, not just one', async ({ assert }) => {
    const [first, second] = await OrganizationFactory.createMany(2)
    await AiTokenUsage.create({ organizationId: first.id, month: monthOf(-1), tokensUsed: 10 })
    await AiTokenUsage.create({ organizationId: second.id, month: monthOf(-1), tokensUsed: 20 })

    await run()

    assert.lengthOf(await AiTokenUsage.query().where('month', monthOf(-1)), 0)
  })

  test('an older month is left untouched', async ({ assert }) => {
    // Le job ne vise qu'un mois : l'historique plus ancien, s'il en reste,
    // n'est pas de son ressort. Figé tel quel — un nettoyage plus large serait
    // une décision, pas un effet de bord.
    const org = await OrganizationFactory.create()
    await AiTokenUsage.create({ organizationId: org.id, month: monthOf(-6), tokensUsed: 999 })

    await run()

    assert.lengthOf(await AiTokenUsage.query().where('month', monthOf(-6)), 1)
  })
})
