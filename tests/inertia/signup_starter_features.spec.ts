import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, test, vi } from 'vitest'
import { PLAN_LIMITS } from '#shared/types/plan'

/**
 * Les puces sous le bouton d'inscription annonçaient « utilisateurs illimités »
 * alors que Starter en autorise 1 (#455). Elles sont désormais interpolées
 * depuis `PLAN_LIMITS` : ce test vérifie le rendu final, chaînes réelles des
 * deux locales à l'appui.
 */
vi.mock('@inertiajs/vue3', async () => {
  const actual = await vi.importActual<typeof import('@inertiajs/vue3')>('@inertiajs/vue3')
  return { ...actual, usePage: vi.fn() }
})

import { usePage } from '@inertiajs/vue3'
import { useT } from '../../inertia/composables/use_t'

const ROOT = resolve(__dirname, '../..')

function signupStrings(locale: 'fr' | 'en'): Record<string, string> {
  const json = JSON.parse(readFileSync(resolve(ROOT, `resources/lang/${locale}/auth.json`), 'utf8'))
  return Object.fromEntries(
    Object.entries(json.signup as Record<string, unknown>)
      .filter(([, value]) => typeof value === 'string')
      .map(([key, value]) => [`auth.signup.${key}`, value as string])
  )
}

function translator(locale: 'fr' | 'en') {
  vi.mocked(usePage).mockReturnValue({
    props: { locale, appT: signupStrings(locale) },
  } as ReturnType<typeof usePage>)

  let result: ReturnType<typeof useT> | undefined
  mount(
    defineComponent({
      setup() {
        result = useT()
        return {}
      },
      template: '<div />',
    })
  )
  return result!.t
}

describe('Puces du plan Starter sur /signup (#455)', () => {
  const boats = PLAN_LIMITS.starter.maxBoats!
  const members = PLAN_LIMITS.starter.maxMembers!

  test('[fr] les quotas réels sont rendus, au bon pluriel', () => {
    const t = translator('fr')

    expect(t('auth.signup.featureBoats', { count: boats })).toBe(`${boats} bateaux gratuits`)
    expect(t('auth.signup.featureUsers', { count: members })).toBe(`${members} utilisateur inclus`)
  })

  test('[en] les quotas réels sont rendus, au bon pluriel', () => {
    const t = translator('en')

    expect(t('auth.signup.featureBoats', { count: boats })).toBe(`${boats} free boats`)
    expect(t('auth.signup.featureUsers', { count: members })).toBe(`${members} user included`)
  })

  for (const locale of ['fr', 'en'] as const) {
    test(`[${locale}] les bornes du mot de passe sont interpolées, pas écrites en dur`, () => {
      const t = translator(locale)
      const vars = { min: 8, max: 32 }

      for (const key of ['auth.signup.passwordPlaceholder', 'auth.signup.passwordHint']) {
        const rendered = t(key, vars)
        expect(rendered).toContain('8')
        expect(rendered).toContain('32')
        expect(rendered).not.toContain('{')
      }
    })
  }
})
