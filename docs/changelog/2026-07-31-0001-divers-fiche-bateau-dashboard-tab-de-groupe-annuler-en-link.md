# 2026-07-31 — Divers fiche bateau & dashboard : `?tab=` de groupe, « Annuler » en `<Link>`, empty states KPI (#419)

Audit UX du 2026-07-19 : quatre irritants mineurs corrigés.

- **`?tab=` de groupe sur `/boats/:id`** : un ancien lien pointant sur une clé de groupe (`?tab=maintenance`, `?tab=navigation`) atterrissait silencieusement sur Aperçu. `use_boat_show_tabs.ts` mappe désormais les clés de groupe vers leur premier onglet feuille (ex. `maintenance` → `history`) et normalise l'URL vers l'onglet réellement affiché (un `?tab=` inconnu est retiré de l'URL).
- **« Annuler » sur `/boats/:id/edit`** : l'ancre `<a>` brute est remplacée par le `<Link>` d'Inertia — plus de full page reload.
- **Empty states des KPI du dashboard** : quand la flotte n'a aucun équipement saisi (0 moteur, 0 voile, 0 gréement), les trois cartes grises « Aucune donnée » sont remplacées par une seule carte combinée (bordure pointillée) avec un CTA « Saisir vos équipements » vers `/boats`. La grille est extraite dans `inertia/components/dashboard/DashboardStatsGrid.vue`.
- **Actions vs navigation dans l'en-tête du dashboard** : le lien « Bateaux » passe en variante `ghost` avec flèche (rendu « lien ») pour se distinguer des chips d'action « + Entrée journal » / « + Incident » ; « Nouveau bateau » reste le CTA primaire.
- **i18n** : nouvelles clés `dashboard.stats.equipmentEmpty.{title,description,cta}` (EN + FR).
- **Tests** : Vitest — clés de groupe mappées + URL normalisée (`use_boat_show_tabs`), lien Annuler en `<Link>` (`boats_edit_delete_button`), état combiné et CTA (`dashboard_stats_grid`).
