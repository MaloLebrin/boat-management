# 2026-09-19 — Portail propriétaire : la prop d'entretien passe par un transformer (#781)

Le portail propriétaire est servi au rôle `boat_owner`, le moins privilégié de
l'app — un propriétaire de bateau, souvent externe à l'organisation qui
exploite la flotte. Trois de ses quatre props passaient par un transformer.

- **Cause.** Dans la même expression, `boat`, `reservations` et `invoices`
  étaient explicitement transformés et `maintenanceEvents` passait tel quel :
  des modèles Lucid `BoatMaintenanceEvent` avec `preload('parts')`. Toutes les
  colonnes des deux tables partaient donc au client. Rien de confidentiel à ce
  jour, mais la propriété cassée est celle qui vaut partout ailleurs : ajouter
  une colonne n'expose rien tant qu'on ne l'ajoute pas au transformer. Les
  colonnes qu'on voudra ajouter à ces tables — coût d'achat réel d'une pièce,
  marge, conditions fournisseur, notes internes — sont précisément celles
  qu'un exploitant ne montre pas à ses propriétaires. Le `unitPrice` des
  pièces, lui, partait déjà.
- **Correctif.** `toBoatOwnerMaintenanceEvent`
  (`app/transformers/maintenance_transformer.ts`) et le type
  `BoatOwnerMaintenanceEventRow` (`shared/types/maintenance.ts`), dérivés de ce
  que `inertia/pages/owner/boats/show.vue` consomme réellement : sept champs,
  et **pas** les pièces. Le front cesse de redéclarer ce type en double — la
  page et `BoatOwnerMaintenanceTab.vue` portaient chacune leur copie inline.
- **`listForBoat(_user)`.** La méthode recevait un utilisateur qu'elle
  ignorait, préfixe `_` à l'appui : une signature qui laissait attendre une
  garantie qu'elle n'offrait pas. Le paramètre est retiré, et le fait que le
  cloisonnement incombe à l'appelant est écrit noir sur blanc. L'autre option
  — y porter le contrôle — casserait le portail : `assertBoatInUserOrg`
  compare `user.organizationId` à `boat.organizationId`, or un propriétaire
  peut être membre d'une organisation autre que celle de son FK. Les quatre
  appelants (portail, export CSV, fiche bateau, PDF du carnet) ont déjà résolu
  le bateau pour leur utilisateur.
- **Tests.** `tests/functional/organization/boat_owner_portal.spec.ts` fige la
  liste des clés exposées par la prop, crée un événement **avec** une pièce à
  42,50 € et vérifie que `parts` est absent. Sans ce test, la prop redeviendra
  brute à la première évolution.
