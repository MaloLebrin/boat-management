# 2026-09-29 — CSP : frame-ancestors et form-action (#779)

Durcissement des en-têtes CSP manquants, sans collecteur de rapports ni élargissement HSTS.

- **Correctif.** `config/shield.ts` déclare `frameAncestors: ["'none'"]` (en plus de `X-Frame-Options: DENY`) et `formAction: ["'self'"]`. Commentaire sur `connectSrc: ["'self'"]` : Transmit SSE ouvre EventSource sur `window.location.origin`, donc la directive reste correcte en mode bloquant.
- **Déjà en place.** `Referrer-Policy: strict-origin-when-cross-origin` via `SecurityHeadersMiddleware` (#770) — hors périmètre de cette PR.
- **Report-only.** Conservé hors production (`reportOnly: !app.inProduction`) : la console Chromium a déjà servi de signal pour #830 / #831. Pas de `report-uri` / `report-to` pour l'instant.
- **HSTS.** `includeSubDomains` et `preload` restent absents : la couverture HTTPS de tous les sous-domaines n'est pas confirmée, et l'en-tête est mis en cache 180 jours.
- **Tests.** `tests/unit/config/shield.spec.ts` (directives, xFrame DENY, reportOnly, HSTS) ; `tests/functional/security/csp_frame_form.spec.ts` rejoue le vrai `ShieldMiddleware` et lit `frame-ancestors` / `form-action` dans l'en-tête émis.
