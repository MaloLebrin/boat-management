# 2026-10-12 — Session et remember-me dimensionnés pour une traversée (#951)

Une traversée de 2 à 4 semaines sans réseau dépassait la durée de session (`age: '5d'`) : au retour, le rejeu de la file hors-ligne tombait sur /login (#950). Fait partie de l'épic #949 (Mode traversée), phase 0.

- **Durées.** `SESSION_IDLE_DAYS` passe de 5 à 30 jours et devient la source de `age` dans `config/session.ts` (même valeur que `UserSessionService.listActive`). Nouvelle constante `REMEMBER_ME_DAYS = 90` (`shared/constants/auth.ts`), source de `rememberMeTokensAge` dans `config/auth.ts` (avant : `30d`) et du libellé de la case. Elle reste ≤ `SESSION_RETENTION_DAYS`.
- **Case « Rester connecté ».** Extraite dans `inertia/components/auth/LoginRememberCheckbox.vue`. Le libellé affiche la durée via `{days}`. Cochée par défaut quand l'app tourne installée (`display-mode: standalone`), avec un texte d'aide (`auth.login.rememberMeStandaloneHint`, FR/EN) ; décochée dans un onglet de navigateur. Le rendu SSR part décoché, le mode n'étant connu qu'au montage.
- **Sécurité.** Un changement de mot de passe révoque toujours les sessions ouvertes (#763).
- **Copilote.** Entrée `session-duration` dans `product_knowledge.ts`.
- **Tests.** Japa `tests/functional/auth/session_duration.spec.ts` (constantes, expiration du jeton remember-me, `max-age` du cookie de session) ; Vitest `tests/inertia/login_remember_checkbox.spec.ts` (défaut navigateur / standalone, désactivation possible).
