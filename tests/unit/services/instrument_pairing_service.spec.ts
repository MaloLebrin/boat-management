import { readFile } from 'node:fs/promises'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import InstrumentPairingService from '#services/instrument_pairing_service'
import {
  INSTRUMENT_PAIRING_USER_CODE_ALPHABET,
  INSTRUMENT_PAIRING_USER_CODE_LENGTH,
} from '#shared/constants/instruments'
import {
  formatInstrumentPairingUserCode,
  normalizeInstrumentPairingUserCode,
} from '#shared/helpers/instruments'

/** Génération et empreintes des codes d'appairage (#1032). */

test.group('InstrumentPairingService — codes (unit)', (group) => {
  let service: InstrumentPairingService
  group.setup(async () => {
    service = await app.container.make(InstrumentPairingService)
  })

  test('l’alphabet du userCode n’a aucun caractère ambigu', ({ assert }) => {
    for (const ambiguous of ['0', 'O', '1', 'I', 'L']) {
      assert.notInclude(INSTRUMENT_PAIRING_USER_CODE_ALPHABET, ambiguous)
    }
    assert.lengthOf(INSTRUMENT_PAIRING_USER_CODE_ALPHABET, 31)
    assert.equal(new Set(INSTRUMENT_PAIRING_USER_CODE_ALPHABET).size, 31)
  })

  test('un userCode a la forme XXXX-XXXX et n’utilise que l’alphabet', ({ assert }) => {
    for (let index = 0; index < 500; index++) {
      const code = service.generateUserCode()
      assert.match(code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/)
      for (const char of code.replace('-', '')) {
        assert.include(INSTRUMENT_PAIRING_USER_CODE_ALPHABET, char)
      }
    }
  })

  test('les userCodes sont uniques en pratique et couvrent l’alphabet', ({ assert }) => {
    const codes = new Set<string>()
    const symbols = new Set<string>()
    for (let index = 0; index < 5000; index++) {
      const code = service.generateUserCode()
      codes.add(code)
      for (const char of code.replace('-', '')) symbols.add(char)
    }
    assert.equal(codes.size, 5000)
    assert.equal(symbols.size, INSTRUMENT_PAIRING_USER_CODE_ALPHABET.length)
  })

  test('les deviceCodes sont longs, préfixés et uniques', ({ assert }) => {
    const codes = new Set(Array.from({ length: 200 }, () => service.generateDeviceCode()))
    assert.equal(codes.size, 200)
    for (const code of codes) {
      assert.match(code, /^fai_pair_[A-Za-z0-9_-]{43}$/)
    }
  })

  test('les empreintes sont stables, hexadécimales et ne contiennent pas le code', ({ assert }) => {
    const deviceCode = service.generateDeviceCode()
    assert.match(service.hashDeviceCode(deviceCode), /^[0-9a-f]{64}$/)
    assert.equal(service.hashDeviceCode(deviceCode), service.hashDeviceCode(deviceCode))
    assert.notEqual(service.hashDeviceCode(deviceCode), service.hashDeviceCode(`${deviceCode}x`))
    assert.notInclude(service.hashDeviceCode(deviceCode), deviceCode)

    assert.match(service.hashUserCode('ABCD2345'), /^[0-9a-f]{64}$/)
    assert.equal(service.hashUserCode('ABCD2345'), service.hashUserCode('ABCD2345'))
    assert.notEqual(service.hashUserCode('ABCD2345'), service.hashUserCode('ABCD2346'))
  })

  test('l’empreinte du userCode est une HMAC : elle diffère d’un sha256 nu', async ({ assert }) => {
    const { createHash } = await import('node:crypto')
    assert.notEqual(
      service.hashUserCode('ABCD2345'),
      createHash('sha256').update('ABCD2345').digest('hex')
    )
  })
})

test.group('Codes d’appairage — normalisation (unit)', () => {
  test('normalise la casse, les tirets et les espaces', ({ assert }) => {
    assert.equal(normalizeInstrumentPairingUserCode('abcd-2345'), 'ABCD2345')
    assert.equal(normalizeInstrumentPairingUserCode(' ab cd 23-45 '), 'ABCD2345')
  })

  test('refuse la mauvaise longueur et les caractères hors alphabet', ({ assert }) => {
    assert.isNull(normalizeInstrumentPairingUserCode(''))
    assert.isNull(normalizeInstrumentPairingUserCode('ABCD234'))
    assert.isNull(normalizeInstrumentPairingUserCode('ABCD23456'))
    assert.isNull(normalizeInstrumentPairingUserCode('ABCD-0O1I'))
    assert.equal(INSTRUMENT_PAIRING_USER_CODE_LENGTH, 8)
  })

  test('le format affiché est le réciproque de la normalisation', ({ assert }) => {
    assert.equal(formatInstrumentPairingUserCode('ABCD2345'), 'ABCD-2345')
    assert.equal(normalizeInstrumentPairingUserCode('ABCD-2345'), 'ABCD2345')
  })
})

test.group('Appairage — aucun secret dans les journaux (unit)', () => {
  const FILES = [
    'app/services/instrument_pairing_service.ts',
    'app/controllers/instrument_pairing_api_controller.ts',
    'app/controllers/instrument_pairings_controller.ts',
    'app/jobs/purge_instrument_pairings.ts',
  ]

  test('les fichiers du flux n’écrivent que des compteurs dans le logger', async ({ assert }) => {
    for (const file of FILES) {
      const source = await readFile(app.makePath(file), 'utf8')
      const calls = source.match(/logger\.\w+\([^)]*\)/g) ?? []
      for (const call of calls) {
        assert.notMatch(call, /deviceCode|userCode|token|request|body/i, `${file} : ${call}`)
      }
    }
  })
})
