# 2026-07-03 — [#197] Auth : fullName trimmé et vidé en null si vide

**Corrige A-11 : `fullName` n'était pas trimmé au signup ni à la mise à jour du profil — une valeur composée uniquement d'espaces (`"   "`) passait la validation et rendait le getter `initials` vide (`charAt` sur une chaîne vide)**

- `app/validators/user.ts` : `fullName` (`signupValidator` et `updateProfileValidator`) utilise désormais `vine.string().trim().maxLength(255).nullable().transform((v) => v || null)` — les espaces sont retirés puis la chaîne vide résultante est convertie en `null`
- Tests ajoutés : `tests/functional/auth/signup.spec.ts` et `tests/functional/settings/settings.spec.ts` (valeur uniquement composée d'espaces stockée comme `null`, valeur avec espaces superflus trimée avant stockage)
