import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import BoatDocumentService from '#services/boat_document_service'
import { BOAT_DOCUMENT_EXPIRY_WARNING_DAYS } from '#shared/constants/boats/boat_document_constants'

function makeService(): BoatDocumentService {
  return new BoatDocumentService({ deleteById: async () => {} } as any)
}

function callComputeStatus(service: BoatDocumentService, expiresAt: DateTime | null) {
  return (service as any).computeStatus(expiresAt)
}

test.group('BoatDocumentService.computeStatus (unit)', () => {
  test('retourne valid si expiresAt est null', ({ assert }) => {
    const service = makeService()
    assert.equal(callComputeStatus(service, null), 'valid')
  })

  test('n est pas expired le jour meme de l expiration (bug #162)', ({ assert }) => {
    const service = makeService()
    // Le document expire aujourd'hui : doit etre expiring_soon (pas expired)
    const today = DateTime.now().startOf('day')
    assert.notEqual(callComputeStatus(service, today), 'expired')
  })

  test('retourne expired le lendemain de l expiration', ({ assert }) => {
    const service = makeService()
    const yesterday = DateTime.now().startOf('day').minus({ days: 1 })
    assert.equal(callComputeStatus(service, yesterday), 'expired')
  })

  test('retourne expiring_soon dans la fenetre d avertissement', ({ assert }) => {
    const service = makeService()
    const soon = DateTime.now()
      .startOf('day')
      .plus({ days: BOAT_DOCUMENT_EXPIRY_WARNING_DAYS - 1 })
    assert.equal(callComputeStatus(service, soon), 'expiring_soon')
  })

  test('retourne valid au-dela de la fenetre d avertissement', ({ assert }) => {
    const service = makeService()
    const far = DateTime.now()
      .startOf('day')
      .plus({ days: BOAT_DOCUMENT_EXPIRY_WARNING_DAYS + 1 })
    assert.equal(callComputeStatus(service, far), 'valid')
  })
})
