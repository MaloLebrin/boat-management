import { test } from '@japa/runner'
import {
  crewCertificationAlertWindow,
  crewCertificationStatus,
  worstCrewCertificationStatus,
} from '#shared/helpers/crew_certification'

test.group('Certifications d’équipage (#882) — état et fenêtres', () => {
  test('derives the status from the days left, 60-day horizon included', ({ assert }) => {
    assert.equal(crewCertificationStatus(null), 'undated')
    assert.equal(crewCertificationStatus(-1), 'expired')
    assert.equal(crewCertificationStatus(0), 'expiring_soon')
    assert.equal(crewCertificationStatus(60), 'expiring_soon')
    assert.equal(crewCertificationStatus(61), 'valid')
  })

  test('picks the narrowest alert window holding the expiry', ({ assert }) => {
    assert.equal(crewCertificationAlertWindow(60), 60)
    assert.equal(crewCertificationAlertWindow(31), 60)
    assert.equal(crewCertificationAlertWindow(30), 30)
    assert.equal(crewCertificationAlertWindow(8), 30)
    assert.equal(crewCertificationAlertWindow(7), 7)
    assert.equal(crewCertificationAlertWindow(0), 7)
    // Hors fenêtre, échue ou sans date : pas de fenêtre d'échéance.
    assert.isNull(crewCertificationAlertWindow(61))
    assert.isNull(crewCertificationAlertWindow(-3))
    assert.isNull(crewCertificationAlertWindow(null))
  })

  test('a crew member takes the worst status of their certifications', ({ assert }) => {
    assert.equal(worstCrewCertificationStatus(['valid', 'expired', 'expiring_soon']), 'expired')
    assert.equal(worstCrewCertificationStatus(['undated', 'expiring_soon']), 'expiring_soon')
    assert.equal(worstCrewCertificationStatus(['undated', 'valid']), 'valid')
    assert.isNull(worstCrewCertificationStatus([]))
  })
})
