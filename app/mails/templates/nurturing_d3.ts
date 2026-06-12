import env from '#start/env'

export function buildNurturingD3Html(isFr: boolean): string {
  const appUrl = env.get('APP_URL')

  const title = isFr
    ? "3 conseils pour reduire les couts d'entretien de votre bateau"
    : '3 tips to reduce your boat maintenance costs'

  const tips = isFr
    ? [
        {
          title: 'Anticipez les petites reparations',
          desc: "Une reparation mineure negligee peut rapidement devenir une facture importante. Inspectez regulierement votre bateau pour detecter les problemes avant qu'ils ne s'aggravent.",
        },
        {
          title: 'Comparez plusieurs devis',
          desc: "Ne vous contentez pas du premier devis. Demandez au moins 2 ou 3 estimations pour les travaux importants afin d'obtenir le meilleur rapport qualite-prix.",
        },
        {
          title: 'Hivernez votre bateau correctement',
          desc: "Un hivernage bien fait protege votre bateau du gel, de l'humidite et de la corrosion. Investir dans un bon hivernage, c'est economiser sur les reparations au printemps.",
        },
      ]
    : [
        {
          title: 'Anticipate small repairs',
          desc: 'A neglected minor repair can quickly become a major expense. Regularly inspect your boat to catch problems before they worsen.',
        },
        {
          title: 'Compare multiple quotes',
          desc: "Don't settle for the first quote. Request at least 2 or 3 estimates for major work to get the best value for your money.",
        },
        {
          title: 'Winter your boat properly',
          desc: 'Proper winterization protects your boat from frost, humidity, and corrosion. Investing in good winterization saves on spring repairs.',
        },
      ]

  const ctaText = isFr ? 'Suivre mes depenses sur FleetAi' : 'Track my expenses on FleetAi'

  const tipsHtml = tips
    .map(
      (tip, index) => `
        <tr>
          <td style="padding:15px 20px;border-bottom:1px solid #eeeeee;">
            <p style="margin:0 0 5px;color:#1e3a5f;font-size:16px;font-weight:bold;">${index + 1}. ${tip.title}</p>
            <p style="margin:0;color:#555555;font-size:14px;line-height:1.5;">${tip.desc}</p>
          </td>
        </tr>`
    )
    .join('')

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
        <h2 style="margin:0 0 25px;color:#333333;font-size:22px;">${title}</h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 25px;border:1px solid #eeeeee;border-radius:6px;">
          <tbody>
            ${tipsHtml}
          </tbody>
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
        <p style="margin:0;">FleetAi - Boat Fleet Management</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}
