import { ExternalCalendarSyncError } from '#exceptions/calendar_sync_errors'
import {
  EXTERNAL_CALENDAR_MAX_BYTES,
  EXTERNAL_CALENDAR_MAX_REDIRECTS,
  EXTERNAL_CALENDAR_TIMEOUT_MS,
} from '#shared/constants/calendar_sync'
import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from 'node:dns'
import https from 'node:https'
import { isIP } from 'node:net'

/**
 * Téléchargement d'un flux iCal externe (#880), durci contre le SSRF : l'URL
 * est saisie par un utilisateur et lue par le serveur.
 *
 * - `https` seulement, port 443, sans identifiants dans l'URL ;
 * - chaque adresse résolue est vérifiée **au moment de la connexion** (option
 *   `lookup` de `https.request`) : une IP privée, de boucle locale, de lien
 *   local ou réservée coupe la requête — y compris un nom public qui résout
 *   vers le réseau interne, et y compris après une redirection ;
 * - redirections suivies à la main, au plus `EXTERNAL_CALENDAR_MAX_REDIRECTS`,
 *   chacune revérifiée ;
 * - taille et durée bornées.
 *
 * Injectable : les tests remplacent cette classe par un faux (`container.swap`).
 */
export default class CalendarFetcher {
  async fetch(url: string): Promise<string> {
    let current = assertSafeCalendarUrl(url)
    for (let hop = 0; hop <= EXTERNAL_CALENDAR_MAX_REDIRECTS; hop++) {
      const result = await request(current)
      if (result.kind === 'body') return result.body
      current = assertSafeCalendarUrl(new URL(result.location, current).toString())
    }
    throw new ExternalCalendarSyncError('http_error', 'too many redirects')
  }
}

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, part) => acc * 256 + Number(part), 0)
}

const PRIVATE_IPV4_RANGES: [string, number][] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  // Multicast et réservé (224.0.0.0 → 255.255.255.255).
  ['224.0.0.0', 3],
]

function isPrivateIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip)
  return PRIVATE_IPV4_RANGES.some(([base, bits]) => {
    const size = 2 ** (32 - bits)
    const start = ipv4ToInt(base)
    return value >= start && value < start + size
  })
}

/** Développe une IPv6 en 8 groupes de 16 bits. */
function ipv6Groups(ip: string): number[] | null {
  let address = ip.toLowerCase().split('%')[0]
  // Queue IPv4 (`::ffff:10.0.0.1`) → deux groupes hexadécimaux.
  const v4 = address.match(/(\d+\.\d+\.\d+\.\d+)$/)
  if (v4) {
    const value = ipv4ToInt(v4[1])
    address = address.replace(
      v4[1],
      `${Math.floor(value / 65536).toString(16)}:${(value % 65536).toString(16)}`
    )
  }
  const [head, tail] = address.split('::')
  const headGroups = head ? head.split(':') : []
  const tailGroups = tail !== undefined && tail !== '' ? tail.split(':') : []
  const missing = 8 - headGroups.length - tailGroups.length
  if (tail === undefined && missing !== 0) return null
  const groups = [...headGroups, ...Array(Math.max(missing, 0)).fill('0'), ...tailGroups]
  return groups.length === 8 ? groups.map((g) => Number.parseInt(g, 16)) : null
}

function embeddedIpv4(groups: number[]): string {
  return [groups[6] >> 8, groups[6] & 255, groups[7] >> 8, groups[7] & 255].join('.')
}

/**
 * Adresse que le serveur ne doit jamais joindre pour le compte d'un
 * utilisateur : privée, boucle locale, lien local, CGNAT, documentation,
 * multicast, et leurs formes IPv6 (y compris IPv4 mappée et NAT64).
 */
export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip)
  if (family === 4) return isPrivateIpv4(ip)
  if (family !== 6) return true

  const groups = ipv6Groups(ip)
  if (!groups) return true
  const [first] = groups
  if (groups.every((g) => g === 0)) return true // ::
  if (groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1) return true // ::1
  // IPv4 mappée (::ffff:a.b.c.d) ou NAT64 (64:ff9b::a.b.c.d) : juger l'IPv4.
  if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) {
    return isPrivateIpv4(embeddedIpv4(groups))
  }
  if (first === 0x64 && groups[1] === 0xff9b) return isPrivateIpv4(embeddedIpv4(groups))
  if ((first & 0xfe00) === 0xfc00) return true // fc00::/7 unique local
  if ((first & 0xffc0) === 0xfe80) return true // fe80::/10 lien local
  if ((first & 0xff00) === 0xff00) return true // ff00::/8 multicast
  if (first === 0x2001 && groups[1] === 0x0db8) return true // documentation
  return false
}

/**
 * Contrôle statique d'une URL de flux importé, avant toute résolution DNS.
 * Lève `unsafe_url` ; rend l'URL analysée.
 */
export function assertSafeCalendarUrl(raw: string): URL {
  let url: URL
  try {
    // `webcal://` est le même flux servi en https : les plateformes le proposent.
    url = new URL(raw.trim().replace(/^webcal:\/\//i, 'https://'))
  } catch {
    throw new ExternalCalendarSyncError('unsafe_url', 'invalid url')
  }
  if (url.protocol !== 'https:') throw new ExternalCalendarSyncError('unsafe_url', 'not https')
  if (url.username || url.password) {
    throw new ExternalCalendarSyncError('unsafe_url', 'credentials in url')
  }
  if (url.port && url.port !== '443') throw new ExternalCalendarSyncError('unsafe_url', 'port')

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    throw new ExternalCalendarSyncError('unsafe_url', 'local host')
  }
  if (isIP(host) && isPrivateAddress(host)) {
    throw new ExternalCalendarSyncError('unsafe_url', 'private address')
  }
  return url
}

type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number
) => void

/**
 * `lookup` de `https.request` : résout comme d'habitude, puis refuse la
 * connexion si **une** des adresses est interne — le contrôle porte sur
 * l'adresse effectivement jointe, ce qui ferme la porte au DNS rebinding.
 */
export function guardedLookup(
  hostname: string,
  options: LookupOptions,
  callback: LookupCallback
): void {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, [])
    const list = addresses as LookupAddress[]
    if (list.length === 0 || list.some((entry) => isPrivateAddress(entry.address))) {
      return callback(new ExternalCalendarSyncError('unsafe_url', 'private address'), [])
    }
    if (options.all) return callback(null, list)
    return callback(null, list[0].address, list[0].family)
  })
}

type RequestResult = { kind: 'body'; body: string } | { kind: 'redirect'; location: string }

function request(url: URL): Promise<RequestResult> {
  return new Promise((resolve, reject) => {
    const fail = (error: unknown) => {
      if (error instanceof ExternalCalendarSyncError) return reject(error)
      reject(new ExternalCalendarSyncError('network', (error as Error)?.message))
    }

    const req = https.get(
      url,
      {
        lookup: guardedLookup as unknown as typeof dnsLookup,
        headers: {
          'accept': 'text/calendar, */*;q=0.5',
          'user-agent': 'FleetAi-Calendar-Sync/1.0',
        },
      },
      (res) => {
        const status = res.statusCode ?? 0
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume()
          return resolve({ kind: 'redirect', location: res.headers.location })
        }
        if (status < 200 || status >= 300) {
          res.resume()
          return reject(new ExternalCalendarSyncError('http_error', `HTTP ${status}`))
        }
        const declared = Number(res.headers['content-length'] ?? 0)
        if (declared > EXTERNAL_CALENDAR_MAX_BYTES) {
          res.destroy()
          return reject(new ExternalCalendarSyncError('too_large'))
        }

        const chunks: Buffer[] = []
        let size = 0
        res.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > EXTERNAL_CALENDAR_MAX_BYTES) {
            res.destroy()
            reject(new ExternalCalendarSyncError('too_large'))
            return
          }
          chunks.push(chunk)
        })
        res.on('end', () => resolve({ kind: 'body', body: Buffer.concat(chunks).toString('utf8') }))
        res.on('error', fail)
      }
    )

    // Délai global (connexion + transfert), pas seulement l'inactivité du socket.
    const timer = setTimeout(() => {
      req.destroy(new ExternalCalendarSyncError('timeout'))
    }, EXTERNAL_CALENDAR_TIMEOUT_MS)
    req.on('close', () => clearTimeout(timer))
    req.on('error', fail)
  })
}
