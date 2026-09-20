import { test } from '@japa/runner'
import {
  buildGhostscriptArgs,
  GHOSTSCRIPT_EXEC_OPTIONS,
  PDF_COMPRESSION_MAX_BUFFER,
  PDF_COMPRESSION_TIMEOUT_MS,
} from '#services/pdf_service'

const IN = '/tmp/11111111-2222-3333-4444-555555555555'
const OUT = '/tmp/66666666-7777-8888-9999-000000000000.pdf'

test.group('PdfService — Ghostscript invocation (unit)', () => {
  test('enables the sandbox explicitly instead of relying on the packaged default', ({
    assert,
  }) => {
    assert.include(buildGhostscriptArgs(IN, OUT), '-dSAFER')
  })

  test('reads the input path as a file even when it looks like a switch', ({ assert }) => {
    const args = buildGhostscriptArgs('/tmp/-dNODISPLAY', OUT)

    assert.equal(args.at(-2), '-f')
    assert.equal(args.at(-1), '/tmp/-dNODISPLAY')
  })

  test('still writes to the requested output file', ({ assert }) => {
    assert.include(buildGhostscriptArgs(IN, OUT), `-sOutputFile=${OUT}`)
  })

  test('bounds the run so a hostile PDF cannot hold a queue worker', ({ assert }) => {
    assert.equal(GHOSTSCRIPT_EXEC_OPTIONS.timeout, PDF_COMPRESSION_TIMEOUT_MS)
    assert.isAbove(GHOSTSCRIPT_EXEC_OPTIONS.timeout, 0)
    // Ghostscript ne sort pas toujours sur SIGTERM : sans SIGKILL le timeout
    // ne garantit rien.
    assert.equal(GHOSTSCRIPT_EXEC_OPTIONS.killSignal, 'SIGKILL')
  })

  test('raises the stderr buffer above the 1MB execFile default', ({ assert }) => {
    assert.equal(GHOSTSCRIPT_EXEC_OPTIONS.maxBuffer, PDF_COMPRESSION_MAX_BUFFER)
    assert.isAbove(GHOSTSCRIPT_EXEC_OPTIONS.maxBuffer, 1024 * 1024)
  })
})
