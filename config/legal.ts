import env from '#start/env'
import type { LegalEntity } from '#shared/types/marketing'

/**
 * Identité de l'éditeur, de l'hébergeur et du médiateur affichée sur les
 * mentions légales (#466). Ces valeurs suivent la structure juridique de
 * l'exploitant, pas le code : elles viennent donc de l'environnement.
 *
 * Une valeur absente n'est pas masquée — la page rend « à compléter » à sa
 * place, pour qu'un champ légalement obligatoire manquant se voie plutôt que
 * de disparaître silencieusement de la page.
 */
const legalEntity: LegalEntity = {
  companyName: env.get('LEGAL_COMPANY_NAME', ''),
  legalForm: env.get('LEGAL_LEGAL_FORM', ''),
  shareCapital: env.get('LEGAL_SHARE_CAPITAL', ''),
  registrationNumber: env.get('LEGAL_REGISTRATION_NUMBER', ''),
  vatNumber: env.get('LEGAL_VAT_NUMBER', ''),
  address: env.get('LEGAL_ADDRESS', ''),
  email: env.get('LEGAL_CONTACT_EMAIL', ''),
  phone: env.get('LEGAL_CONTACT_PHONE', ''),
  publicationDirector: env.get('LEGAL_PUBLICATION_DIRECTOR', ''),
  hostName: env.get('LEGAL_HOST_NAME', ''),
  hostAddress: env.get('LEGAL_HOST_ADDRESS', ''),
  hostContact: env.get('LEGAL_HOST_CONTACT', ''),
  mediatorName: env.get('LEGAL_MEDIATOR_NAME', ''),
  mediatorUrl: env.get('LEGAL_MEDIATOR_URL', ''),
}

export default legalEntity
