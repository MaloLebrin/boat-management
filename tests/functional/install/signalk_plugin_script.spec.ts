import { test } from '@japa/runner'
import {
  INSTRUMENT_INGEST_PATH,
  SIGNALK_PLUGIN_INSTALL_PATH,
  SIGNALK_PLUGIN_PACKAGE,
} from '#shared/constants/instruments'

test.group('GET /install/signalk-plugin.sh (functional, #1021)', () => {
  test('sert le script en texte brut, sans authentification', async ({ client, assert }) => {
    const response = await client.get(SIGNALK_PLUGIN_INSTALL_PATH)

    response.assertStatus(200)
    assert.include(String(response.header('content-type')), 'text/x-shellscript')
    assert.include(String(response.header('content-type')), 'charset=utf-8')
    assert.equal(response.header('cache-control'), 'public, max-age=3600')
    assert.match(response.text(), /^#!\/usr\/bin\/env bash/)
  })

  test('installe le paquet du plugin', async ({ client, assert }) => {
    const response = await client.get(SIGNALK_PLUGIN_INSTALL_PATH)

    assert.match(
      response.text(),
      new RegExp(`npm install --omit=dev --no-fund --no-audit "\\$PACKAGE@latest"`)
    )
    assert.include(response.text(), `PACKAGE="${SIGNALK_PLUGIN_PACKAGE}"`)
  })

  test("remplace le marqueur par l'origine de la requête", async ({ client, assert }) => {
    const response = await client.get(SIGNALK_PLUGIN_INSTALL_PATH)

    assert.match(
      response.text(),
      new RegExp(`DEFAULT_ENDPOINT="https?://[^/\\s"]+${INSTRUMENT_INGEST_PATH}"`)
    )
    assert.notInclude(response.text(), '__FLEETAI')
  })
})
