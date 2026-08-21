# 2026-06-27 — File d'attente offline : liste et annulation des mutations en attente

Complète l'issue #120 en ajoutant la visibilité et la gestion des actions hors-ligne en attente de synchronisation.

- `useOfflineQueue` : ajout de `pendingActions` (ref réactive sur la liste complète des items IDB) et `cancelAction(id)` (suppression individuelle + toast)
- `OfflinePendingQueue.vue` : composant affiché en haut du layout quand des mutations sont en attente — liste chaque action avec son type traduit, son heure et un bouton "Annuler"
- `default.vue` : intègre `<OfflinePendingQueue />` au-dessus du contenu de page
- i18n EN + FR : clés `offline.queue.*` (titre, syncNow, cancel, cancelled, cancelAriaLabel, type.\*)
- Tests Vitest : 9 nouveaux tests (`use_offline_queue` × 5 pour `pendingActions`/`cancelAction`, `offline_pending_queue` × 4 pour le composant)
