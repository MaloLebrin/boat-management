import { readFileSync } from 'node:fs'
import { test } from '@japa/runner'
import { QuotaExceededError, quotaFlashKey, type QuotaFeature } from '#exceptions/quota_errors'

const FEATURES: QuotaFeature[] = [
  'boats',
  'members',
  'ai',
  'ai_tokens',
  'export',
  'storage',
  'clients',
  'pricing',
  'reservations',
  'invoices',
  'ports',
]

function error(feature: QuotaFeature, alreadyOverLimit = false) {
  return new QuotaExceededError(feature, {
    limit: 1,
    current: 2,
    upgradeTo: 'pro',
    alreadyOverLimit,
  })
}

function translations(locale: string): Record<string, string> {
  const flash = JSON.parse(readFileSync(`resources/lang/${locale}/flash.json`, 'utf8')) as {
    quota: Record<string, string>
  }
  return flash.quota
}

test.group('quotaFlashKey', () => {
  test('mappe le nom snake_case sur la clé camelCase traduite', ({ assert }) => {
    // `flash.quota.ai_tokensExceeded` n'existe dans aucune locale : c'est le
    // piège que chaque contrôleur de l'IA contournait à la main.
    assert.equal(quotaFlashKey(error('ai_tokens')), 'flash.quota.aiTokensExceeded')
  })

  test('laisse les noms déjà en un mot tels quels', ({ assert }) => {
    assert.equal(quotaFlashKey(error('boats')), 'flash.quota.boatsExceeded')
    assert.equal(quotaFlashKey(error('export')), 'flash.quota.exportExceeded')
  })

  test('un stockage déjà dépassé a son propre message', ({ assert }) => {
    assert.equal(quotaFlashKey(error('storage', true)), 'flash.quota.storageOverflow')
    assert.equal(quotaFlashKey(error('storage')), 'flash.quota.storageExceeded')
  })

  test('chaque feature résout dans les deux locales', ({ assert }) => {
    for (const locale of ['en', 'fr']) {
      const quota = translations(locale)
      for (const feature of FEATURES) {
        const key = quotaFlashKey(error(feature)).replace('flash.quota.', '')
        assert.isString(quota[key], `flash.quota.${key} manque en ${locale}`)
      }
      const overflow = quotaFlashKey(error('storage', true)).replace('flash.quota.', '')
      assert.isString(quota[overflow], `flash.quota.${overflow} manque en ${locale}`)
    }
  })
})
