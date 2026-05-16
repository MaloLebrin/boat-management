import { execFile } from 'node:child_process'
import { unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export class PdfService {
  async compress(inputPath: string): Promise<{ outputPath: string; cleanup: () => Promise<void> }> {
    const outputPath = join(tmpdir(), `${randomUUID()}.pdf`)

    await execFileAsync('gs', [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      '-dPDFSETTINGS=/ebook',
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      `-sOutputFile=${outputPath}`,
      inputPath,
    ])

    return {
      outputPath,
      cleanup: async () => {
        await unlink(outputPath).catch(() => {})
      },
    }
  }
}
