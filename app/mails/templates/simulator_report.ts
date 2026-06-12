import env from '#start/env'
import type { computeSimulatorCosts } from '../../../shared/simulator_costs.js'

export function buildSimulatorReportHtml(
  breakdown: ReturnType<typeof computeSimulatorCosts>,
  isFr: boolean
): string {
  const appUrl = env.get('APP_URL')
  const formatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  })

  const categoryLabels: Record<string, { fr: string; en: string }> = {
    hull: { fr: 'Coque', en: 'Hull' },
    engine: { fr: 'Moteur', en: 'Engine' },
    safety: { fr: 'Securite', en: 'Safety' },
    electrical: { fr: 'Electrique', en: 'Electrical' },
    mooring: { fr: 'Mouillage', en: 'Mooring' },
    rigging: { fr: 'Greement', en: 'Rigging' },
  }

  const title = isFr ? "Votre rapport d'estimation de couts" : 'Your cost estimation report'
  const totalLabel = isFr ? 'Total estime' : 'Estimated total'
  const ctaText = isFr ? 'Creer mon compte gratuitement' : 'Create my free account'
  const gdprText = isFr ? 'Vos donnees ne seront pas partagees.' : 'Your data will not be shared.'

  const categoryRows = breakdown.categories
    .map((cat: { key: string; minCost: number; maxCost: number }) => {
      const label = categoryLabels[cat.key]?.[isFr ? 'fr' : 'en'] ?? cat.key
      const range = `${formatter.format(cat.minCost)} - ${formatter.format(cat.maxCost)}`
      return `<tr>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;color:#333333;font-size:14px;">${label}</td>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;color:#333333;font-size:14px;text-align:right;">${range}</td>
        </tr>`
    })
    .join('')

  const totalRange = `${formatter.format(breakdown.totalMin)} - ${formatter.format(breakdown.totalMax)}`

  return `<!DOCTYPE html>
<html lang="${isFr ? 'fr' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:40px 30px;text-align:center;background-color:#1e3a5f;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;">FleetAi</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px;color:#333333;font-size:22px;">${title}</h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 25px;border:1px solid #eeeeee;border-radius:6px;">
          <thead>
            <tr style="background-color:#f9f9f9;">
              <th style="padding:12px 15px;text-align:left;color:#555555;font-size:14px;font-weight:600;">${isFr ? 'Categorie' : 'Category'}</th>
              <th style="padding:12px 15px;text-align:right;color:#555555;font-size:14px;font-weight:600;">${isFr ? 'Cout annuel' : 'Annual cost'}</th>
            </tr>
          </thead>
          <tbody>
            ${categoryRows}
          </tbody>
          <tfoot>
            <tr style="background-color:#1e3a5f;">
              <td style="padding:12px 15px;color:#ffffff;font-size:16px;font-weight:bold;">${totalLabel}</td>
              <td style="padding:12px 15px;color:#ffffff;font-size:16px;font-weight:bold;text-align:right;">${totalRange}</td>
            </tr>
          </tfoot>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
          <tr>
            <td style="border-radius:6px;background-color:#1e3a5f;">
              <a href="${appUrl}/signup" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                ${ctaText}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px;text-align:center;background-color:#f4f4f7;color:#888888;font-size:12px;">
        <p style="margin:0 0 10px;">${gdprText}</p>
        <p style="margin:0;">FleetAi - Boat Fleet Management</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}
