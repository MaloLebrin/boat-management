import EmailQueueService from '#services/email_queue_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class MailPreviewsController {
  constructor(private emailQueueService: EmailQueueService) {}

  index({ response }: HttpContext) {
    const templates = this.emailQueueService.listTemplates()
    const links = templates
      .map(
        (t) =>
          `<li style="margin:8px 0;"><a href="/dev/mails/${t.name}" style="color:#1e3a5f;text-decoration:none;font-size:15px;">
            ${t.label}
            <span style="color:#aaa;font-size:12px;margin-left:8px;">${t.name}</span>
          </a></li>`
      )
      .join('')

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dev — Aperçu des emails</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 700px; margin: 60px auto; padding: 0 20px; color: #333; }
    h1 { font-size: 22px; color: #1e3a5f; margin-bottom: 6px; }
    p { color: #777; font-size: 13px; margin-bottom: 24px; }
    ul { list-style: none; padding: 0; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
    li { padding: 12px 16px; border-bottom: 1px solid #f0f0f0; }
    li:last-child { border-bottom: none; }
    li:hover { background: #f9f9f9; }
    a { display: block; }
  </style>
</head>
<body>
  <h1>Aperçu des templates email</h1>
  <p>Environnement de développement uniquement — non disponible en production.</p>
  <ul>${links}</ul>
</body>
</html>`

    return response.header('Content-Type', 'text/html').send(html)
  }

  show({ params, response }: HttpContext) {
    const html = this.emailQueueService.previewTemplate(params.name)

    if (html === null) {
      return response.status(404).send(`Template "${params.name}" introuvable.`)
    }

    return response.header('Content-Type', 'text/html').send(html)
  }
}
