import { test } from '@japa/runner'
import {
  AIS_MAX_TARGETS,
  AIS_RISK_CPA_M,
  AIS_RISK_TCPA_S,
  AIS_TARGET_EXPIRY_MS,
} from '#shared/constants/ais'
import {
  aisPath,
  aisRisk,
  dropExpiredTargets,
  isAisPathFamily,
  mmsiFromContext,
  nearestAisTargets,
  parseAisPath,
  parseAisTargetValue,
  sortAisTargets,
  withDistances,
} from '#shared/helpers/ais'
import type { AisTarget } from '#shared/types/ais'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_MMSI = '244630000'
const NOW_MS = Date.parse('2026-10-19T10:00:00Z')

function target(mmsi: string, overrides: Partial<AisTarget> = {}): AisTarget {
  return {
    mmsi,
    seenAt: new Date(NOW_MS).toISOString(),
    name: 'ALPHA',
    latitude: 43.0,
    longitude: 5.0,
    sogMs: 3.5,
    cogRad: 1.2,
    shipType: 70,
    shipTypeName: 'Cargo',
    cpaM: null,
    tcpaS: null,
    distanceM: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// aisPath / parseAisPath / isAisPathFamily
// ---------------------------------------------------------------------------

test.group('aisPath / parseAisPath / isAisPathFamily', () => {
  test('aisPath construit le chemin synthétique', ({ assert }) => {
    assert.equal(aisPath(VALID_MMSI), `ais.${VALID_MMSI}`)
  })

  test('parseAisPath extrait le MMSI d’un chemin valide', ({ assert }) => {
    assert.equal(parseAisPath(`ais.${VALID_MMSI}`), VALID_MMSI)
  })

  test('parseAisPath retourne null pour un MMSI trop court', ({ assert }) => {
    assert.isNull(parseAisPath('ais.12345678'))
  })

  test('parseAisPath retourne null pour un MMSI trop long', ({ assert }) => {
    assert.isNull(parseAisPath('ais.1234567890'))
  })

  test('parseAisPath retourne null pour un MMSI non numérique', ({ assert }) => {
    assert.isNull(parseAisPath('ais.abc123456'))
    assert.isNull(parseAisPath('ais.ABCDEFGHI'))
  })

  test('parseAisPath retourne null pour un chemin sans préfixe ais.', ({ assert }) => {
    assert.isNull(parseAisPath('navigation.speedOverGround'))
    assert.isNull(parseAisPath(VALID_MMSI))
  })

  test('isAisPathFamily est vrai pour tout préfixe ais.', ({ assert }) => {
    assert.isTrue(isAisPathFamily('ais.244630000'))
    assert.isTrue(isAisPathFamily('ais.abc'))
    assert.isTrue(isAisPathFamily('ais.'))
  })

  test('isAisPathFamily est faux pour les chemins normaux', ({ assert }) => {
    assert.isFalse(isAisPathFamily('navigation.speedOverGround'))
    assert.isFalse(isAisPathFamily(''))
    assert.isFalse(isAisPathFamily('aais.123456789'))
  })
})

// ---------------------------------------------------------------------------
// mmsiFromContext
// ---------------------------------------------------------------------------

test.group('mmsiFromContext', () => {
  test('extrait le MMSI d’un contexte Signal K valide', ({ assert }) => {
    assert.equal(mmsiFromContext('vessels.urn:mrn:imo:mmsi:244630000'), '244630000')
  })

  test('retourne null pour un contexte vessels.self', ({ assert }) => {
    assert.isNull(mmsiFromContext('vessels.self'))
  })

  test('retourne null pour undefined', ({ assert }) => {
    assert.isNull(mmsiFromContext(undefined))
  })

  test('retourne null si le MMSI est trop court ou trop long', ({ assert }) => {
    assert.isNull(mmsiFromContext('vessels.urn:mrn:imo:mmsi:12345678'))
    assert.isNull(mmsiFromContext('vessels.urn:mrn:imo:mmsi:1234567890'))
  })

  test('retourne null pour un contexte sans le préfixe attendu', ({ assert }) => {
    assert.isNull(mmsiFromContext('aircraft.urn:mrn:imo:mmsi:244630000'))
  })
})

// ---------------------------------------------------------------------------
// parseAisTargetValue
// ---------------------------------------------------------------------------

test.group('parseAisTargetValue', () => {
  test('valide une valeur complète et la normalise', ({ assert }) => {
    const result = parseAisTargetValue({
      name: '  MY BOAT  ',
      latitude: 43.29,
      longitude: 5.37,
      sogMs: 3.5,
      cogRad: 1.2,
      shipType: 70,
      shipTypeName: 'Cargo',
      cpaM: 500,
      tcpaS: 600,
    })
    assert.isNotNull(result)
    assert.equal(result!.name, 'MY BOAT')
    assert.equal(result!.latitude, 43.29)
    assert.equal(result!.longitude, 5.37)
    assert.equal(result!.sogMs, 3.5)
    assert.equal(result!.cogRad, 1.2)
    assert.equal(result!.shipType, 70)
    assert.equal(result!.cpaM, 500)
    assert.equal(result!.tcpaS, 600)
  })

  test('retourne null si latitude est absente', ({ assert }) => {
    assert.isNull(parseAisTargetValue({ longitude: 5.37 }))
  })

  test('retourne null si longitude est absente', ({ assert }) => {
    assert.isNull(parseAisTargetValue({ latitude: 43.29 }))
  })

  test('retourne null si latitude est hors bornes (>90)', ({ assert }) => {
    assert.isNull(parseAisTargetValue({ latitude: 91, longitude: 5.37 }))
    assert.isNull(parseAisTargetValue({ latitude: -91, longitude: 5.37 }))
  })

  test('retourne null si longitude est hors bornes (>180)', ({ assert }) => {
    assert.isNull(parseAisTargetValue({ latitude: 43.29, longitude: 181 }))
    assert.isNull(parseAisTargetValue({ latitude: 43.29, longitude: -181 }))
  })

  test('accepte les bornes exactes ±90 et ±180', ({ assert }) => {
    assert.isNotNull(parseAisTargetValue({ latitude: 90, longitude: 180 }))
    assert.isNotNull(parseAisTargetValue({ latitude: -90, longitude: -180 }))
  })

  test('retourne null si la valeur n’est pas un objet', ({ assert }) => {
    assert.isNull(parseAisTargetValue(null))
    assert.isNull(parseAisTargetValue(42))
    assert.isNull(parseAisTargetValue('string'))
    assert.isNull(parseAisTargetValue([]))
  })

  test('les champs optionnels absents donnent null', ({ assert }) => {
    const result = parseAisTargetValue({ latitude: 43.29, longitude: 5.37 })
    assert.isNotNull(result)
    assert.isNull(result!.name)
    assert.isNull(result!.sogMs)
    assert.isNull(result!.cogRad)
    assert.isNull(result!.shipType)
    assert.isNull(result!.shipTypeName)
    assert.isNull(result!.cpaM)
    assert.isNull(result!.tcpaS)
  })

  test('tronque le nom à AIS_NAME_MAX_LENGTH', ({ assert }) => {
    const longName = 'A'.repeat(200)
    const result = parseAisTargetValue({ latitude: 43.29, longitude: 5.37, name: longName })
    assert.isNotNull(result)
    assert.equal(result!.name!.length, 120)
  })

  test('un nom vide (après trim) donne null', ({ assert }) => {
    const result = parseAisTargetValue({ latitude: 43.29, longitude: 5.37, name: '   ' })
    assert.isNotNull(result)
    assert.isNull(result!.name)
  })

  test('shipType non entier (float) donne null', ({ assert }) => {
    const result = parseAisTargetValue({ latitude: 43.29, longitude: 5.37, shipType: 70.5 })
    assert.isNotNull(result)
    assert.isNull(result!.shipType)
  })

  test('latitude ou longitude NaN retourne null', ({ assert }) => {
    assert.isNull(parseAisTargetValue({ latitude: Number.NaN, longitude: 5.37 }))
    assert.isNull(parseAisTargetValue({ latitude: 43.29, longitude: Number.NaN }))
  })

  test('latitude ou longitude Infinity retourne null', ({ assert }) => {
    assert.isNull(parseAisTargetValue({ latitude: Infinity, longitude: 5.37 }))
    assert.isNull(parseAisTargetValue({ latitude: 43.29, longitude: -Infinity }))
  })
})

// ---------------------------------------------------------------------------
// withDistances
// ---------------------------------------------------------------------------

test.group('withDistances', () => {
  test('calcule la distance depuis la position du bateau', ({ assert }) => {
    const targets = [target('111111111', { latitude: 43.0, longitude: 5.0 })]
    const own = { latitude: 43.0, longitude: 5.1 }
    const result = withDistances(targets, own)
    assert.isNotNull(result[0].distanceM)
    assert.isAbove(result[0].distanceM!, 0)
  })

  test('laisse distanceM à null quand la position du bateau est inconnue', ({ assert }) => {
    const targets = [target('111111111')]
    const result = withDistances(targets, null)
    assert.isNull(result[0].distanceM)
  })

  test('ne mute pas le tableau d’entrée', ({ assert }) => {
    const targets = [target('111111111')]
    withDistances(targets, { latitude: 43.0, longitude: 5.0 })
    assert.isNull(targets[0].distanceM)
  })
})

// ---------------------------------------------------------------------------
// sortAisTargets
// ---------------------------------------------------------------------------

test.group('sortAisTargets', () => {
  test('trie les plus proches d’abord', ({ assert }) => {
    const a = target('111111111', { distanceM: 1000 })
    const b = target('222222222', { distanceM: 500 })
    const c = target('333333333', { distanceM: 2000 })
    const sorted = sortAisTargets([a, b, c])
    assert.deepEqual(
      sorted.map((t) => t.mmsi),
      ['222222222', '111111111', '333333333']
    )
  })

  test('place les cibles avec distance avant celles sans distance', ({ assert }) => {
    const withDist = target('111111111', { distanceM: 5000 })
    const noDist = target('222222222', { distanceM: null })
    const sorted = sortAisTargets([noDist, withDist])
    assert.equal(sorted[0].mmsi, '111111111')
  })

  test('sans distance, les plus récentes d’abord', ({ assert }) => {
    const older = target('111111111', {
      distanceM: null,
      seenAt: '2026-10-19T09:00:00Z',
    })
    const newer = target('222222222', {
      distanceM: null,
      seenAt: '2026-10-19T10:00:00Z',
    })
    const sorted = sortAisTargets([older, newer])
    assert.equal(sorted[0].mmsi, '222222222')
  })

  test('ne mute pas le tableau d’entrée', ({ assert }) => {
    const a = target('111111111', { distanceM: 1000 })
    const b = target('222222222', { distanceM: 500 })
    const input = [a, b]
    sortAisTargets(input)
    assert.equal(input[0].mmsi, '111111111')
  })
})

// ---------------------------------------------------------------------------
// nearestAisTargets
// ---------------------------------------------------------------------------

test.group('nearestAisTargets', () => {
  test('garde au plus AIS_MAX_TARGETS cibles', ({ assert }) => {
    const targets = Array.from({ length: AIS_MAX_TARGETS + 5 }, (_, i) =>
      target(String(100000000 + i).padStart(9, '0'), { distanceM: i * 10 })
    )
    const result = nearestAisTargets(targets)
    assert.lengthOf(result, AIS_MAX_TARGETS)
  })

  test('garde les max premières (les plus proches)', ({ assert }) => {
    const a = target('111111111', { distanceM: 500 })
    const b = target('222222222', { distanceM: 200 })
    const c = target('333333333', { distanceM: 800 })
    const result = nearestAisTargets([a, b, c], 2)
    assert.deepEqual(
      result.map((t) => t.mmsi),
      ['222222222', '111111111']
    )
  })

  test('retourne toutes les cibles si moins que max', ({ assert }) => {
    const targets = [target('111111111', { distanceM: 100 })]
    assert.lengthOf(nearestAisTargets(targets, 10), 1)
  })
})

// ---------------------------------------------------------------------------
// dropExpiredTargets
// ---------------------------------------------------------------------------

test.group('dropExpiredTargets', () => {
  test('retire les cibles muettes depuis AIS_TARGET_EXPIRY_MS', ({ assert }) => {
    const fresh = target('111111111', {
      seenAt: new Date(NOW_MS - AIS_TARGET_EXPIRY_MS + 1000).toISOString(),
    })
    const expired = target('222222222', {
      seenAt: new Date(NOW_MS - AIS_TARGET_EXPIRY_MS - 1000).toISOString(),
    })
    const exactLimit = target('333333333', {
      seenAt: new Date(NOW_MS - AIS_TARGET_EXPIRY_MS).toISOString(),
    })
    const result = dropExpiredTargets([fresh, expired, exactLimit], NOW_MS)
    assert.deepEqual(
      result.map((t) => t.mmsi),
      ['111111111', '333333333']
    )
  })

  test('retourne toutes les cibles si aucune n’est expirée', ({ assert }) => {
    const targets = [
      target('111111111', { seenAt: new Date(NOW_MS - 1000).toISOString() }),
      target('222222222', { seenAt: new Date(NOW_MS).toISOString() }),
    ]
    assert.lengthOf(dropExpiredTargets(targets, NOW_MS), 2)
  })

  test('retourne un tableau vide si tout est expiré', ({ assert }) => {
    const targets = [
      target('111111111', { seenAt: new Date(NOW_MS - AIS_TARGET_EXPIRY_MS * 2).toISOString() }),
    ]
    assert.lengthOf(dropExpiredTargets(targets, NOW_MS), 0)
  })
})

// ---------------------------------------------------------------------------
// aisRisk
// ---------------------------------------------------------------------------

test.group('aisRisk', () => {
  test('danger : CPA proche ET TCPA à venir sous les seuils', ({ assert }) => {
    assert.equal(aisRisk({ cpaM: AIS_RISK_CPA_M - 1, tcpaS: AIS_RISK_TCPA_S - 1 }), 'danger')
  })

  test('danger aux seuils exacts', ({ assert }) => {
    assert.equal(aisRisk({ cpaM: AIS_RISK_CPA_M, tcpaS: AIS_RISK_TCPA_S }), 'danger')
  })

  test('watch : CPA proche, TCPA au-delà du seuil', ({ assert }) => {
    assert.equal(aisRisk({ cpaM: AIS_RISK_CPA_M - 1, tcpaS: AIS_RISK_TCPA_S + 1 }), 'watch')
  })

  test('watch : CPA au-delà, TCPA à venir sous le seuil', ({ assert }) => {
    assert.equal(aisRisk({ cpaM: AIS_RISK_CPA_M + 1, tcpaS: AIS_RISK_TCPA_S - 1 }), 'watch')
  })

  test('none : CPA et TCPA au-delà des seuils', ({ assert }) => {
    assert.equal(aisRisk({ cpaM: AIS_RISK_CPA_M + 1, tcpaS: AIS_RISK_TCPA_S + 1 }), 'none')
  })

  test('none : TCPA négatif (les navires s’éloignent)', ({ assert }) => {
    assert.equal(aisRisk({ cpaM: 100, tcpaS: -1 }), 'none')
  })

  test('none : CPA null', ({ assert }) => {
    assert.equal(aisRisk({ cpaM: null, tcpaS: AIS_RISK_TCPA_S - 1 }), 'none')
  })

  test('none : TCPA null', ({ assert }) => {
    assert.equal(aisRisk({ cpaM: AIS_RISK_CPA_M - 1, tcpaS: null }), 'none')
  })

  test('none : les deux null', ({ assert }) => {
    assert.equal(aisRisk({ cpaM: null, tcpaS: null }), 'none')
  })
})
