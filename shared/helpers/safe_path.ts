/**
 * Un chemin de navigation interne est-il sûr à passer à `router.visit()` ou à
 * `clients.openWindow()` ? (#780)
 *
 * N'accepte qu'un chemin relatif à l'origine : une barre oblique, et rien qui
 * puisse être relu comme une autorité ou un schéma. Sont donc exclus :
 *
 * - les URL absolues (`https://attaquant.example`) — redirection ouverte
 *   depuis un clic dans l'app ;
 * - les schémas (`javascript:`, `data:`) — `router.visit` ne filtre pas le
 *   schéma, et le service worker passe la valeur à `openWindow()`, qui
 *   accepte des URL absolues par conception ;
 * - les URL **protocol-relative** (`//attaquant.example`), qui ressemblent à
 *   un chemin mais dont le navigateur lit la première partie comme un hôte.
 *   C'est le cas qu'on oublie systématiquement ;
 * - `/\attaquant.example`, que plusieurs navigateurs normalisent en `//`.
 *
 * Pourquoi une allowlist de forme plutôt qu'une liste de schémas interdits :
 * une liste noire est toujours en retard d'un schéma.
 */
export function isSafeInternalPath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false
  if (value[0] !== '/') return false
  if (value[1] === '/' || value[1] === '\\') return false
  // Un caractère de contrôle sert à passer sous un filtre naïf ; il n'a de
  // toute façon rien à faire dans un chemin. `no-control-regex` est désactivé
  // ici parce que c'est précisément ce qu'on veut détecter.
  // eslint-disable-next-line no-control-regex
  return !/[\u0000-\u001F\u007F]/.test(value)
}

/**
 * Le chemin s'il est sûr, `'/'` sinon. Repli utilisé par les consommateurs,
 * qui doivent naviguer quelque part plutôt que de ne rien faire — c'est déjà
 * ce que fait `sw.ts` quand la donnée du push est absente.
 */
export function safeInternalPathOr(value: unknown, fallback = '/'): string {
  return isSafeInternalPath(value) ? value : fallback
}
