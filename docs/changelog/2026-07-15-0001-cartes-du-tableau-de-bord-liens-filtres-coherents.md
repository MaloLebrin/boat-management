# 2026-07-15 — Cartes du tableau de bord : liens filtrés cohérents

Les cartes de stats en haut du tableau de bord (`dashboard.vue`) pointaient toutes vers la même liste `/boats`, sans rapport avec leur contenu (Moteurs, Voiles, Gréements menaient au même endroit que Bateaux).

- **Destinations filtrées** : chaque carte renvoie désormais vers une liste `/boats` filtrée cohérente — Moteurs → `/boats?hasEngine=true`, Voiles → `/boats?hasSails=true`, Gréements → `/boats?hasRig=true`. Les cartes Bateaux (`/boats`) et Maintenance urgente (`/planning`) sont inchangées.
- **Nouveaux filtres de présence d'équipement** (`BoatListService`) : `hasEngine`, `hasSails`, `hasRig` filtrent sur la présence réelle de l'équipement (`query.has('engines' | 'sails' | 'rig')`), et non sur `propulsionType` (dont les valeurs `sailboat/motorboat/…` ne correspondent pas à « possède un moteur » — un voilier peut avoir un moteur d'appoint). Type `BoatListQuery` étendu (`shared/types/boat.ts`), nouveau helper `toBooleanFlag` (`shared/helpers/query.ts`). Les filtres existants (`q`, `type`, `propulsionType`, tri, pagination) sont inchangés.
