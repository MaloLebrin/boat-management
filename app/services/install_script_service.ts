import { readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import {
  INSTRUMENT_INGEST_PATH,
  SIGNALK_PLUGIN_ENDPOINT_MARKER,
} from '#shared/constants/instruments'

export default class InstallScriptService {
  /** Script du plugin Signal K, marqueur d'endpoint remplacé par l'origine servante. */
  async signalkPlugin(origin: string): Promise<string> {
    const source = await readFile(app.makePath('resources/install/signalk-plugin.sh'), 'utf8')
    return source.replaceAll(SIGNALK_PLUGIN_ENDPOINT_MARKER, `${origin}${INSTRUMENT_INGEST_PATH}`)
  }
}
