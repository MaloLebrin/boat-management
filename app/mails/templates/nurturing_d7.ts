import env from '#start/env'

export function buildNurturingD7Html(totalMin: string, totalMax: string, isFr: boolean): string {
  const appUrl = env.get('APP_URL')

  const title = isFr
    ? "Votre estimation d'entretien bateau — toujours disponible"
    : 'Your boat maintenance estimate — still available'

  const message = isFr
    ? `Votre bateau vous coutera entre <strong>${totalMin}</strong> et <strong>${totalMax}</strong> par an en entretien. FleetAi vous aide a planifier et anticiper ces depenses.`
    : `Your boat will cost between <strong>${totalMin}</strong> and <strong>${totalMax}</strong> per year in maintenance. FleetAi helps you plan and anticipate these expenses.`

  const ctaText = isFr ? 'Creer mon compte gratuitement' : 'Create my free account'
  const gdprText = isFr ? 'Vos donnees ne seront pas partagees.' : 'Your data will not be shared.'

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
        <p style="margin:0 0 25px;color:#555555;font-size:16px;line-height:1.6;">
          ${message}
        </p>
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
