import { test } from '@japa/runner'
import {
  buildLocaleSwitchHref,
  hasLocalePathPrefix,
  stripLocalePathPrefix,
} from '#shared/helpers/locale_path'

test.group('locale_path', () => {
  test('does not strip arbitrary two-letter segments from /login', ({ assert }) => {
    assert.equal(stripLocalePathPrefix('/login'), '/login')
    assert.isFalse(hasLocalePathPrefix('/login'))
    assert.isNull(buildLocaleSwitchHref('/login', 'fr'))
  })

  test('swaps marketing locale prefix', ({ assert }) => {
    assert.equal(buildLocaleSwitchHref('/en/tarifs', 'fr'), '/fr/tarifs')
    assert.equal(buildLocaleSwitchHref('/fr/tarifs', 'en'), '/en/tarifs')
  })

  test('maps about page slug per locale', ({ assert }) => {
    assert.equal(buildLocaleSwitchHref('/en/about', 'fr'), '/fr/a-propos')
    assert.equal(buildLocaleSwitchHref('/fr/a-propos', 'en'), '/en/about')
  })

  test('switches locale home', ({ assert }) => {
    assert.equal(buildLocaleSwitchHref('/en', 'fr'), '/fr')
    assert.equal(buildLocaleSwitchHref('/fr', 'en'), '/en')
  })
})
