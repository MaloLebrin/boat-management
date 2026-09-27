# Équipement : la catégorie « Autre » crée un équipement générique (#893)

**Date** : 2026-09-27

## Problème

La modale d'ajout d'équipement de la fiche bateau affichait une tuile « Autre » désactivée,
marquée « bientôt », avec l'encart « Catégorie bientôt disponible ». Pourtant, le modèle
d'équipement générique existe justement pour « tout le reste ».

## Changement

- `GENERIC_EQUIPMENT_CATEGORIES` (`shared/types/boat.ts`) gagne `other`. Le validator, le select
  du formulaire (`GENERIC_EQUIPMENT_CATEGORY_OPTIONS`), la carte Équipements et la modale suivent
  cette constante. **Pas de migration** : `boat_generic_equipment.category` est un `string` sans
  contrainte CHECK.
- `BoatEquipmentAddModal` : la tuile « Autre » ouvre le formulaire d'équipement générique,
  catégorie verrouillée à `other`, et poste sur `POST /boats/:id/generic-equipment`. La notion de
  catégorie « non supportée » et l'encart « bientôt » disparaissent. Le texte sur la pastille
  active passe à `text-on-brand`.
- Catalogue de marques : `other` n'a aucune marque dédiée. Le formulaire liste donc les marques à
  plat, sans groupe « pour cette catégorie » vide. Le test de couverture du corpus exclut `other`.
- Tâches de maintenance : un équipement `other` donne le sujet `other`
  (`shared/helpers/maintenance_task_equipment.ts`).
- i18n : nouveau libellé `boats.options.genericEquipmentCategory.other` (« Autre équipement » /
  « Other equipment »). Suppression dans les deux locales des clés mortes
  `boats.equipmentAddModal.comingSoon.*`, `…parts.comingSoon` et `…documents.comingSoon`.
- Base de connaissance de l'assistant : l'entrée `boats-equipment` mentionne la catégorie
  « Autre ».

## Remontées vérifiées

Un équipement `other` est un équipement générique comme les autres :

- onglet Équipements : groupé par `GENERIC_EQUIPMENT_CATEGORIES` ;
- tâches rattachables : type `generic` ;
- contexte IA : liste `genericEquipment`. Elle ne portait que la catégorie et la marque, si bien
  qu'un équipement `other` serait apparu comme « other (ok) ». Le contexte ajoute désormais le
  **nom** de l'équipement (`shared/types/ai.ts`, `ai_suggestion_context_service`), et le prompt
  l'affiche sous la forme `- <catégorie>: <nom> <marque> (<statut>)`.
