# 2026-07-23 — Membres et accès : confirmation au changement de rôle + lien « Assigner ses bateaux » (#415)

Audit UX du 2026-07-19 : dans Réglages → Membres et accès, changer le rôle d'un membre via le `<select>` déclenchait immédiatement le `PUT`, sans confirmation ni possibilité d'annuler — une mauvaise sélection à la molette/clavier suffisait à donner Admin ou à couper l'accès staff de quelqu'un.

- **Modale de confirmation** (`SettingsMembersRoleModal`) : le changement de rôle n'est plus appliqué au `@update:model-value` du select ; il ouvre d'abord une modale résumant l'impact (`de « X » à « Y »` + note contextuelle selon le rôle cible : accès admin complet / perte de l'accès staff en lecture seule). Le `PUT /organization/members/:id` n'est envoyé qu'à la confirmation ; à l'annulation, le select revient au rôle courant.
- **Lien « Assigner ses bateaux »** : quand le nouveau rôle est `boat_owner`, la modale affiche un `<Link>` direct vers `/boats` (l'assignation des bateaux se fait sur la fiche bateau → Modifier).
- Aucun changement backend : le service gère déjà le garde-fou « dernier admin » et l'événement de changement de rôle.
- **i18n** : clés `settings.members.roleConfirm.*` (EN + FR).
- **Tests** : `tests/inertia/settings_members_role_change.spec.ts` (pas de `PUT` immédiat, `PUT` à la confirmation, pas de `PUT` à l'annulation, lien bateaux sur `boat_owner`, no-op si rôle inchangé).
