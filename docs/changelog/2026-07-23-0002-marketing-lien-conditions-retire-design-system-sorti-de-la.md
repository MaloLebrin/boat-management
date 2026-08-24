# 2026-07-23 — Marketing : lien « Conditions » retiré, /design-system sorti de la nav/sitemap, emails unifiés (#413)

Audit UX du 2026-07-19 : le footer marketing pointait « Conditions » vers `href="#"` (lien mort, aucune page CGU/CGV n'existe), la page interne `/design-system` était exposée dans la nav publique (header + drawer mobile) et dans le sitemap (priorité 0.5), et les emails de support divergeaient entre `.io` (auth) et `.fr` (contact).

- **Lien mort supprimé** : le lien « Conditions » (`public.footer.terms`) est retiré du footer en attendant une vraie page CGU ; la clé i18n `terms` correspondante est supprimée dans les deux locales.
- **`/design-system` masqué du public** : lien retiré de la nav du header (`AppHeader.vue`) et du drawer mobile (`AppHeaderMobileDrawer.vue`), et sortie du sitemap (`STANDALONE_PAGES` désormais vide). La route reste accessible par URL directe.
- **Emails unifiés sur `@fleetai.app`** (domaine canonique du code, cf. `SITE_URL`) : pages auth (`support@fleetai.io` → `.app`) et contact/marketing (`support`, `hello`, `press`, `partners@fleetai.fr` → `.app`).
- **Tests** : le test fonctionnel `sitemap.spec.ts` vérifie l'absence de `/design-system` ; nouveau test `public_nav_footer.spec.ts` (header sans lien design-system, footer sans lien mort).
