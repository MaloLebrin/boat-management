# 2026-08-29 — Élargissement des enums métier minces (#585)

Quatre chantiers indépendants de même nature : des listes de valeurs trop courtes (ou absentes) là où le métier a un vocabulaire précis. Même recette partout — vocabulaire partagé, validator, options, i18n `fr` + `en` — et **aucune valeur existante invalidée**.

## 1. Vocabulaire partagé des titres de navigation

- **Cause.** `crew_certifications.type` (6 valeurs) et `clients.navigationPermitType` (4 valeurs) entretenaient deux listes voisines, aucune ne couvrant une flotte française : ni CRR, ni Capitaine 200, ni fluvial, ni visite médicale, ni PSC1 — et le « VHF » existant était ambigu.
- **Correctif.** Source unique `shared/types/navigation_title.ts` : `coastal_permit`, `offshore_permit`, `inland_permit`, `captain_200`, `vhf`, `crr`, `stcw_basic`, `stcw_proficiency`, `medical_certificate`, `first_aid`, `other`. Les certifications d'équipage y puisent directement (migration de la contrainte CHECK) ; les permis clients y ajoutent `none`.
- **Rétrocompatibilité.** Les valeurs historiques `coastal`, `offshore`, `inland` restent **acceptées en création comme en mise à jour** et affichées avec leur libellé. Elles ne sont plus proposées à la saisie, mais une fiche qui en porte une la garde sélectionnée dans le formulaire — sans quoi un simple enregistrement aurait effacé le permis du client.
- **i18n.** Un seul namespace `common.navigationTitles.*` (fr + en) remplace `crew.certTypes` et `clients.permitTypes`.

## 2. Durées de validité par défaut

- **Correctif.** `shared/helpers/navigation_title.ts` porte les durées réelles (visite médicale 2 ans, STCW 5 ans) ; le formulaire de certification propose la date d'expiration correspondante. Les titres délivrés à vie (permis français, CRR, PSC1) ne proposent rien.
- **Non destructif.** La suggestion ne remplace `expiresAt` que s'il est vide ou porte encore une proposition précédente : une date saisie à la main survit à un changement de type, et le champ reste modifiable et effaçable.

## 3. Type de prestation d'une réservation

- **Cause.** `boat_reservations` n'avait que `status` : une location coque nue, une sortie skippée et une croisière à la cabine étaient indistinguables, alors que le prix, les obligations (skipper à bord, permis du client) et les statistiques en dépendent.
- **Correctif.** Colonne `boat_reservations.type` **nullable** (`bareboat`, `skippered`, `day_charter`, `cabin`, `other`, contrainte CHECK). Select dans le formulaire de création et la modale d'édition, badge `ReservationTypeBadge` dans la liste par bateau et la liste flotte, filtre `?type=` sur `/reservations` qui cohabite avec le filtre bateau.
- **Planning.** Les pastilles du calendrier et les barres de la frise sont trop étroites pour un badge : le type y rejoint l'infobulle, à côté du nom du client.
- **Existant.** `type` nul, aucun badge affiché (un tiret), affichage inchangé.

## 4. Carburant des pleins

- **Cause.** `boat_fuel_logs` ne portait pas de carburant — il n'existait que sur le moteur. Un bateau bi-motorisation (in-bord diesel + hors-bord essence, cas de la sandbox) ne pouvait pas dire ce qu'il avait avitaillé, et les statistiques de consommation mélangeaient tout.
- **Correctif.** Colonne `boat_fuel_logs.fuel_type` **nullable**, même vocabulaire que `boat_engines.fuel` — désormais une seule liste (`ENGINE_FUELS` dans `shared/constants/boats/boat_form_options.ts`), réexportée par `app/validators/boat.ts`. Le formulaire pré-remplit le carburant d'après le moteur sélectionné ; un carburant choisi à la main n'est jamais écrasé. Le service applique le même repli pour les envois qui ne passent pas par le formulaire (file d'attente hors-ligne).
- **Affichage et export.** Carburant visible dans l'onglet Carburant de la fiche bateau et sur `/navigation/fuel` (colonne + repli carte mobile). L'export CSV gagne une colonne `carburant`, vide pour l'historique.

## Migrations

- `1830000000000_alter_crew_certifications_type_enum` — remplace la contrainte CHECK ; le `down()` échoue volontairement si une nouvelle valeur est déjà utilisée, plutôt que de perdre des lignes silencieusement.
- `1831000000000_add_type_to_boat_reservations_table` — colonne nullable + CHECK, `down()` complet.
- `1832000000000_add_fuel_type_to_boat_fuel_logs_table` — colonne nullable + CHECK, `down()` complet.
- `database/schema.ts` régénéré par `node ace migration:run`.

## Tests

- **Japa unit** — `suggestedExpiryDate` : durées par type, titres à vie, aucun type choisi.
- **Japa functional** — chacun des 11 titres accepté sur une certification, valeurs historiques de permis client toujours acceptées en update, refus des valeurs hors vocabulaire (certification, permis, type de réservation, carburant) ; type de réservation posé, effacé, préservé quand le PATCH ne le mentionne pas ; filtre `?type=` et rejet silencieux d'un filtre inconnu ; pré-remplissage du carburant depuis le moteur et primauté d'un carburant explicite ; colonne `carburant` de l'export CSV, vide pour l'historique.
- **Vitest** — options des selects (certification, permis client, carburant) alignées sur le vocabulaire partagé ; valeur historique de permis restée sélectionnée ; suggestion d'expiration proposée puis non écrasée ; variantes du badge de type et absence de badge sans type ; filtres de la page flotte, dont la cohabitation bateau + type.
