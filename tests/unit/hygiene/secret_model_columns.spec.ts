import { test } from '@japa/runner'
import { propertyWords, readModelColumns } from '#tests/support/model_columns'

/**
 * Garde de revue des colonnes secrètes (#782).
 *
 * La règle « une colonne qui stocke un secret porte `serializeAs: null` »
 * n'était appliquée qu'à deux endroits (`users.password`,
 * `organization_ai_keys.api_key_encrypted`), et rien ne la rappelait au
 * modèle suivant. `password_reset_tokens.token` et
 * `organization_invitations.token` s'en étaient passés.
 *
 * Les deux lignes à ajouter sont triviales ; c'est ce test qui a de la valeur.
 * Il prend la question à l'envers : **toute** colonne dont le nom évoque un
 * secret doit être masquée, sauf inscription motivée dans l'allowlist
 * ci-dessous. Le jour où une colonne y arrive, le bon geste n'est pas de
 * l'ajouter machinalement mais de décider si elle a vocation à sortir vers un
 * client — puis de l'inscrire, avec la raison.
 */

/**
 * Un mot de ce lexique dans le nom d'une colonne déclenche la règle.
 * `apiKeyEncrypted` → `['api', 'key', 'encrypted']` → `key` → concerné.
 */
const SENSITIVE_WORDS = new Set([
  'token',
  'tokens',
  'secret',
  'secrets',
  'key',
  'keys',
  'hash',
  'password',
])

/**
 * Colonnes qui déclenchent la règle par leur nom mais qui ne sont pas des
 * secrets. Chaque entrée porte sa raison : c'est la liste **revue**.
 */
const NOT_A_SECRET: Record<string, string> = {
  // Identifiants publics par conception : ils circulent dans l'URL de la
  // conversation et le client en a besoin pour la reprendre.
  'ai_assistant_conversation.token': 'identifiant de conversation, porté par l’URL',
  'ai_diagnosis_conversation.token': 'identifiant de conversation, porté par l’URL',
  'ai_part_search_conversation.token': 'identifiant de conversation, porté par l’URL',
  // Lien de partage du simulateur : public par conception, il n'a de sens que
  // s'il est transmis.
  'simulator_share.token': 'lien de partage public du simulateur',

  // Compteurs de consommation IA, pas des secrets — le lexique les attrape
  // parce qu'ils contiennent « tokens ».
  'ai_assistant_conversation.tokensUsed': 'compteur de tokens consommés',
  'ai_diagnosis_conversation.tokensUsed': 'compteur de tokens consommés',
  'ai_part_search_conversation.tokensUsed': 'compteur de tokens consommés',
  'ai_token_usage.tokensUsed': 'compteur de tokens consommés',
  'ai_token_usage.reservedTokens': 'compteur de tokens réservés pour un appel en vol',
  'public_ai_usage.tokensUsed': 'compteur de tokens consommés',

  // Clés de catalogue et de traduction, affichées telles quelles.
  'engine_brand.plateLocationKey': 'clé i18n affichée par le front',
  'engine_brand.plateExampleKey': 'clé i18n affichée par le front',
  'engine_part_reference.partKey': 'clé de catalogue de pièces',

  // Table interne de déduplication de jobs : jamais sérialisée vers un client,
  // et la valeur n'est pas une créance — c'est une clé d'idempotence.
  'queue_dedup_key.key': 'clé d’idempotence d’un job, table interne',
  'queue_dedup_key.payloadHash': 'empreinte de payload pour la déduplication',
}

/**
 * Colonnes dont le nom **n'évoque pas** un secret mais qui en sont un. Sans
 * cette liste, `p256dh` et `auth` passeraient sous le radar du lexique : ce
 * sont pourtant, avec `endpoint`, les trois valeurs qui suffisent à pousser
 * une notification dans le navigateur d'un utilisateur sans passer par l'app.
 */
const MUST_BE_HIDDEN = [
  'push_subscription.endpoint',
  'push_subscription.p256dh',
  'push_subscription.auth',
]

test.group('Hygiene — secret model columns (unit)', () => {
  test('every secret-looking column is hidden from serialization or explicitly allowlisted', ({
    assert,
  }) => {
    const offenders = readModelColumns()
      .filter((column) => propertyWords(column.property).some((word) => SENSITIVE_WORDS.has(word)))
      .filter((column) => !column.hiddenFromSerialization)
      .filter((column) => !(column.id in NOT_A_SECRET))
      .map((column) => column.id)

    assert.deepEqual(
      offenders,
      [],
      `Ces colonnes portent un nom de secret sans \`serializeAs: null\` : ${offenders.join(', ')}. ` +
        'Masquez-les, ou inscrivez-les dans NOT_A_SECRET avec la raison.'
    )
  })

  test('known credential columns the lexicon cannot name are hidden too', ({ assert }) => {
    const columns = readModelColumns()

    for (const id of MUST_BE_HIDDEN) {
      const column = columns.find((candidate) => candidate.id === id)

      assert.isDefined(column, `Colonne ${id} introuvable — la liste MUST_BE_HIDDEN a dérivé.`)
      assert.isTrue(column!.hiddenFromSerialization, `${id} doit porter \`serializeAs: null\`.`)
    }
  })

  test('the allowlist does not outlive the columns it excuses', ({ assert }) => {
    const known = new Set(readModelColumns().map((column) => column.id))
    const stale = Object.keys(NOT_A_SECRET).filter((id) => !known.has(id))

    assert.deepEqual(
      stale,
      [],
      `Entrées NOT_A_SECRET sans colonne correspondante : ${stale.join(', ')}.`
    )
  })

  test('the two columns this guard was written for are hidden', ({ assert }) => {
    const columns = readModelColumns()

    for (const id of ['password_reset_token.token', 'organization_invitation.token']) {
      const column = columns.find((candidate) => candidate.id === id)
      assert.isTrue(column?.hiddenFromSerialization, `${id} doit porter \`serializeAs: null\`.`)
    }
  })
})
