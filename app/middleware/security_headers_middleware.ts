import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * En-têtes de sécurité que Shield ne sait pas poser (#770).
 *
 * `config/shield.ts` couvre CSP, CSRF, `X-Frame-Options`, HSTS et le
 * anti-sniffing, mais pas `Referrer-Policy`. Sans elle, le navigateur envoie
 * l'URL complète — query string comprise — dans l'en-tête `Referer` de chaque
 * sous-requête vers une autre origine. La CSP autorise `res.cloudinary.com`
 * en `imgSrc` : Cloudinary recevait donc l'URL de la page dès qu'elle affichait
 * une photo de bateau.
 *
 * `strict-origin-when-cross-origin` (le défaut des navigateurs récents, ici
 * rendu explicite et donc indépendant du navigateur) garde le chemin complet
 * pour les requêtes de même origine et ne transmet que l'origine au-delà.
 *
 * Ce middleware est enregistré au niveau **serveur** et non par Shield : le
 * kernel retire Shield du pipeline en test (`app.inTest ? [] : [...]`), donc
 * un en-tête posé par Shield ne serait couvert par aucun test fonctionnel.
 */
export default class SecurityHeadersMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    ctx.response.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    return next()
  }
}
