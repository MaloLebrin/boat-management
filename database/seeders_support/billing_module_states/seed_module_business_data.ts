import BoatPricingService from '#services/boat_pricing_service'
import BoatReservationService from '#services/boat_reservation_service'
import ClientService from '#services/client_service'
import InvoiceService from '#services/invoice_service'
import PricingSeasonService from '#services/pricing_season_service'
import RentalContractService from '#services/rental_contract_service'
import app from '@adonisjs/core/services/app'
import type { CoreStatesResult } from '#database/seeders_support/billing_module_states/seed_core_states'
import {
  firstBoat,
  seedCharterAndCrmData,
  seedCharterOnlyData,
  type BusinessDataServices,
} from '#database/seeders_support/billing_module_states/business_data_helpers'

/**
 * Données métier des modules `charter`/`crm_invoicing` (pricing, réservations,
 * clients, factures) pour les orgs où le module correspondant est actif.
 */
export async function seedModuleBusinessData(coreStates: CoreStatesResult): Promise<void> {
  const {
    proWithModulesUser,
    proWithModulesOrg,
    proGrantedUser,
    proGrantedOrg,
    enterpriseBaselineUser,
    enterpriseBaselineOrg,
    enterpriseGrantedUser,
    enterpriseGrantedOrg,
  } = coreStates

  const bizServices: BusinessDataServices = {
    boatPricing: await app.container.make(BoatPricingService),
    pricingSeason: await app.container.make(PricingSeasonService),
    client: await app.container.make(ClientService),
    reservation: await app.container.make(BoatReservationService),
    contract: await app.container.make(RentalContractService),
    invoice: await app.container.make(InvoiceService),
  }

  await seedCharterAndCrmData(
    bizServices,
    proWithModulesUser,
    proWithModulesOrg,
    await firstBoat(proWithModulesOrg.id),
    'pro-sub-with-modules'
  )
  console.log(
    '  → pro-sub-with-modules : pricing/saison/2 réservations/contrat + 2 clients/devis/facture'
  )

  await seedCharterOnlyData(
    bizServices,
    proGrantedUser,
    proGrantedOrg,
    await firstBoat(proGrantedOrg.id)
  )
  console.log(
    '  → pro-granted-module : pricing/saison/2 réservations/contrat, AUCUN client ni facture (crm_invoicing inactif)'
  )

  await seedCharterAndCrmData(
    bizServices,
    enterpriseBaselineUser,
    enterpriseBaselineOrg,
    await firstBoat(enterpriseBaselineOrg.id),
    'enterprise-baseline'
  )
  console.log(
    '  → enterprise-baseline : pricing/saison/2 réservations/contrat + 2 clients/devis/facture (via tier, sans ligne organization_modules)'
  )

  await seedCharterAndCrmData(
    bizServices,
    enterpriseGrantedUser,
    enterpriseGrantedOrg,
    await firstBoat(enterpriseGrantedOrg.id),
    'enterprise-granted'
  )
  console.log(
    '  → enterprise-granted : pricing/saison/2 réservations/contrat + 2 clients/devis/facture'
  )
}
