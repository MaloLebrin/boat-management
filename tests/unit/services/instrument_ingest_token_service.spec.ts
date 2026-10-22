import { test } from '@japa/runner'
import InstrumentIngestTokenService from '#services/instrument_ingest_token_service'
import type InstrumentSourceService from '#services/instrument_source_service'
import { INSTRUMENT_INGEST_TOKEN_PREFIX } from '#shared/constants/instruments'

const service = new InstrumentIngestTokenService({} as InstrumentSourceService)
const TOKEN = `${INSTRUMENT_INGEST_TOKEN_PREFIX}abcDEF123_-`

test.group('InstrumentIngestTokenService — pur (#994)', () => {
  test('hash : sha256 hexadécimal, déterministe, sensible à chaque caractère', ({ assert }) => {
    const hash = service.hash(TOKEN)
    assert.match(hash, /^[0-9a-f]{64}$/)
    assert.equal(hash, service.hash(TOKEN))
    assert.notEqual(hash, service.hash(`${TOKEN}x`))
    assert.notInclude(hash, TOKEN)
  })

  test('extractBearer lit « Bearer <jeton> », sans tenir compte de la casse ni des espaces', ({
    assert,
  }) => {
    assert.equal(service.extractBearer(`Bearer ${TOKEN}`), TOKEN)
    assert.equal(service.extractBearer(`bearer   ${TOKEN}  `), TOKEN)
  })

  test('extractBearer refuse tout ce qui n’est pas un jeton d’ingestion', ({ assert }) => {
    assert.isNull(service.extractBearer(undefined))
    assert.isNull(service.extractBearer(''))
    assert.isNull(service.extractBearer(TOKEN))
    assert.isNull(service.extractBearer('Basic dXNlcjpwYXNz'))
    assert.isNull(service.extractBearer('Bearer'))
    assert.isNull(service.extractBearer('Bearer not-prefixed-token'))
    assert.isNull(service.extractBearer(`Bearer ${TOKEN} extra`))
    assert.isNull(
      service.extractBearer(`Bearer ${INSTRUMENT_INGEST_TOKEN_PREFIX}${'a'.repeat(200)}`)
    )
  })
})
