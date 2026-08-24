# 2026-05-22 — Invitations de membres

Feature d'invitation de membres par email :

- Envoi d'une invitation par email avec token signe (expiry 7 jours)
- Page d'acceptation `/invitations/accept?token=xxx` (publique, auth requise pour accepter)
- Annulation d'invitation depuis les settings
- Routes : POST/DELETE /organization/invitations, GET/POST /invitations/accept
- Liste des invitations pending dans settings/members
- Table `organization_invitations` avec statuts pending/accepted/cancelled

---
