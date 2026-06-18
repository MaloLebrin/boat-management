import Boat from '#models/boat'
import type { HttpContext } from '@adonisjs/core/http'

export default class PdfPreviewsController {
  async index({ response, auth }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    const boats = user.organizationId ? await this.#loadBoats(user.organizationId) : []
    return response.header('Content-Type', 'text/html').send(this.#renderPage(boats, null))
  }

  async show({ params, response, auth }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    const boats = user.organizationId ? await this.#loadBoats(user.organizationId) : []
    return response
      .header('Content-Type', 'text/html')
      .send(this.#renderPage(boats, Number(params.id)))
  }

  async #loadBoats(organizationId: number) {
    return Boat.query()
      .where('organizationId', organizationId)
      .orderBy('name', 'asc')
      .select('id', 'name')
  }

  #renderPage(boats: Array<{ id: number; name: string }>, selectedId: number | null): string {
    const listItems = boats
      .map(
        (b) =>
          `<li><a href="/dev/pdfs/${b.id}" data-id="${b.id}"${selectedId === b.id ? ' class="active"' : ''}>${b.name}</a></li>`
      )
      .join('')

    const selectedBoat = selectedId ? boats.find((b) => b.id === selectedId) : null
    const pdfUrl = selectedId ? `/boats/${selectedId}/maintenance-log.pdf` : null

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dev — Apercu PDFs</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; display: flex; height: 100vh; overflow: hidden; }

    aside {
      width: 260px;
      flex-shrink: 0;
      background: #0b1d2e;
      display: flex;
      flex-direction: column;
    }
    aside header { padding: 20px 16px 14px; border-bottom: 1px solid #1a2f42; }
    aside header h1 { font-size: 15px; color: #fff; margin-bottom: 3px; }
    aside header p { font-size: 11px; color: #888; }
    aside nav { overflow-y: auto; flex: 1; }
    aside nav ul { list-style: none; }
    aside nav li a {
      display: block;
      padding: 11px 16px;
      font-size: 13px;
      color: #c8d8e8;
      text-decoration: none;
      border-bottom: 1px solid #0f2538;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    aside nav li a:hover { background: #1a2f42; color: #fff; }
    aside nav li a.active { background: #e2674f; color: #fff; font-weight: 600; }
    aside footer { padding: 12px 16px; font-size: 11px; color: #555; border-top: 1px solid #1a2f42; }

    main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #f4f4f4; }
    .toolbar {
      height: 42px;
      background: #fff;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      padding: 0 16px;
      font-size: 12px;
      color: #666;
      gap: 8px;
    }
    .toolbar strong { color: #0b1d2e; }
    .toolbar a { margin-left: auto; color: #e2674f; text-decoration: none; font-size: 12px; }
    .toolbar a:hover { text-decoration: underline; }
    .placeholder {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #aaa;
      font-size: 14px;
    }
    iframe { flex: 1; border: none; width: 100%; }
  </style>
</head>
<body>
  <aside>
    <header>
      <h1>Apercu PDFs</h1>
      <p>Dev uniquement</p>
    </header>
    <nav><ul>${listItems}</ul></nav>
    <footer>${boats.length} bateau${boats.length !== 1 ? 'x' : ''}</footer>
  </aside>
  <main>
    <div class="toolbar">
      <span id="toolbar-label">${selectedBoat ? `Carnet d'entretien — <strong>${selectedBoat.name}</strong>` : 'Selectionnez un bateau'}</span>
      ${pdfUrl ? `<a id="dl" href="${pdfUrl}">Telecharger</a>` : '<a id="dl" href="#" style="display:none">Telecharger</a>'}
    </div>
    ${
      pdfUrl
        ? `<iframe id="frame" src="${pdfUrl}?inline=1" title="Apercu PDF"></iframe>`
        : `<div class="placeholder" id="placeholder">← Cliquez sur un bateau pour afficher son carnet d'entretien</div><iframe id="frame" style="display:none" title="Apercu PDF"></iframe>`
    }
  </main>
  <script>
    const frame = document.getElementById('frame')
    const placeholder = document.getElementById('placeholder')
    const label = document.getElementById('toolbar-label')
    const dl = document.getElementById('dl')

    document.querySelectorAll('aside nav a').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault()
        const id = link.dataset.id
        const name = link.textContent.trim()
        history.pushState({}, '', '/dev/pdfs/' + id)
        activate(id, name)
      })
    })

    function activate(id, name) {
      document.querySelectorAll('aside nav a').forEach((l) => l.classList.toggle('active', l.dataset.id === id))
      label.innerHTML = "Carnet d'entretien — <strong>" + name + '</strong>'
      dl.href = '/boats/' + id + '/maintenance-log.pdf'
      dl.style.display = 'inline'
      if (placeholder) placeholder.style.display = 'none'
      frame.style.display = 'block'
      frame.src = '/boats/' + id + '/maintenance-log.pdf?inline=1'
    }

    window.addEventListener('popstate', () => {
      const m = location.pathname.match(/\\/dev\\/pdfs\\/(\\d+)/)
      if (m) {
        const link = document.querySelector('a[data-id="' + m[1] + '"]')
        if (link) activate(m[1], link.textContent.trim())
      }
    })
  </script>
</body>
</html>`
  }
}
