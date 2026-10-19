import { readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Sonde Signal K (#985) — page jetable du spike « instruments de bord »,
 * servie uniquement hors production (voir `start/routes/dev.ts`).
 *
 * Le fichier HTML est volontairement autonome (`scripts/spike/signalk_probe.html`,
 * sans Edge ni Vite) : la même page se sert depuis n'importe quel hôte statique
 * en HTTPS (tunnel, GitHub Pages…) pour mesurer le contenu mixte sur un vrai
 * téléphone, où l'app de dev en HTTP ne prouve rien. Ici on n'injecte que le
 * nonce CSP de Shield pour que le script et le style inline passent sans
 * rapport de violation en console — les violations `connect-src` vers le
 * serveur Signal K, elles, sont précisément ce que la sonde doit faire
 * apparaître.
 */
export default class SignalkProbeController {
  async show({ response }: HttpContext) {
    const html = await readFile(app.makePath('scripts/spike/signalk_probe.html'), 'utf8')
    const nonce = response.nonce ?? ''

    return response
      .header('Content-Type', 'text/html; charset=utf-8')
      .send(html.replaceAll('__CSP_NONCE__', nonce))
  }
}
