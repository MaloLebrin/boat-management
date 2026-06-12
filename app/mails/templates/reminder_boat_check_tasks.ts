import env from '#start/env'
import type { ReminderTaskItem } from '#shared/types/reminder'

export function buildReminderBoatCheckTasksHtml(
  displayName: string,
  tasks: ReminderTaskItem[]
): string {
  const appUrl = env.get('APP_URL')
  const taskRows = tasks
    .map(
      (t) => `<tr>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;color:#333333;font-size:14px;">${t.title}</td>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;color:#555555;font-size:14px;">${t.boatName}</td>
          <td style="padding:10px 15px;border-bottom:1px solid #eeeeee;color:#e07000;font-size:14px;">${t.dueAt ? t.dueAt.slice(0, 10) : '—'}</td>
        </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inspection bateau a venir</title>
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
          Des inspections bateau arrivent a echeance dans les 30 prochains jours. Assurez-vous que vos bateaux sont en etat de naviguer.
        </p>
        <p style="margin:0 0 20px;color:#555555;font-size:16px;line-height:1.5;">
          Boat inspections are due within the next 30 days. Make sure your boats are seaworthy.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 25px;border:1px solid #eeeeee;border-radius:6px;">
          <thead>
            <tr>
              <th style="padding:10px 15px;text-align:left;background-color:#f4f4f7;color:#555555;font-size:12px;text-transform:uppercase;">Tache / Task</th>
              <th style="padding:10px 15px;text-align:left;background-color:#f4f4f7;color:#555555;font-size:12px;text-transform:uppercase;">Bateau / Boat</th>
              <th style="padding:10px 15px;text-align:left;background-color:#f4f4f7;color:#555555;font-size:12px;text-transform:uppercase;">Echeance / Due</th>
            </tr>
          </thead>
          <tbody>${taskRows}</tbody>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
          <tr>
            <td style="border-radius:6px;background-color:#1e3a5f;">
              <a href="${appUrl}/maintenance" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                Voir les inspections / View inspections
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
