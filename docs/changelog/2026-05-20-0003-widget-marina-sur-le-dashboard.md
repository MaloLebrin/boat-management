# 2026-05-20 — Widget Marina sur le Dashboard

Ajout d'un widget "Marinas" sur la page d'accueil du tableau de bord.

- **`DashboardService`** : fetch des ports via `PortService.listForUser()`, nouveau type `DashboardPortItem` et `DashboardPortStats`
- **`PortService.listForUser()`** : ajout du comptage des spots totaux (via pontoons et mouillages) — calcul de `totalSpots` et `freeSpots`
- **`PortListItem`** (type frontend) : nouveaux champs `totalSpots` et `freeSpots`
- **`MarinaDashboardCard.vue`** : composant affichant la liste des ports avec taux de remplissage (barre de progression), nombre de places libres/total, et stats globales
- **i18n** : clés `dashboard.marina.*` ajoutées en FR et EN
