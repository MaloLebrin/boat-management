# 2026-07-23 — Profil : changement de mot de passe connecté et préférence de langue persistée dans /settings/me (#414)

Audit UX du 2026-07-19 : `/settings/me` ne proposait que le nom complet. Il manquait un changement de mot de passe (seul recours : « Mot de passe oublié » par email) et une préférence de langue persistée (le switch EN/FR n'était que dans la sidebar, et après un parcours FR le login réapparaissait en EN, cf. #403).

- **Section « Sécurité »** : nouveau formulaire mot de passe actuel + nouveau + confirmation (`PUT /settings/password`). Le mot de passe actuel est vérifié (`hash.verify`) ; en cas d'erreur, une erreur de champ est renvoyée sur `currentPassword` sans révéler d'info. Nouveau validateur `changePasswordValidator`.
- **Section « Langue »** : sélecteur EN/FR enregistré sur le profil (`PUT /settings/locale`). Nouvelle colonne `users.locale` (migration `1821000000000`), nullable. Le sélecteur de la sidebar (`POST /locale`) persiste aussi la préférence pour un utilisateur connecté.
- **Résolution de locale** : `DetectUserLocaleMiddleware` privilégie désormais la préférence persistée du profil sur le cookie et `Accept-Language` (mais reste sous l'URL `/fr/`, `/en/`). Corrige le retour à EN après logout (#403).
- **Découpage** : `SettingsMeTab` éclaté en `ProfileCard`, `SecurityCard`, `LanguageCard` (`components/settings/me/`).
- **i18n** : clés `settings.security.*`, `settings.language.*`, `flash.settings.passwordUpdated`/`localeUpdated`, `validator.settings.wrongCurrentPassword` (EN + FR).
- **Tests** : `tests/functional/settings/account.spec.ts` (changement de mdp OK/mauvais mdp actuel/confirmation invalide, persistance locale, précédence sur Accept-Language) et `tests/inertia/settings_me_cards.spec.ts` (SecurityCard, LanguageCard).
