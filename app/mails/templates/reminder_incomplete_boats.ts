import env from '#start/env'
import type { ReminderBoatItem } from '#shared/types/reminder'

export function buildReminderIncompleteBoatsHtml(
  displayName: string,
  boats: ReminderBoatItem[]
): string {
  const appUrl = env.get('APP_URL')
  const boatRows = boats
    .map(
      (b) => `<tr>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;color:#333333;font-size:14px;">${b.name}</td>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;text-align:right;">
            <a href="${appUrl}/boats/${b.id}" style="color:#1e3a5f;font-size:14px;">Completer / Complete</a>
          </td>
        </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bateaux incomplets</title>
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
        <h2 style="margin:0 0 20px;color:#333333;font-size:22px;">Bonjour ${displayName},</h2>
        <p style="margin:0 0 20px;color:#555555;font-size:16px;line-height:1.5;">
          Les bateaux suivants manquent d'informations cles (type, dimensions, annee...). Completez-les pour profiter des estimations de couts et des alertes maintenance.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 25px;border:1px solid #eeeeee;border-radius:6px;">
          <tbody>${boatRows}</tbody>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
          <tr>
            <td style="border-radius:6px;background-color:#1e3a5f;">
              <a href="${appUrl}/boats" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                Voir ma flotte / View my fleet
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
