# 2026-10-12 — Stockage persistant pour la file hors-ligne et les caches (#952)

Brique de la phase 0 de l'épic « Mode traversée » (#949). Sans persistance, iOS évince le stockage d'une origine après 7 jours sans visite (hors PWA installée) et Android peut le faire sous pression disque : la file IndexedDB et les caches du service worker ne survivaient pas forcément à une traversée de 2 à 4 semaines.

- **Nouveau composable** `inertia/composables/use_persistent_storage.ts` : `requestPersistentStorage()` appelle `navigator.storage.persist()` (sauf si `persisted()` est déjà vrai), une seule fois par chargement de page même en cas de refus. Ne lève jamais : API absente, refus ou erreur rendent `false`. `usePersistentStorage()` expose `persisted` et `estimate` (`usage`/`quota`, via `refreshStorageEstimate()`).
- **Déclencheurs** : l'événement `appinstalled` (`use_pwa_install.ts`) et l'ajout d'une nouvelle action par `enqueue` (`use_offline_queue.ts`) ; un upsert par `dedupeKey` ne redemande rien.
- **Copilote** : l'entrée `session-duration` de `product_knowledge.ts` mentionne la conservation des données hors-ligne.
- **Doc** : section « Stockage persistant » dans `docs/domain/offline-queue.md`.
- **Tests** : `tests/inertia/use_persistent_storage.spec.ts` (API absente, refusée, accordée, déjà persistante, demande unique, erreurs, déclencheur `appinstalled`) ; `tests/inertia/use_offline_queue.spec.ts` (demande au premier `enqueue`, pas sur l'upsert).
