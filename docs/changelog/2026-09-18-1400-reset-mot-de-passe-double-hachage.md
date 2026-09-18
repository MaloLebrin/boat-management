# 2026-09-18 — La réinitialisation de mot de passe enfermait l'utilisateur dehors (#691)

Écrire les tests manquants du parcours de réinitialisation a mis au jour un bug de production sur un
chemin de sécurité : **après avoir réinitialisé son mot de passe, un utilisateur ne pouvait plus se
connecter du tout** — ni avec le nouveau, ni avec l'ancien. Et redemander un lien reproduisait
exactement le même effet, donc le compte était perdu sans intervention en base.

- **Reproduction.** Avec un compte valide : l'ancien mot de passe mène à `/dashboard` ; le
  `POST /reset-password` annonce un succès et redirige vers `/login` ; ensuite, **le nouveau mot de
  passe échoue et l'ancien aussi**.
- **Cause.** `PasswordResetService.updatePassword` faisait
  `user.password = await hashService.make(newPassword)` puis `user.save()`. Or `User` compose
  `withAuthFinder(() => hash.use())`, dont le hook `beforeSave` hache `password` dès qu'il est
  modifié. Le mot de passe était donc **haché deux fois**, et le hash stocké ne correspondait plus à
  aucune saisie possible. Vérifié isolément : assigner du clair puis sauvegarder donne un hash
  vérifiable, assigner un hash déjà calculé le re-hache.
- **Correctif.** Une ligne : assigner le mot de passe **en clair** et laisser le modèle le hacher. Le
  commentaire de `updatePassword` dit désormais pourquoi, pour que le pré-hachage ne revienne pas.
- **Pourquoi ça avait échappé.** Les tests existants couvraient la **demande** de réinitialisation,
  jamais sa **consommation**. Et une assertion sur le hash stocké aurait pu passer au vert — le hash
  changeait bien. D'où le parti pris des nouveaux tests : **rejouer une vraie connexion**, la seule
  chose qui mesure ce que l'utilisateur vit.

## Couverture ajoutée

- `tests/functional/auth/reset_password.spec.ts` (10 cas) — jeton valide, inconnu, expiré ; usage
  unique du jeton ; une seconde demande tue le premier lien ; la garde `guest` ; le contrat de page.
  Deux d'entre eux étaient **rouges avant le correctif**.
- `tests/functional/organization/invitation_decline.spec.ts` (5 cas) — `POST /invitations/decline`
  est **publique**, elle ne demande aucune session et ne s'appuie que sur le jeton : jeton valide,
  inconnu, expiré, refus rejoué, et surtout une invitation refusée qui ne peut plus être acceptée.
- `tests/functional/organization/boat_owner_portal.spec.ts` (7 cas) — `boat_owner` est le seul rôle
  sans aucune capability : on vérifie que `boatOwnerPortalRedirect()` le renvoie vers `/owner/boats`
  au lieu d'un 403 brut (avec un témoin staff qui, lui, n'est pas redirigé), et que le pivot
  `boat_owners` borne bien ce qu'il voit — bateau non rattaché, bateau d'une autre organisation.

## Note d'exécution

Ne pas lancer une suite au premier plan pendant que la suite complète tourne en tâche de fond : les
deux partagent la même base, et le `truncateDb()` de l'une vide les données de l'autre en plein test.
Rencontré en écrivant ces specs — les échecs n'avaient rien à voir avec le code testé.
