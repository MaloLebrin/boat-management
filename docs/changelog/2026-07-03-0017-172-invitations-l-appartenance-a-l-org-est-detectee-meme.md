# 2026-07-03 — [#172] Invitations : l'appartenance à l'org est détectée même sans membership

**Corrige A-09 : la vérification « déjà membre » dans `OrganizationInvitationService.create()` ne consultait que `organization_memberships`. Un user rattaché à l'org sans ligne membership (owner, drift A-03) pouvait recevoir une invitation à sa propre organisation**

- `app/services/organization_invitation_service.ts` : `create()` vérifie désormais aussi `users WHERE email = ? AND organizationId = orgId`, en plus de la check membership. Les deux signaux sont conservés car une membership peut exister sans que `users.organizationId` pointe ici (multi-org), et un user peut appartenir à l'org sans membership
- Test ajouté : `tests/functional/organization/invitations.spec.ts` (un user rattaché à l'org sans membership ne peut pas être invité — `AlreadyMemberError`, aucune invitation créée)
