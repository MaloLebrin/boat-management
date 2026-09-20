# Vérification de l'adresse e-mail à l'inscription

**Date** : 20 septembre 2026
**Issue** : #768

## Contexte

L'inscription créait directement un utilisateur, une organisation et une
session. **Rien ne prouvait que l'adresse saisie appartenait à la personne qui
s'inscrivait** — et cette adresse est le pivot de l'app : clé de connexion,
canal de réinitialisation du mot de passe, cible des invitations, destinataire
des factures et des relances.

Il n'existait aucun flux de vérification dans le code. Ce que l'absence
permettait : s'inscrire avec l'adresse d'un tiers, qui reçoit alors nos e-mails
transactionnels depuis notre domaine ; des comptes jetables en masse ; une base
de contacts dont les bounces dégradent la délivrabilité de tout le domaine.

## Ce qui change

### Le flux

Même moule que `password_reset_tokens` : jeton en clair envoyé par e-mail,
**hash SHA-256 stocké**, expiration à 24 h
(`EMAIL_VERIFICATION_TOKEN_TTL_HOURS`).

| Route                               | Accès                       | Rôle                                   |
| ----------------------------------- | --------------------------- | -------------------------------------- |
| `GET /verify-email`                 | auth                        | Écran de rappel, adresse et renvoi     |
| `POST /verify-email/resend`         | auth + throttle 5 / 10 min  | Renvoie un lien, invalide le précédent |
| `GET /verify-email/confirm?token=…` | **public** + `authThrottle` | Consomme le lien                       |

`POST /signup` connecte et redirige comme avant : l'essai reste sans friction,
le compte part simplement non vérifié.

### Portée du blocage — le choix de cette issue

**L'app reste accessible sans vérification.** Seules les actions qui engagent un
tiers ou de l'argent attendent. Bloquer tout casserait l'essai immédiat que
l'inscription sans friction cherche à offrir ; ne rien bloquer rendrait la
vérification décorative.

`middleware.requireVerifiedEmail()` garde quatre routes :

| Route                                                           | Pourquoi                                              |
| --------------------------------------------------------------- | ----------------------------------------------------- |
| `POST /organization/invitations`                                | l'adresse d'un tiers reçoit un e-mail à notre nom     |
| `POST /invoices/:id/send`                                       | met du courrier à notre nom dans la boîte d'un client |
| `POST /boats/:boatId/reservations/:reservationId/contract/send` | idem                                                  |
| `POST /settings/billing/checkout`                               | engage de l'argent                                    |

`POST /settings/billing/portal` reste **ouvert** : un client déjà payant doit
pouvoir gérer son abonnement, y compris le résilier.

Le rappel passe par une bannière (`EmailVerificationBanner.vue`) pilotée par le
booléen `user.emailVerified` de la prop partagée — un booléen, pas la date : le
front n'a besoin que de savoir s'il doit l'afficher. Sans ce rappel,
l'utilisateur découvrirait la garde au moment d'envoyer sa première facture,
sans savoir quoi faire.

### Deux points qui ne se devinent pas

- **La confirmation est publique**, et hors du groupe `guest()`. Le lien arrive
  par e-mail et rien ne dit que la session est encore ouverte dans le navigateur
  qui l'ouvre ; exiger d'être connecté renverrait sur `/login` **en perdant le
  jeton**. Le jeton prouve à lui seul la possession de l'adresse, et un
  utilisateur déjà connecté qui clique doit pouvoir confirmer plutôt qu'être
  renvoyé sur son dashboard.
- **La redirection vers `/login` passe par `withQs(false)`.** Sans lui,
  `redirect().toPath()` reporte la query string entrante et le jeton se
  retrouverait dans `/login?token=…`, donc dans l'historique du navigateur et
  dans le `Referer` envoyé aux ressources de la page de connexion — exactement
  la fuite corrigée en #770. **C'est le test qui l'a trouvée**, pas la relecture.

### Comptes existants

La migration les marque **vérifiés**. Ce n'est pas une preuve rétroactive :
c'est le seul choix qui ne casse pas des comptes en service derrière une garde
qu'ils n'ont jamais eu l'occasion de franchir. La garde ne s'applique donc
qu'aux inscriptions postérieures.

`UserFactory` fait de même — un utilisateur de fabrique représente un compte
établi, et la garde ne doit pas surgir dans des tests qui n'ont rien à voir avec
elle. Un compte fraîchement inscrit se construit en remettant `emailVerifiedAt`
à `null`.

## Migrations

- `1857000000000_add_email_verified_at_to_users` — colonne nullable, backfill
  de tous les comptes existants.
- `1857000001000_create_email_verification_tokens_table` — `email` et
  `expires_at` indexés, `token` unique.

Les deux `down()` sont implémentés.

## Tests

`tests/functional/auth/email_verification.spec.ts` — onze cas : lien valide,
expiré, déjà consommé, inconnu, consommé sans session ouverte, renvoi qui
invalide le précédent, renvoi indiscernable sur une adresse déjà vérifiée, et
les deux faces de la garde (ce qui est fermé, ce qui reste ouvert).

Quatre garde-fous vérifiés porteurs en les retirant un à un : `withQs(false)`,
l'invalidation après consommation, le test d'expiration, et la garde sur les
invitations.
