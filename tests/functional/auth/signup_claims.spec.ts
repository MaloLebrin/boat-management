import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '#shared/constants/auth'
import { PLAN_LIMITS } from '#shared/types/plan'

/**
 * Garde-fou des promesses affichées sur la page d'inscription (#455).
 *
 * La page annonçait « 14 caractères minimum » (le validator impose 8–32),
 * « un lien de confirmation » (aucune vérification d'e-mail n'existe) et
 * « utilisateurs illimités » (Starter en autorise 1). Ces chaînes sont servies
 * dans `appT` : les lire ici les confronte aux règles réelles du produit.
 */
async function fetchSignupStrings(
  client: ApiClient,
  locale: 'fr' | 'en'
): Promise<Record<string, string>> {
  const response = await client.get('/signup').cookie('locale', locale).withInertia()
  response.assertStatus(200)

  const appT = (response.body().props as { appT: Record<string, string> }).appT
  return Object.fromEntries(Object.entries(appT).filter(([key]) => key.startsWith('auth.signup.')))
}

test.group('Signup — promesses alignées sur le produit (#455)', () => {
  for (const locale of ['fr', 'en'] as const) {
    test(`[${locale}] les bornes du mot de passe viennent du validator`, async ({
      client,
      assert,
    }) => {
      const strings = await fetchSignupStrings(client, locale)

      for (const key of ['auth.signup.passwordPlaceholder', 'auth.signup.passwordHint']) {
        const value = strings[key]
        assert.isDefined(value, `${key} manquante en ${locale}`)
        // Les bornes sont interpolées depuis `shared/constants/auth.ts` : aucun
        // nombre en dur ne peut donc plus diverger du validator.
        assert.notMatch(value, /\d/, `${key} contient un nombre en dur`)
        assert.include(value, '{min}')
        assert.include(value, '{max}')
      }

      assert.equal(PASSWORD_MIN_LENGTH, 8)
      assert.isTrue(PASSWORD_MAX_LENGTH > PASSWORD_MIN_LENGTH)
    })

    test(`[${locale}] aucune promesse de vérification d'e-mail`, async ({ client, assert }) => {
      const strings = await fetchSignupStrings(client, locale)

      // Il n'existe qu'un e-mail de bienvenue : pas de lien de confirmation.
      assert.notMatch(strings['auth.signup.emailHint'], /confirm|vérif|verif/i)
    })

    test(`[${locale}] le plan gratuit n'est pas annoncé comme illimité`, async ({
      client,
      assert,
    }) => {
      const strings = await fetchSignupStrings(client, locale)

      for (const [key, value] of Object.entries(strings)) {
        assert.notMatch(value, /illimit|unlimited/i, `${key} promet de l'illimité`)
      }

      // Les puces reprennent les quotas réels du plan Starter.
      assert.isDefined(strings['auth.signup.featureBoats'])
      assert.isDefined(strings['auth.signup.featureUsers'])
      assert.isNotNull(PLAN_LIMITS.starter.maxBoats)
      assert.isNotNull(PLAN_LIMITS.starter.maxMembers)
    })

    test(`[${locale}] aucune promesse de période d'essai facturée`, async ({ client, assert }) => {
      const strings = await fetchSignupStrings(client, locale)

      // Le produit est freemium, sans essai de 14 jours (#453).
      assert.isUndefined(strings['auth.signup.featureNoCharge'])
      for (const [key, value] of Object.entries(strings)) {
        assert.notMatch(value, /J\+14|day 14|14 jours|14 days/i, `${key} promet un essai de 14 j`)
      }
    })
  }
})
