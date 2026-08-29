import { test } from '@japa/runner'
import { COUNTRY_ALPHA3, COUNTRY_CODES, isCountryCode } from '#shared/constants/countries'
import { countryName, normalizeCountryCode } from '#shared/helpers/countries'

/**
 * Le pavillon d'un bateau et le pays d'un port passent en liste fermée (#580).
 * Ces tests tournent dans le runtime Node/Adonis, celui dont les données ICU
 * doivent être présentes pour que les noms de pays se résolvent — c'est aussi
 * le runtime des PDF et des e-mails.
 */
test.group('shared/constants/countries', () => {
  test('porte les 249 codes ISO 3166-1 alpha-2, sans doublon', ({ assert }) => {
    assert.lengthOf(COUNTRY_CODES, 249)
    assert.lengthOf(new Set(COUNTRY_CODES), 249)
    for (const code of COUNTRY_CODES) assert.match(code, /^[A-Z]{2}$/)
  })

  test('ouvre la liste sur les pavillons maritimes courants', ({ assert }) => {
    assert.deepEqual(COUNTRY_CODES.slice(0, 11), [
      'FR',
      'GB',
      'BE',
      'NL',
      'DE',
      'ES',
      'IT',
      'PT',
      'CH',
      'MT',
      'PL',
    ])
  })

  test('exclut les codes dépréciés et les réservations exceptionnelles', ({ assert }) => {
    // ICU sait les rendre, la norme ne les assigne pas : ils ne doivent jamais
    // être proposés à la saisie (`UK` reste reconnu en *lecture*, cf. plus bas).
    for (const code of ['UK', 'EU', 'AN', 'CS', 'YU', 'SU', 'XK']) {
      assert.isFalse(isCountryCode(code), `${code} ne doit pas être proposé`)
    }
  })

  test('mappe chaque alpha-3 vers un alpha-2 de la liste', ({ assert }) => {
    const entries = Object.entries(COUNTRY_ALPHA3)
    assert.lengthOf(entries, 249)
    for (const [alpha3, alpha2] of entries) {
      assert.match(alpha3, /^[A-Z]{3}$/)
      assert.isTrue(isCountryCode(alpha2), `${alpha3} → ${alpha2} hors liste`)
    }
    assert.equal(COUNTRY_ALPHA3.FRA, 'FR')
    assert.equal(COUNTRY_ALPHA3.GBR, 'GB')
  })
})

test.group('countryName (#580)', () => {
  test('rend le nom du pays dans la locale de l’app', ({ assert }) => {
    assert.equal(countryName('FR', 'fr'), 'France')
    assert.equal(countryName('DE', 'fr'), 'Allemagne')
    assert.equal(countryName('DE', 'en'), 'Germany')
    assert.equal(countryName('GB', 'fr'), 'Royaume-Uni')
    assert.equal(countryName('GB', 'en'), 'United Kingdom')
  })

  test('replie sur l’anglais quand la locale est inconnue ou absente', ({ assert }) => {
    assert.equal(countryName('DE', 'zz'), 'Germany')
    assert.equal(countryName('DE', null), 'Germany')
    assert.equal(countryName('DE'), 'Germany')
  })

  /**
   * Le cœur du contrat : la migration conserve les valeurs qu'elle n'a pas su
   * mapper, l'affichage doit donc les rendre telles quelles plutôt que de les
   * faire disparaître ou d'afficher « région inconnue ».
   */
  test('replie sur la valeur brute pour tout ce qui n’est pas un code de la liste', ({
    assert,
  }) => {
    assert.equal(countryName('Bretagne', 'fr'), 'Bretagne')
    assert.equal(countryName('FRANCE', 'fr'), 'FRANCE')
    assert.equal(countryName('ZZ', 'fr'), 'ZZ')
    assert.equal(countryName('UK', 'fr'), 'UK')
  })

  test('rend une chaîne vide pour une valeur absente', ({ assert }) => {
    assert.equal(countryName(null), '')
    assert.equal(countryName(undefined), '')
    assert.equal(countryName('   '), '')
  })

  /** Garde-fou ICU : un build sans données régionales ferait passer ce test en rouge. */
  test('résout un nom distinct du code pour les 249 pays, en fr et en en', ({ assert }) => {
    for (const code of COUNTRY_CODES) {
      for (const locale of ['fr', 'en']) {
        const name = countryName(code, locale)
        assert.notEqual(name, code, `${code} non résolu en ${locale}`)
        assert.isAbove(name.length, 1)
      }
    }
  })
})

test.group('normalizeCountryCode (#580)', () => {
  test('accepte un alpha-2 quelle que soit sa casse ou ses espaces', ({ assert }) => {
    assert.equal(normalizeCountryCode('FR'), 'FR')
    assert.equal(normalizeCountryCode('fr'), 'FR')
    assert.equal(normalizeCountryCode('  fr  '), 'FR')
  })

  test('rattrape les alpha-3 déjà en base', ({ assert }) => {
    assert.equal(normalizeCountryCode('FRA'), 'FR')
    assert.equal(normalizeCountryCode('gbr'), 'GB')
    assert.equal(normalizeCountryCode('ESP'), 'ES')
  })

  test('reconnaît le nom du pays dans les deux locales, accents compris', ({ assert }) => {
    assert.equal(normalizeCountryCode('France'), 'FR')
    assert.equal(normalizeCountryCode('france'), 'FR')
    assert.equal(normalizeCountryCode('Allemagne'), 'DE')
    assert.equal(normalizeCountryCode('Germany'), 'DE')
    assert.equal(normalizeCountryCode('Royaume-Uni'), 'GB')
    assert.equal(normalizeCountryCode('United Kingdom'), 'GB')
    assert.equal(normalizeCountryCode('Îles Féroé'), 'FO')
    assert.equal(normalizeCountryCode('iles feroe'), 'FO')
  })

  test('reconnaît les alias hors norme et les usages courants', ({ assert }) => {
    assert.equal(normalizeCountryCode('UK'), 'GB')
    assert.equal(normalizeCountryCode('Angleterre'), 'GB')
    assert.equal(normalizeCountryCode('USA'), 'US')
    assert.equal(normalizeCountryCode('Etats-Unis'), 'US')
    assert.equal(normalizeCountryCode('Hollande'), 'NL')
    assert.equal(normalizeCountryCode('Suisse'), 'CH')
  })

  test('rend null quand rien ne colle — l’appelant conserve la valeur', ({ assert }) => {
    assert.isNull(normalizeCountryCode('Bretagne'))
    assert.isNull(normalizeCountryCode('République Française'))
    assert.isNull(normalizeCountryCode('xx'))
    assert.isNull(normalizeCountryCode(''))
    assert.isNull(normalizeCountryCode('   '))
    assert.isNull(normalizeCountryCode(null))
    assert.isNull(normalizeCountryCode(undefined))
  })

  test('est idempotente sur les codes qu’elle produit', ({ assert }) => {
    for (const code of COUNTRY_CODES) assert.equal(normalizeCountryCode(code), code)
  })
})
