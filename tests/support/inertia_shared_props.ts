import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Les props partagées par `InertiaMiddleware.share`, **relues depuis le code**
 * plutôt que recopiées (#710).
 *
 * `tests/functional/marketing/props_snapshot.spec.ts` doit écarter ces clés
 * pour ne comparer que les props propres à chaque page. Il en tenait jusqu'ici
 * une copie en dur : ajouter une prop partagée dans le middleware faisait
 * tomber les **vingt** fixtures d'un coup, avec un diff qui montrait vingt
 * fichiers portant une clé en trop — jamais « vous avez ajouté une prop
 * partagée ». Le réflexe devant ce mur rouge est de régénérer les fixtures avec
 * `UPDATE_MARKETING_FIXTURES=1`, ce qui enterre la vraie question : cette prop
 * doit-elle être partagée, et sur les pages publiques ?
 *
 * ⚠️ L'extraction **relit le fichier sur disque** au lieu d'importer le
 * middleware. Instancier `InertiaMiddleware` pour lui demander ses clés
 * supposerait un `HttpContext` complet et rendrait la liste dépendante de
 * l'état de la requête : une prop conditionnelle (`vapidPublicKey` sans push
 * configuré) manquerait à l'appel. Lire la source donne le contrat déclaré,
 * pas ce qu'une requête particulière produit. Même précaution que
 * `tests/unit/hygiene/inertia_pages_covered.spec.ts` (#689),
 * `ci_shards.spec.ts` (#687) et `policies_covered.spec.ts` (#690) : une garde
 * qui partagerait sa source avec sa cible hériterait de ses angles morts.
 */
const MIDDLEWARE_PATH = fileURLToPath(
  new URL('../../app/middleware/inertia_middleware.ts', import.meta.url)
)

/** Clé de premier niveau de l'objet rendu par `share` : six espaces exactement. */
const TOP_LEVEL_KEY = /^ {6}([A-Za-z_$][\w$]*):/gm

/**
 * Garde-fou de l'extraction elle-même. Si un refactor du middleware casse le
 * repérage (return déplacé, indentation changée, objet construit ailleurs),
 * l'extraction rendrait une liste courte ou vide — et le snapshot marketing
 * recommencerait à comparer des props partagées sans que rien ne le dise. Sous
 * ce seuil, on préfère une erreur bruyante à une garde devenue muette.
 */
const MIN_EXPECTED_KEYS = 10

/**
 * Clés partagées déclarées par `InertiaMiddleware.share`, dans l'ordre du
 * code. Jette si le fichier ne se laisse plus lire — une extraction muette
 * vaudrait moins que pas de garde du tout.
 */
export function readSharedPropKeys(): string[] {
  const source = readFileSync(MIDDLEWARE_PATH, 'utf8')

  const shareAt = source.indexOf('async share(')
  if (shareAt === -1) {
    throw new Error(
      'inertia_shared_props : `async share(` est introuvable dans app/middleware/inertia_middleware.ts. ' +
        'Le repérage des props partagées est à reprendre — sans lui, le snapshot marketing compare des props qui ne lui appartiennent pas.'
    )
  }

  // L'objet partagé est le seul `return {` au ras de la méthode (quatre
  // espaces) : les retours imbriqués du callback `assistantConversation` sont
  // plus profonds, et ne rendent pas un littéral.
  const returnAt = source.indexOf('\n    return {\n', shareAt)
  const endAt = returnAt === -1 ? -1 : source.indexOf('\n    }\n', returnAt)
  if (returnAt === -1 || endAt === -1) {
    throw new Error(
      "inertia_shared_props : le `return {` de `share` n'est plus repérable dans app/middleware/inertia_middleware.ts."
    )
  }

  const block = source.slice(returnAt, endAt)
  const keys = [...block.matchAll(TOP_LEVEL_KEY)].map((match) => match[1])

  if (keys.length < MIN_EXPECTED_KEYS) {
    throw new Error(
      `inertia_shared_props : ${keys.length} prop(s) partagée(s) extraite(s) de \`share\`, au moins ${MIN_EXPECTED_KEYS} attendues. ` +
        "L'extraction ne suit plus la forme du middleware — la corriger, ne pas baisser le seuil."
    )
  }

  return keys
}
