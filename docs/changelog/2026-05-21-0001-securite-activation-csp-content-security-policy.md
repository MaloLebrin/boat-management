# 2026-05-21 — Sécurité : activation CSP (Content-Security-Policy)

`config/shield.ts` : CSP activée en mode `reportOnly: true`.  
Directives : `default-src 'self'`, `img-src` autorise `res.cloudinary.com`, nonce Shield pour scripts et styles Vite/Inertia.  
Template `inertia_layout.edge` : nonce ajouté sur le `<script type="application/ld+json">` inline.  
**Prochaine étape** : surveiller les violations en prod, puis passer `reportOnly: false`.
