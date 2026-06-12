export function buildInvitationHtml(
  inviterName: string | null,
  orgName: string,
  acceptUrl: string
): string {
  const inviterDisplay = inviterName ?? 'A team member'
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to ${orgName}</title>
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
        <h2 style="margin:0 0 20px;color:#333333;font-size:22px;">You're Invited! / Vous etes invite !</h2>
        <p style="margin:0 0 15px;color:#555555;font-size:16px;line-height:1.5;">
          ${inviterDisplay} has invited you to join <strong>${orgName}</strong> on FleetAi.
        </p>
        <p style="margin:0 0 25px;color:#555555;font-size:16px;line-height:1.5;">
          ${inviterDisplay} vous a invite a rejoindre <strong>${orgName}</strong> sur FleetAi.
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
          <tr>
            <td style="border-radius:6px;background-color:#1e3a5f;">
              <a href="${acceptUrl}" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                Accept Invitation / Accepter l'invitation
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:25px 0 0;color:#888888;font-size:14px;line-height:1.5;">
          This invitation expires in 7 days. If you did not expect this, you can safely ignore this email.
        </p>
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
