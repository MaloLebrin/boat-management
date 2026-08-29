# Domaine — Conformité de l'armement (Division 240)

> ⚠️ FleetAi **aide au suivi** de l'armement de sécurité : il ne remplace ni le texte officiel de
> la Division 240, ni un contrôle des Affaires maritimes. Rien dans le produit n'est bloqué par
> une non-conformité.

## Objectif fonctionnel

Confronter l'inventaire de sécurité d'un bateau (`boat_safety_equipment`) au matériel exigé par la
Division 240 pour le **programme de navigation déclaré**, et signaler :

- les équipements **absents** de l'inventaire ;
- les **quantités insuffisantes** (gilets vs `max_persons`) ;
- les équipements **périmés** ou **à réviser**, y compris quand aucune date de péremption n'a été
  saisie mais qu'une date d'achat permet d'appliquer une durée de vie réglementaire.

## La nuance qui structure tout : zone d'armement ≠ catégorie CE

La Division 240 ne raisonne **pas** en catégorie de conception CE (A–D) mais en **distance d'un
abri** :

| Zone (`armament_zone`) | Distance d'un abri |
| ---------------------- | ------------------ |
| `basic`                | ≤ 2 milles         |
| `coastal`              | ≤ 6 milles         |
| `semi_offshore`        | ≤ 60 milles        |
| `offshore`             | > 60 milles        |

Un bateau de catégorie CE B peut naviguer en zone `basic`, et inversement. `navigation_category`
reste donc ce qu'elle est (conception CE) et n'a **aucun** effet sur la conformité ; l'aide de champ
du formulaire bateau le rappelle sur les deux champs.

`armament_zone` est **nullable** : un bateau sans zone déclarée ne déclenche aucun contrôle. Tous
les bateaux antérieurs à #582 sont dans ce cas — leur comportement est strictement inchangé.

## Corpus

`shared/constants/safety/division240_content.ts` — matrices statiques typées, sur le modèle du
catalogue d'opérations de maintenance (#581).

- `DIVISION_240_TEXT_VERSION` **date la version du texte** sur laquelle le corpus a été écrit. La
  Division 240 évolue : relever cette date à chaque relecture, et l'afficher dans le panneau.
- `DIVISION_240_REQUIREMENTS` : une exigence = un `equipmentType` de l'inventaire, une `minZone`,
  une quantité (`per_person` ou `fixed`), une `articleRef`. Les exigences sont **cumulatives** :
  une règle `coastal` s'applique aussi en `semi_offshore` et `offshore`.
- `DIVISION_240_LIFETIMES` : durée de vie (`expiry`) ou périodicité de révision (`review`) par type
  d'équipement — fusées 3 ans, extincteur vérifié tous les ans, radeau révisé tous les ans,
  percuteurs de gilets tous les 2 ans, batterie de balise tous les 5 ans.
- `DIVISION_240_UNTRACKED_ITEMS` : les éléments d'armement que le vocabulaire d'inventaire
  (16 `safetyEquipmentTypes`) ne sait pas représenter — moyen de repérage lumineux, moyen de
  remorquage, RIPAM, cartes marines, réception météo, document de synthèse. Ils sont **affichés en
  note** sous le panneau et **jamais comptés** dans le score : signaler « manquant » ce que
  l'utilisateur ne peut pas saisir serait du bruit.

**Invariants** (vérifiés par `tests/inertia/division240_content.spec.ts`) : clés stables et
uniques, `key = <minZone>.<equipmentType>`, `labelKey` présent dans les deux locales, cumul des
zones, `equipmentType` appartenant au vocabulaire de l'inventaire.

### Référence d'article

Toutes les exigences citent l'annexe **240-A.2**, qui porte le tableau du matériel exigé par zone.
Le corpus ne cite volontairement pas de numéro d'article plus fin : une référence approximative
affichée à l'utilisateur serait pire qu'une référence large et exacte.

## Calcul

`app/services/boat_safety_compliance_service.ts` — calcul **pur**, sans requête ni effet de bord.

- `forBoat(boat)` : mappe un bateau déjà chargé (relation `safetyEquipment` préchargée) puis
  délègue à `buildReport`.
- `buildReport(input)` : `zone + max_persons + propulsion + inventaire → SafetyComplianceReport`
  (`shared/types/safety.ts`).

Règles :

1. **Zone nulle** → rapport vide, `score: null`, aucune ligne.
2. **Échéances** — passe sur tout l'inventaire, y compris les équipements que la zone n'exige pas
   (un radeau périmé reste une information utile). Une date saisie prime sur la durée de vie du
   corpus ; la ligne indique laquelle des deux a servi (`dueDateSource`).
3. **Exigences** — absence puis quantité. `per_person` s'appuie sur `max_persons` ; sans cette
   valeur, on retombe sur 1 (sous-estimer plutôt qu'inventer un équipage).
4. **Satisfaction** — une exigence est couverte si l'équipement est présent, en quantité suffisante
   et sans échéance **dépassée**. Une échéance proche alerte sans invalider l'exigence.
5. **Score** = `satisfiedCount / requirementCount` en pourcentage entier.
6. Le harnais n'est exigé que sur un bateau à voile (`sailboat`, `catamaran`).

## UI

`inertia/components/boats/safety/BoatSafetyCompliancePanel.vue`, rendu en tête du filtre
« Sécurité » de l'onglet **Équipements** de la fiche bateau
(`BoatShowTabEquipment.vue`).

- Le rapport est calculé côté serveur et passé en prop `safetyCompliance` par
  `toShowShellProps` — il fait partie du squelette de la fiche, pas des données différées (#463).
- Chaque ligne « manquant » propose **« Ajouter cet équipement »**, qui ouvre la modale de création
  de `BoatSafetyEquipmentCard` **pré-remplie** sur le bon `equipmentType`.
- Sans zone déclarée, le panneau se contente d'inviter à la renseigner (lien vers l'édition).
- Le disclaimer et la version du texte sont affichés en permanence.

## Notifications

`app/services/notification_scan_service.ts` couvre, en plus des `expiry_date` saisies, les
équipements **sans date de péremption mais avec une date d'achat** : la durée de vie du corpus les
date. Les deux volets sont fusionnés avant agrégation, pour qu'un bateau cumulant les deux cas ne
reçoive qu'une notification. Une révision échue emprunte le type `safety_equipment.expired` : le
vocabulaire `NotificationType` ne distingue pas les deux, et l'action attendue est la même.

## Hors périmètre

- Réglementations non françaises (le RIPAM seul est international) — le corpus est versionné pour
  permettre d'autres juridictions plus tard.
- Armement des navires professionnels (Divisions 222/226) : l'app cible la plaisance.
- Tout blocage fonctionnel ou validation légale.
- Génération automatique de l'inventaire à la création du bateau.
