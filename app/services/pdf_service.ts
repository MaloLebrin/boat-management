import { inject } from '@adonisjs/core'
import { execFile } from 'node:child_process'
import { unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import { PdfCompressionTimeoutError } from '#exceptions/media_errors'

const execFileAsync = promisify(execFile)

/**
 * Ghostscript est le seul binaire externe de l'app, et il tourne sur un PDF
 * intégralement fourni par l'utilisateur. Sans limite de temps, un document
 * conçu pour faire boucler l'interpréteur immobilise un worker de queue — et
 * la concurrence est de 5 (`config/queue.ts`), donc cinq documents de ce genre
 * bloquent aussi les e-mails, les notifications et les exports (#772).
 *
 * 30 s couvrent très largement la compression d'un PDF de 20 Mo, le plafond
 * du validateur (`app/validators/media.ts`).
 */
export const PDF_COMPRESSION_TIMEOUT_MS = 30_000

/**
 * `-dQUIET` limite le bavardage de Ghostscript, mais le défaut d'`execFile`
 * (1 Mo) fait échouer l'appel de façon opaque dès qu'un PDF génère un flot
 * d'avertissements. On garde une borne, plus haute et explicite.
 */
export const PDF_COMPRESSION_MAX_BUFFER = 8 * 1024 * 1024

/**
 * Ghostscript ne sort pas toujours sur `SIGTERM` : sans `SIGKILL`, le
 * `timeout` ci-dessus ne garantit pas la libération du worker.
 */
export const GHOSTSCRIPT_EXEC_OPTIONS = {
  timeout: PDF_COMPRESSION_TIMEOUT_MS,
  killSignal: 'SIGKILL',
  maxBuffer: PDF_COMPRESSION_MAX_BUFFER,
} as const

export function buildGhostscriptArgs(inputPath: string, outputPath: string): string[] {
  return [
    // Bac à sable : actif par défaut depuis Ghostscript 9.50, explicite ici
    // parce que le Dockerfile prend ce que sert le dépôt Alpine au moment du
    // build. Une option d'une ligne vaut mieux qu'une supposition.
    '-dSAFER',
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    '-dPDFSETTINGS=/ebook',
    '-dNOPAUSE',
    '-dQUIET',
    '-dBATCH',
    `-sOutputFile=${outputPath}`,
    // `-f` force Ghostscript à lire l'opérande suivant comme un nom de
    // fichier, même s'il commence par `-` ou `=`. Inatteignable aujourd'hui
    // (`inputPath` est toujours un chemin absolu dans `tmpdir()`), mais
    // gratuit. On préfère `-f` à `--`, qui bascule gs dans son mode
    // « arguments PostScript » et avale tous les opérandes restants.
    '-f',
    inputPath,
  ]
}

@inject()
export class PdfService {
  async compress(inputPath: string): Promise<{ outputPath: string; cleanup: () => Promise<void> }> {
    const outputPath = join(tmpdir(), `${randomUUID()}.pdf`)

    try {
      await execFileAsync(
        'gs',
        buildGhostscriptArgs(inputPath, outputPath),
        GHOSTSCRIPT_EXEC_OPTIONS
      )
    } catch (error) {
      // Sur ce chemin, `cleanup` n'est jamais rendu à l'appelant : Ghostscript
      // a pourtant pu écrire un PDF partiel avant d'être tué. On nettoie ici,
      // sinon le fichier reste dans `tmpdir()` jusqu'au ménage de l'OS.
      await unlink(outputPath).catch(() => {})

      if (isProcessTimeout(error)) {
        throw new PdfCompressionTimeoutError(PDF_COMPRESSION_TIMEOUT_MS)
      }
      throw error
    }

    return {
      outputPath,
      cleanup: async () => {
        await unlink(outputPath).catch(() => {})
      },
    }
  }
}

/**
 * `child_process` marque `killed` sur un processus abattu au dépassement du
 * `timeout` — c'est ce qui distingue un abus d'un PDF simplement illisible.
 */
function isProcessTimeout(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'killed' in error &&
    (error as { killed?: unknown }).killed === true
  )
}
