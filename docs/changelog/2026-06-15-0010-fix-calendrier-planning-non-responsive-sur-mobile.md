# 2026-06-15 — Fix : calendrier planning non responsive sur mobile (#53)

**Vue agenda sur mobile — `inertia/pages/planning/index.vue`**

Sur mobile (`< sm`), la grille 7 colonnes fixe du calendrier compressait chaque colonne à ~45px, rendant les événements illisibles. Ajout d'une vue agenda/liste pour les écrans mobiles : les jours du mois courant ayant des tâches sont affichés en liste verticale avec numéro de jour, étiquette courte du jour et toutes les tâches cliquables. La grille 7 colonnes est conservée à partir de `sm`. Nouvelle clé i18n `planning.calendar.agendaEmpty` (FR + EN) pour l'état vide.
