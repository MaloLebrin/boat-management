import { describe, expect, test } from 'vitest'
import { renderFileSize, renderStorageSize } from '../../inertia/utils/format_bytes'

const FR = { bytes: 'o', kb: 'Ko', mb: 'Mo', gb: 'Go' }
const EN = { bytes: 'B', kb: 'KB', mb: 'MB', gb: 'GB' }

const KB = 1024
const MB = 1024 * KB
const GB = 1024 * MB

/**
 * Deux styles, deux écrans : la liste de documents veut la décimale et le
 * palier octet, la jauge de quota veut l'entier et le palier Go. Les sorties
 * françaises reprennent au caractère près ce que rendaient les deux
 * implémentations séparées — l'unification ne change aucun affichage
 * existant, elle ne fait que traduire les unités.
 */
describe('renderFileSize', () => {
  test("sous le kilo-octet, l'octet est l'unité", () => {
    expect(renderFileSize(0, FR)).toBe('0 o')
    expect(renderFileSize(1023, FR)).toBe('1023 o')
  })

  test('du kilo au méga-octet, une décimale', () => {
    expect(renderFileSize(KB, FR)).toBe('1.0 Ko')
    expect(renderFileSize(1536, FR)).toBe('1.5 Ko')
  })

  test('à partir du méga-octet, une décimale et pas de palier Go', () => {
    expect(renderFileSize(MB, FR)).toBe('1.0 Mo')
    expect(renderFileSize(2.25 * MB, FR)).toBe('2.3 Mo')
    // Un document n'atteint pas le Go : il reste compté en Mo, sans plafond.
    expect(renderFileSize(3 * GB, FR)).toBe('3072.0 Mo')
  })

  test("les unités viennent de l'appelant, elles ne sont plus figées", () => {
    expect(renderFileSize(1536, EN)).toBe('1.5 KB')
    expect(renderFileSize(0, EN)).toBe('0 B')
  })
})

describe('renderStorageSize', () => {
  test('sous le méga-octet, arrondi au kilo-octet', () => {
    expect(renderStorageSize(640 * KB, FR)).toBe('640 Ko')
    // Pas de palier octet : un stockage quasi vide se lit « 0 Ko ».
    expect(renderStorageSize(500, FR)).toBe('0 Ko')
  })

  test('du méga au giga-octet, arrondi au méga-octet', () => {
    expect(renderStorageSize(5 * MB, FR)).toBe('5 Mo')
    expect(renderStorageSize(100 * MB, FR)).toBe('100 Mo')
    expect(renderStorageSize(1.6 * MB, FR)).toBe('2 Mo')
  })

  test('à partir du giga-octet, une décimale', () => {
    expect(renderStorageSize(GB, FR)).toBe('1.0 Go')
    expect(renderStorageSize(1.44 * GB, FR)).toBe('1.4 Go')
  })

  test("les unités viennent de l'appelant", () => {
    expect(renderStorageSize(5 * MB, EN)).toBe('5 MB')
    expect(renderStorageSize(GB, EN)).toBe('1.0 GB')
  })
})
