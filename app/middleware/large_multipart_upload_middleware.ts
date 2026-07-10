import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { LARGE_UPLOAD_LIMIT } from '#config/bodyparser'

/**
 * The batch upload routes are declared in `processManually` (config/bodyparser.ts),
 * so the bodyparser middleware creates `request.multipart` but leaves it unprocessed
 * (`state === 'idle'`). This middleware re-drives the default multipart streaming for
 * those routes with a higher `limit`, keeping every other multipart route on the base
 * limit. Mirrors the framework's own wildcard file handler — the `reporter` provided by
 * AdonisJS feeds `file.size`, which MediaService relies on for quota checks.
 */
export default class LargeMultipartUploadMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { request } = ctx

    if (request.bodyType === 'multipart' && request.multipart.state === 'idle') {
      request.multipart.onFile('*', { deferValidations: true }, async (part, reporter) => {
        const tmpPath = join(tmpdir(), randomUUID())
        part.pause()
        part.on('data', reporter)

        const writeStream = createWriteStream(tmpPath)
        try {
          await pipeline(part, writeStream)
          return { tmpPath }
        } catch (error) {
          await unlink(tmpPath).catch(() => {})
          request.multipart.abort(error)
        }
      })

      await request.multipart.process({ limit: LARGE_UPLOAD_LIMIT })
    }

    return next()
  }
}
