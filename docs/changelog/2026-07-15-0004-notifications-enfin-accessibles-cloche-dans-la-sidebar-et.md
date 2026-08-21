# 2026-07-15 — Notifications enfin accessibles (cloche dans la sidebar et le header mobile)

La fonctionnalité notifications était entièrement inaccessible : la cloche (`NotificationBell.vue`) n'était utilisée que par `Header.vue`, un composant monté dans aucun layout. La page `/notifications` fonctionnait mais aucun lien n'y menait (aucune cloche, aucun badge de non-lus).

- **Cloche montée dans le layout authentifié** : `NotificationBell` est désormais affichée dans la barre latérale desktop (`AsideMenu.vue`, à côté du logo) et dans le header mobile (`layouts/default.vue`, à côté du hamburger). Le badge de non-lus et le panneau déroulant (`NotificationPanel.vue`, lien « Voir toutes les notifications » → `/notifications`) sont donc accessibles partout dans l'app.
- **Nouvelles props d'adaptation** : `NotificationBell` accepte `align` (`left`/`right`, transmise au panneau qui s'ouvre `left-0`/`right-0` — évite le débordement hors-écran depuis la sidebar étroite) et `tone` (`default`/`onDark`, pour un contraste correct sur le fond navy de la sidebar et du header mobile).
- **Nettoyage** : suppression du code mort `Header.vue` (plus référencé nulle part).
