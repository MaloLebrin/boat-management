# 2026-07-03 — [#173] Bateaux : numéro d'immatriculation dupliqué géré proprement (plus de 500)

**Corrige B-04 : un index unique `(organization_id, registration_number)` existe en base, mais aucune validation VineJS ni try/catch ne couvrait la violation. Soumettre deux bateaux avec le même `registrationNumber` renvoyait un 500 brut**

- `app/exceptions/boat_errors.ts` : nouvelle erreur métier `RegistrationNumberTakenError`
- `app/services/boat_hull_service.ts` : `createForUser()` et `updateForUser()` interceptent la violation d'unicité PostgreSQL (`23505` sur la contrainte `registration_number`) et lèvent `RegistrationNumberTakenError` (robuste face aux races, contrairement à une simple validation)
- `app/controllers/boats_controller.ts` : `store()` et `update()` attrapent l'erreur → `session.flash('error', i18n.t('flash.boat.registrationTaken'))` + redirect back
- `resources/lang/en/flash.json` et `fr/flash.json` : nouvelle clé `boat.registrationTaken`
- Les `registrationNumber` `null` multiples restent autorisés (NULL distincts en PostgreSQL)
- Tests ajoutés : `tests/functional/boats/boats.spec.ts` (POST et PUT avec numéro dupliqué → flash d'erreur, pas de 500 ni de doublon ; plusieurs bateaux sans numéro acceptés)
