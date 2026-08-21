# 2026-07-17 — Petits défauts UI : selects, doubles labels, empty state, icônes (#370)

Correction d'un lot de défauts cosmétiques repérés lors d'un audit UI, chacun trivial isolément mais dégradant la finition perçue.

- `BaseSelect.vue` : l'option placeholder (« Select… ») n'est plus rendue quand une valeur réelle est déjà sélectionnée et que `allow-empty` n'est pas passé — corrige les selects Sort/Direction (`/boats`) et Sort (`/maintenance/history`) qui affichaient un choix fantôme alors qu'un tri est toujours actif.
- `MaintenanceHistoryToolbar.vue` : le champ de recherche réutilisait par erreur la clé `filterBar.subjectLabel` (« Sujet ») du select juste à côté → nouvelle clé `filterBar.searchLabel` (EN+FR).
- `BoatShowTabTasks.vue` : le message « Aucune tâche correspondante » (zone filtres) ne s'affiche plus en même temps que l'empty state du panneau de création juste en dessous — il n'apparaît désormais que si le filtre actif exclut des tâches existantes, pas quand il n'y a aucune tâche du tout (le panneau reste alors seul responsable du message + CTA de création).
- `BoatEquipmentAddModal.vue` : les icônes emoji des catégories (⚙️⛵⚓🦺🧭⚡🔩📦) remplacées par des icônes filaires Heroicons (`Cog6ToothIcon`, `FlagIcon`, `AdjustmentsVerticalIcon`, `LifebuoyIcon`, `MapPinIcon`, `BoltIcon`, `LinkIcon`, `Square3Stack3DIcon`, `PuzzlePieceIcon`), cohérent avec le reste de l'app.
- `BoatShowRigCard.vue` : le lien « + »/crayon du bloc Rig (onglet Équipement) affiche maintenant un libellé (« Add rig »/« Edit rig », réutilise les clés existantes `boats.rig.addTitle`/`editTitle`) et un `aria-label`, comme les blocs Engines/Sails.
- `BoatTable.vue` (`/boats`) : les colonnes Registration et Type sont masquées quand aucun bateau affiché ne renseigne la donnée, au lieu d'afficher une colonne entière de « — ».
- `BoatListToolbar.vue` (`/boats`) : le toggle Table/Cards ne s'étire plus sur une moitié de ligne pleine largeur ; le bloc gauche (toggle + compteur) garde sa largeur intrinsèque, aligné à gauche, pendant que les filtres de tri restent à droite.
- Vérifié que le statut KPI équipement à 0 (dashboard) et le breadcrumb fiche bateau (doublon « Fleet > Boats ») étaient déjà corrigés par des PR précédentes (#387, #365) — rien à faire sur ces deux points.
- **Tests** : `base_select.spec.ts` (nouveaux cas placeholder), `boat_table.spec.ts`, `boat_show_rig_card.spec.ts`, `boat_equipment_add_modal.spec.ts`, `boat_show_tab_tasks.spec.ts`, `maintenance_history_toolbar.spec.ts`, `boat_list_toolbar.spec.ts` (tous nouveaux).
