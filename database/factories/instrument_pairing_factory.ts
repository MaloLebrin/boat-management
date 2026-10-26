import { createHash } from 'node:crypto'
import InstrumentPairing from '#models/instrument_pairing'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'
import { DateTime } from 'luxon'

/**
 * Appairage non rattaché (#1032), valable dix minutes. Les empreintes sont
 * aléatoires : pour un test qui a besoin des vrais codes, passer par
 * `InstrumentPairingService.create`. `boatId`, `organizationId` et
 * `claimedByUserId` restent nuls tant que le test ne les fournit pas.
 */
export const InstrumentPairingFactory = Factory.define(
  InstrumentPairing,
  ({ faker }: FactoryContextContract) => ({
    deviceCodeHash: createHash('sha256').update(faker.string.uuid()).digest('hex'),
    userCodeHash: createHash('sha256').update(faker.string.uuid()).digest('hex'),
    deviceLabel: `fleetai-${faker.string.hexadecimal({ length: 4, prefix: '', casing: 'lower' })}`,
    hardwareKind: 'raspberry_pi',
    pluginVersion: '0.2.0',
    expiresAt: DateTime.now().plus({ minutes: 10 }),
  })
).build()
