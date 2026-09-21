import { expect, test } from 'vitest'
import { APP_TITLE, pageTitle } from '../../inertia/utils/page_title'

/**
 * Template de `<title>` partagé client/SSR : avant, seul le client suffixait la
 * marque, et Google lisait un titre différent de celui affiché après hydratation.
 */
test('suffixe la marque au titre de la page', () => {
  expect(pageTitle('Diagnostic de panne moteur bateau par IA, gratuit')).toBe(
    `Diagnostic de panne moteur bateau par IA, gratuit - ${APP_TITLE}`
  )
})

test('retombe sur la marque seule sans titre de page', () => {
  expect(pageTitle('')).toBe(APP_TITLE)
  expect(pageTitle(undefined)).toBe(APP_TITLE)
})
