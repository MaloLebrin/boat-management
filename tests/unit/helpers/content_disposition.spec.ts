import { test } from '@japa/runner'
import { contentDisposition } from '#shared/helpers/content_disposition'

test.group('content_disposition', () => {
  test('attachment by default, with the RFC 5987 encoded twin', ({ assert }) => {
    assert.equal(
      contentDisposition('facture-2026-001.pdf'),
      `attachment; filename="facture-2026-001.pdf"; filename*=UTF-8''facture-2026-001.pdf`
    )
  })

  test('inline when asked', ({ assert }) => {
    assert.equal(
      contentDisposition('contrat.pdf', { inline: true }),
      `inline; filename="contrat.pdf"; filename*=UTF-8''contrat.pdf`
    )
  })

  test('neutralises control characters, quotes and backslashes (no header splitting)', ({
    assert,
  }) => {
    const header = contentDisposition('evil"\r\nX-Injected: 1\\.pdf')

    assert.notMatch(header, /[\r\n]/)
    // `"`, CR et LF → trois `_` ; l'antislash final → un quatrième.
    assert.include(header, 'filename="evil___X-Injected: 1_.pdf"')
    assert.include(header, `filename*=UTF-8''evil%22%0D%0AX-Injected%3A%201%5C.pdf`)
  })

  test('keeps accents readable through filename*', ({ assert }) => {
    const header = contentDisposition('rôle-équipage.pdf')

    assert.include(header, 'filename="rôle-équipage.pdf"')
    assert.include(header, `filename*=UTF-8''r%C3%B4le-%C3%A9quipage.pdf`)
  })
})
