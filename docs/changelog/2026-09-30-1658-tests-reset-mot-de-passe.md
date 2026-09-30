# 2026-09-30 — Tests du reset de mot de passe et le journal d'audit

`PasswordResetService` journalise la demande et la fin de reset, mais les
tests l'instanciaient encore sans `AuditLogService`. Le shard
`unit-integration` tombait sur `Cannot read properties of undefined (reading 'log')`.

- **Correctif.** Les neuf cas passent par `new PasswordResetService(new AuditLogService())`. Deux d'entre eux vérifient les lignes `auth.reset_requested` et `auth.reset_completed`.
