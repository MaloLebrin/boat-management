import { test } from '@japa/runner'
import {
  contentTypeForMediaFormat,
  DOCUMENT_EXTNAMES,
  PHOTO_EXTNAMES,
} from '#shared/constants/media'

test.group('contentTypeForMediaFormat (#784)', () => {
  test('mappe chaque extension photo acceptée', ({ assert }) => {
    assert.deepEqual(
      Object.fromEntries(PHOTO_EXTNAMES.map((ext) => [ext, contentTypeForMediaFormat(ext)])),
      {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        heic: 'image/heic',
        webp: 'image/webp',
        gif: 'image/gif',
      }
    )
  })

  test('mappe chaque extension document acceptée', ({ assert }) => {
    assert.deepEqual(
      Object.fromEntries(DOCUMENT_EXTNAMES.map((ext) => [ext, contentTypeForMediaFormat(ext)])),
      {
        pdf: 'application/pdf',
        csv: 'text/csv',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        doc: 'application/msword',
      }
    )
  })

  test('un format inconnu, vide ou dangereux retombe sur octet-stream', ({ assert }) => {
    for (const format of ['html', 'svg', 'xml', 'htm', '', '  ', 'toString']) {
      assert.equal(contentTypeForMediaFormat(format), 'application/octet-stream')
    }
  })

  test('ignore la casse et les espaces', ({ assert }) => {
    assert.equal(contentTypeForMediaFormat('PDF'), 'application/pdf')
    assert.equal(contentTypeForMediaFormat(' JpG '), 'image/jpeg')
  })
})
