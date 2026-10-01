import { test } from '@japa/runner'
import router from '@adonisjs/core/services/router'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { createEnterpriseAdminUser } from '#tests/functional/helpers'
import {
  SENTINEL,
  markMarina,
  seedVictimGraph,
  victimBoatUntouched,
  victimClientUntouched,
  type CrossOrgIds,
} from '#tests/functional/security/cross_org_fixture'

/**
 * Filet de non-régression cross-org (#855).
 *
 * Chaque route authentifiée dont l'URL porte un id d'entité est appelée par
 * un admin Entreprise (orga A, profil marina — les gardes de plan passent)
 * avec les ids de l'orga B. Attendu : 403, 404, 422, ou une redirection qui
 * n'est ni le login ni l'upsell de facturation. Un 200, ou un corps qui
 * contient le marqueur de B, est une fuite.
 *
 * Les routes sans paramètre d'entité sont ignorées. Celles qu'on ne sonde
 * pas sont dans `EXCLUSIONS`, avec la raison — une route nouvelle qui n'est
 * ni sondée ni listée fait échouer le test.
 */

interface RouteFacts {
  pattern: string
  methods: string[]
  middleware: string[]
}

type Verb = 'get' | 'post' | 'put' | 'patch' | 'delete'

/**
 * Routes authentifiées qu'on ne sonde pas. La clé est `MÉTHODE /pattern`,
 * telle que `router.toJSON()` la publie. Chaque entrée dit pourquoi.
 */
const EXCLUSIONS: Record<string, string> = {
  'POST /assistant/conversations/:token/messages':
    'un succès fautif appellerait Mistral ; le jeton est couvert par les specs du copilote',
  'POST /assistant/conversations/:token/action/confirm':
    'jeton de conversation, pas un agrégat d’organisation ; specs assistant',
  'POST /assistant/conversations/:token/action/dismiss':
    'jeton de conversation, pas un agrégat d’organisation ; specs assistant',
  'POST /assistant/conversations/:token/archive':
    'jeton de conversation, pas un agrégat d’organisation ; specs assistant',
  'POST /boats/:boatId/engines/:engineId/spare-parts/chat/conversations':
    'crée une conversation et appelle Mistral',
  'POST /boats/:boatId/engines/:engineId/spare-parts/chat/conversations/:token/messages':
    'un succès fautif appellerait Mistral ; specs du chat pièces',
  'PUT /settings/ai/api-key/:provider':
    'le paramètre est un fournisseur, pas une ressource d’une autre organisation',
  'DELETE /settings/ai/api-key/:provider':
    'le paramètre est un fournisseur, pas une ressource d’une autre organisation',
}

const SAFE_STATUSES = new Set([403, 404, 422])

function routeFacts(): RouteFacts[] {
  router.commit()

  return Object.values(router.toJSON())
    .flat()
    .map((route) => {
      const middleware: string[] = []
      for (const entry of (
        route.middleware as unknown as { all: () => Set<{ name?: string }> }
      ).all()) {
        if (!entry.name) continue
        middleware.push(entry.name)
      }
      return {
        pattern: String(route.pattern),
        methods: route.methods.filter((method) => method !== 'HEAD' && method !== 'OPTIONS'),
        middleware,
      }
    })
}

function routeKey(method: string, pattern: string): string {
  return `${method} ${pattern}`
}

/**
 * Valeur d'un paramètre d'URL pour l'organisation victime, ou `null` si on
 * ne sait pas la remplir — la route doit alors être dans `EXCLUSIONS`.
 */
function valueFor(name: string, pattern: string, ids: CrossOrgIds): string | null {
  if (name === 'assemblySlug' || name === 'sheetSlug') return 'probe'

  if (name === 'id') return contextualId(pattern, ids)
  if (name === 'itemId') return itemId(pattern, ids)
  if (name === 'logId') {
    if (pattern.includes('/fuel-logs/')) return String(ids.fuelLogId)
    if (pattern.includes('/navigation-logs/')) return String(ids.navigationLogId)
    return null
  }
  if (name === 'entryId') {
    if (pattern.includes('/budget/')) return String(ids.budgetEntryId)
    if (pattern.includes('/entries/')) return String(ids.entryId)
    return null
  }
  if (name === 'memberId' && pattern.includes('/crew/')) return String(ids.crewId)

  const direct: Record<string, number> = {
    boatId: ids.boatId,
    engineId: ids.engineId,
    sailId: ids.sailId,
    partId: ids.partId,
    mediaId: ids.mediaId,
    incidentId: ids.incidentId,
    taskId: ids.taskId,
    eventId: ids.eventId,
    documentId: ids.documentId,
    stayId: ids.stayId,
    sheetId: ids.sheetId,
    actionId: ids.actionId,
    safetyId: ids.safetyId,
    genericId: ids.genericId,
    portId: ids.portId,
    pontoonId: ids.pontoonId,
    mouillageId: ids.mouillageId,
    reservationId: ids.reservationId,
    inspectionId: ids.inspectionId,
    certId: ids.certId,
    calendarId: ids.calendarId,
    assignmentId: ids.crewAssignmentId,
    unavailabilityId: ids.unavailabilityId,
    userId: ids.memberId,
    memberId: ids.memberId,
  }
  const id = direct[name]
  return id === undefined ? null : String(id)
}

function contextualId(pattern: string, ids: CrossOrgIds): string | null {
  if (
    pattern.startsWith('/boats/') ||
    pattern.startsWith('/owner/boats/') ||
    pattern.startsWith('/ai/boats/')
  ) {
    return String(ids.boatId)
  }
  if (pattern.startsWith('/ports/')) return String(ids.portId)
  if (pattern.startsWith('/clients/')) return String(ids.clientId)
  if (pattern.startsWith('/invoices/')) return String(ids.invoiceId)
  if (pattern.startsWith('/crew/')) return String(ids.crewId)
  if (pattern.startsWith('/spots/')) return String(ids.spotId)
  if (pattern.startsWith('/exports/')) return String(ids.exportId)
  if (pattern.startsWith('/notifications/')) return String(ids.notificationId)
  if (pattern.startsWith('/pricing/')) return String(ids.seasonId)
  if (pattern.startsWith('/organization/members/')) return String(ids.memberId)
  if (pattern.startsWith('/organization/invitations/')) return String(ids.invitationId)
  if (pattern.startsWith('/push/')) return String(ids.pushId)
  return null
}

function itemId(pattern: string, ids: CrossOrgIds): string | null {
  if (pattern.includes('/spare-parts/cart/')) return String(ids.cartItemId)
  if (pattern.includes('/maintenance-sheets/') && pattern.includes('/items/')) {
    return String(ids.sheetItemId)
  }
  if (pattern.includes('/safety-equipment/')) return String(ids.safetyId)
  if (pattern.includes('/generic-equipment/')) return String(ids.genericId)
  return null
}

function fill(pattern: string, ids: CrossOrgIds): string | null {
  const names = [...pattern.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)\??/g)].map((match) => match[1]!)
  let url = pattern
  for (const name of names) {
    const value = valueFor(name, pattern, ids)
    if (value === null) return null
    url = url.replace(new RegExp(`:${name}\\??`), value)
  }
  return url
}

function denialReason(status: number, location: string | undefined, body: string): string | null {
  if (body.includes(SENTINEL)) return `corps contient ${SENTINEL}`
  if (location?.includes(SENTINEL)) return `location contient ${SENTINEL}`
  if (status === 301 || status === 302 || status === 303) {
    if (!location) return 'redirection sans location'
    if (location.startsWith('/login')) return 'redirigé vers /login'
    if (location.startsWith('/settings/billing')) {
      return 'redirigé vers la facturation (garde de plan, pas le cloisonnement)'
    }
    return null
  }
  if (SAFE_STATUSES.has(status)) return null
  return `statut ${status}`
}

function responseText(body: unknown): string {
  if (typeof body === 'string') return body
  if (body === null || body === undefined) return ''
  try {
    return JSON.stringify(body)
  } catch {
    return ''
  }
}

test.group('Cloisonnement — routes authentifiées cross-org (#855)', (group) => {
  group.each.setup(() => truncateDb())

  test('un admin de A ne lit ni ne modifie les entités de B', async ({ client, assert }) => {
    const intruder = await createEnterpriseAdminUser()
    const victim = await createEnterpriseAdminUser()
    await markMarina(intruder)
    await markMarina(victim)

    const ids = await seedVictimGraph(victim)
    const ownBoat = await BoatFactory.merge({
      organizationId: intruder.organizationId!,
      name: 'Bateau de A',
    }).create()

    const own = await client.get(`/boats/${ownBoat.id}`).loginAs(intruder).redirects(0)
    assert.equal(own.status(), 200, 'le témoin (son propre bateau) doit répondre 200')

    const discovered = new Set<string>()
    const probed: Array<{ key: string; verb: Verb; url: string }> = []
    const unmapped: string[] = []

    for (const route of routeFacts()) {
      if (!route.middleware.includes('auth')) continue
      if (!route.pattern.includes(':')) continue

      for (const method of route.methods) {
        const verb = method.toLowerCase() as Verb
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(verb)) continue

        const key = routeKey(method, route.pattern)
        discovered.add(key)
        if (key in EXCLUSIONS) continue

        const url = fill(route.pattern, ids)
        if (url === null) {
          unmapped.push(key)
          continue
        }
        probed.push({ key, verb, url })
      }
    }

    const stale = Object.keys(EXCLUSIONS).filter((key) => !discovered.has(key))
    assert.deepEqual(stale, [], 'exclusions qui ne correspondent plus à une route')
    assert.deepEqual(
      unmapped,
      [],
      'routes à paramètre ni sondées ni exclues — étendre la fixture ou EXCLUSIONS'
    )
    assert.isAbove(probed.length, 40, 'la découverte ne sonde plus le routeur')

    const failures: string[] = []
    for (const probe of probed) {
      let request = client[probe.verb](probe.url).loginAs(intruder).redirects(0)
      if (probe.verb !== 'get' && probe.verb !== 'delete') request = request.json({})

      const response = await request
      const status = response.status()
      const location = response.header('location')
      let body = ''
      try {
        body = responseText(response.body())
      } catch {
        body = ''
      }
      const reason = denialReason(status, location, body)
      if (reason) failures.push(`${probe.key} → ${probe.url} (${reason})`)
    }

    assert.deepEqual(
      failures,
      [],
      'A a reçu des données de B, ou un statut qui n’est ni un refus ni une redirection'
    )

    const boat = await victimBoatUntouched(ids.boatId)
    assert.isNotNull(boat)
    assert.equal(boat!.name, SENTINEL)
    assert.equal(boat!.organizationId, victim.organizationId)

    const victimClient = await victimClientUntouched(ids.clientId)
    assert.isNotNull(victimClient)
    assert.equal(victimClient!.lastName, SENTINEL)
  }).timeout(180_000)
})
