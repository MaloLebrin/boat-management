# 2026-06-15 — Fix : redirections pour /maintenance et /organization (#32)

**Correctif — Router**

Les routes `/maintenance` et `/organization` renvoyaient une erreur 500 car elles n'étaient pas définies. Ajout de redirections permanentes : `/maintenance` → `/maintenance/history` et `/organization` → `/organization/members`.
