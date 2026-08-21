# 2026-06-30 — [#150] Sécurité invitations : vérification email + déclin + ré-invitation sans blocage

**Bugs corrigés**

- `app/services/organization_invitation_service.ts` — `accept()` : chargement du `User` et comparaison insensible à la casse avec `invitation.email` ; lève `InvitationEmailMismatchError` si l'email ne correspond pas — correction d'une escalade de privilèges horizontale (n'importe quel utilisateur authentifié pouvait accepter un lien d'invitation destiné à quelqu'un d'autre)
- `app/services/organization_invitation_service.ts` — `create()` : avant d'insérer, annule (`status = 'cancelled'`) toute invitation `pending` existante pour le même couple `(organizationId, email)` — l'envoi d'une nouvelle invitation à la même adresse ne bloque plus avec `InvitationAlreadyExistsError`
- `app/services/organization_invitation_service.ts` — nouvelle méthode `decline(plainToken)` : vérifie le token et passe l'invitation en `cancelled`

**Nouvelles routes**

- `POST /invitations/decline` (publique, sans auth) — annule l'invitation via son token ; redirige vers `/`

**Contrôleur / validateur**

- `app/controllers/organization_invitations_controller.ts` : nouvelle action `decline()` avec gestion des erreurs (`InvitationNotFoundError`, `InvitationExpiredError`, `InvitationAlreadyAcceptedError`) ; gestion de `InvitationEmailMismatchError` dans `accept()`
- `app/validators/organization_member.ts` : ajout de `declineInvitationValidator`

**Frontend**

- `inertia/pages/invitations/accept.vue` : le bouton « Décliner » (état invitation valide + utilisateur authentifié) poste désormais via `useForm` vers `POST /invitations/decline` au lieu d'être un simple lien vers `/`

**i18n** (FR + EN)

- `flash.invitation.emailMismatch` — email non correspondant
- `flash.invitation.declined` — invitation refusée

**Tests** : 8 tests fonctionnels (`tests/functional/organization/invitations.spec.ts`) — accept (email correct, mismatch, casse, non authentifié), decline (annulation, public, token invalide), re-invite (remplacement de l'ancienne invitation)

---
