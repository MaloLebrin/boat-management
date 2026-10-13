import { describe, expect, test } from 'vitest'
import {
  conflictDescriptionKey,
  conflictRows,
  groupConflicts,
} from '../../inertia/lib/conflict_fields'
import type { ConflictState } from '../../inertia/composables/use_offline_queue'

// #970 — lignes de la modale de conflit et regroupement des conflits en lot.

const t = (key: string) => `t:${key}`
const formatDateTime = (value: string) => `date:${new Date(value).toISOString()}`

function incidentConflict(
  payload: Record<string, unknown>,
  serverData: Record<string, unknown>
): ConflictState {
  return {
    action: {
      id: 1,
      type: 'update-incident',
      url: '/boats/3/incidents/7',
      method: 'put',
      payload,
      createdAt: '',
    },
    serverData,
  }
}

describe('conflictRows — incident (#970)', () => {
  test('traduit les énumérations et les booléens au lieu de les afficher bruts', () => {
    const rows = conflictRows(
      incidentConflict(
        { type: 'engine_failure', status: 'open', insuranceClaimed: true, description: 'Fuite' },
        { type: 'collision', status: 'closed', insuranceClaimed: false, description: 'Fuite' }
      ),
      t,
      formatDateTime
    )
    expect(rows.map((r) => [r.key, r.label, r.local, r.server, r.differs])).toEqual([
      [
        'type',
        't:incidents.fields.type',
        't:incidents.type.engine_failure',
        't:incidents.type.collision',
        true,
      ],
      [
        'status',
        't:incidents.fields.status',
        't:incidents.status.open',
        't:incidents.status.closed',
        true,
      ],
      ['description', 't:incidents.fields.description', 'Fuite', 'Fuite', false],
      [
        'insuranceClaimed',
        't:incidents.fields.insuranceClaimed',
        't:common.yes',
        't:common.no',
        true,
      ],
    ])
  })

  test('une heure murale locale et l’ISO du serveur au même instant ne diffèrent pas', () => {
    const local = '2026-07-15T10:00'
    const server = new Date(local).toISOString()
    const [row] = conflictRows(
      incidentConflict({ occurredAt: local }, { occurredAt: server }),
      t,
      formatDateTime
    )
    expect(row.differs).toBe(false)
    expect(row.local).toBe(row.server)
  })

  test('un instant différent est signalé', () => {
    const [row] = conflictRows(
      incidentConflict(
        { occurredAt: '2026-07-15T10:00' },
        { occurredAt: '2026-07-16T08:00:00.000Z' }
      ),
      t,
      formatDateTime
    )
    expect(row.differs).toBe(true)
  })

  test('les champs vides des deux côtés et les clés techniques sont omis', () => {
    const rows = conflictRows(
      incidentConflict(
        { location: '', _expectedUpdatedAt: 'x', description: 'A' },
        { location: null, updatedAt: 'y', boatName: 'Albatros', description: 'B' }
      ),
      t,
      formatDateTime
    )
    expect(rows.map((r) => r.key)).toEqual(['description'])
  })
})

describe('conflictDescriptionKey', () => {
  test('un incident a sa propre phrase, les sorties gardent la générique', () => {
    expect(conflictDescriptionKey('update-incident')).toBe(
      'common.offline.conflict.descriptionIncident'
    )
    expect(conflictDescriptionKey('update-navigation-log')).toBe(
      'common.offline.conflict.description'
    )
  })
})

describe('groupConflicts', () => {
  test('sans nom de bateau, le groupe garde son type', () => {
    const [group] = groupConflicts([incidentConflict({}, {})])
    expect(group).toMatchObject({
      key: '3:update-incident',
      boatName: null,
      type: 'update-incident',
    })
  })
})
