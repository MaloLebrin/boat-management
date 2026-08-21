# 2026-06-29 — [G-02] Contrainte UNIQUE sur spot_id dans boats

**Bug corrigé**

- Migration `1805000001000` : ajout de la contrainte `UNIQUE (spot_id)` sur la table `boats` — PostgreSQL ignore les NULL, plusieurs bateaux sans spot restent valides
- `app/models/spot.ts` : relation `hasMany(() => Boat)` → `hasOne(() => Boat)` pour refléter la cardinalité réelle
- `app/services/boat_hull_service.ts` : éviction silencieuse de l'occupant précédent avant toute assignation (`createForUser`, `updateForUser`, `updateAssignment`) — chaque opération wrapped dans `db.transaction()` + `FOR UPDATE` pour éviter les race conditions
- Tests : 5 tests fonctionnels couvrant assignation libre, éviction lors d'un PATCH, éviction lors d'un POST /boats, réassignation sur le spot courant, désassignation
