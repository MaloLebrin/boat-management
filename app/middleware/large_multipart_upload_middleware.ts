import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import logger from '@adonisjs/core/services/logger'
import {
  extnameOf,
  largeUploadLimitFor,
  MAX_FILES_PER_BATCH,
  MEDIA_BATCH_RULES,
  mediaBatchKindFor,
} from '#shared/constants/media'

/**
 * The batch upload routes are declared in `processManually` (config/bodyparser.ts),
 * so the bodyparser middleware creates `request.multipart` but leaves it unprocessed
 * (`state === 'idle'`). This middleware re-drives the default multipart streaming for
 * those routes with a higher `limit`, keeping every other multipart route on the base
 * limit. Mirrors the framework's own wildcard file handler — the `reporter` provided by
 * AdonisJS feeds `file.size`, which MediaService relies on for quota checks.
 *
 * ## Ce que ce middleware refuse, et pourquoi si tôt (#764)
 *
 * Il écrivait **chaque partie en entier sur le disque** avant qu'aucun
 * validateur ne s'exécute : `onFile('*')` accepte n'importe quelle partie,
 * `deferValidations: true` reporte explicitement les contrôles, et le plafond
 * unique de 400 Mo valait pour les douze routes — soit le double de ce qu'un
 * lot de photos peut légitimement atteindre. Un attaquant authentifié n'avait
 * même pas besoin d'envoyer des fichiers valides : 400 Mo de zéros sous un
 * nom de champ quelconque étaient écrits puis rejetés. En conteneur, où
 * `/tmp` partage souvent le volume applicatif, quelques requêtes concurrentes
 * suffisaient à remplir le disque et à faire tomber l'app entière — pas
 * seulement l'upload.
 *
 * Trois gardes, dans l'ordre du coût croissant :
 *
 * 1. **le plafond de charge utile** est calé sur la route (200 Mo pour un lot
 *    de photos, 400 Mo pour un lot de documents) ;
 * 2. **l'extension** est lue sur `part.filename` avant le moindre octet écrit,
 *    depuis la même source que le validateur ;
 * 3. **le nombre de parties** est borné ici aussi, sans attendre le
 *    `maxLength(20)` en aval.
 *
 * Une partie refusée est **drainée** sans toucher le disque : il faut bien
 * consommer le flux pour que l'analyse multipart continue, mais rien n'est
 * écrit. Le validateur en aval rend ensuite l'erreur habituelle à
 * l'utilisateur — le refus précoce ne change pas ce qu'il voit, seulement ce
 * que ça coûte.
 */
export default class LargeMultipartUploadMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { request } = ctx

    if (request.bodyType !== 'multipart' || request.multipart.state !== 'idle') {
      return next()
    }

    const pattern = ctx.route?.pattern ?? ''
    const kind = mediaBatchKindFor(pattern)
    const allowedExtnames = kind ? MEDIA_BATCH_RULES[kind].extnames : []

    /** Chemins écrits par cette requête, pour le ménage de fin. */
    const writtenPaths: string[] = []
    let accepted = 0

    request.multipart.onFile('*', { deferValidations: true }, async (part, reporter) => {
      const extname = extnameOf(part.filename ?? '')
      const tooMany = accepted >= MAX_FILES_PER_BATCH
      const wrongExtname = allowedExtnames.length > 0 && !allowedExtnames.includes(extname)

      if (tooMany || wrongExtname) {
        // Drainer plutôt qu'écrire : le flux doit être consommé pour que
        // l'analyse continue, mais aucun octet ne touche le disque.
        part.resume()
        await new Promise<void>((resolve) => {
          part.on('end', resolve)
          part.on('error', resolve)
        })
        return
      }

      accepted += 1
      const tmpPath = join(tmpdir(), randomUUID())
      part.pause()
      part.on('data', reporter)

      const writeStream = createWriteStream(tmpPath)
      try {
        await pipeline(part, writeStream)
        writtenPaths.push(tmpPath)
        return { tmpPath }
      } catch (error) {
        await unlink(tmpPath).catch(() => {})
        request.multipart.abort(error)
      }
    })

    try {
      await request.multipart.process({ limit: largeUploadLimitFor(pattern) })
      return await next()
    } finally {
      // Les fichiers rejetés par le validateur en aval n'étaient nettoyés par
      // personne : le `unlink` du `catch` ci-dessus ne couvre que l'échec du
      // `pipeline`. On dépendait du ménage de `/tmp` par l'OS (#764).
      //
      // Sûr à ce stade : les envois sur Cloudinary se font dans la requête,
      // pas dans un job différé — aucun consommateur ne lit ces chemins après
      // la réponse.
      await Promise.all(
        writtenPaths.map((path) =>
          unlink(path).catch((error: NodeJS.ErrnoException) => {
            if (error.code !== 'ENOENT') {
              logger.warn({ err: error, path }, 'failed to clean up a batch upload temp file')
            }
          })
        )
      )
    }
  }
}
