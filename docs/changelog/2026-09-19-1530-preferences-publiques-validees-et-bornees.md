# 2026-09-19 — Switchers de langue et de thème : validés et bornés (#783)

`POST /locale` et `POST /theme` étaient les deux seules routes publiques
d'écriture de l'app à n'avoir ni validateur VineJS ni limiteur.

- **Cause.** Les deux méthodes lisaient `request.input()` et filtraient la
  valeur à la main (`locale === 'en' || locale === 'fr'`, `isThemePreference`).
  Le filtrage fonctionnait — aucune valeur arbitraire n'atteignait la base —
  mais il était invisible depuis la couche route, laissait le type à `any` en
  pratique, et s'écartait de la règle du repo. Côté débit, rien : un script
  avec un cookie de session valide pouvait marteler `POST /locale` et générer
  autant d'`UPDATE` sur `users`, alors que toutes les autres routes publiques
  d'écriture (contact, simulateur, démo, chats IA publics, abonnements push)
  portent un limiteur.
- **Correctif.** Les validateurs existaient déjà — `updateLocaleValidator` et
  `updateThemeValidator`, utilisés par les routes authentifiées voisines. Ils
  sont réutilisés ici, mais avec `tryValidate` au lieu de `validateUsing` : le
  contrat de #414 / #403 est qu'une valeur inconnue soit **ignorée sans
  erreur**, et un validateur qui lève casserait le switcher sur les pages
  publiques, où aucun formulaire Inertia n'affiche l'erreur de session. Le
  vocabulaire fermé vient donc désormais du validateur, la tolérance reste
  intacte, et aucun nouveau validateur n'a eu à être créé.
- **Limiteur.** `preferencesThrottle`, 30/min/IP. Volontairement généreux :
  basculer plusieurs fois de thème d'affilée pour comparer est un geste
  légitime, et ces routes sont servies sur le marketing et l'écran de login,
  où plusieurs visiteurs peuvent partager une IP. Compteur **partagé** entre
  les deux routes, contrairement aux trois POST du simulateur — c'est le même
  geste d'interface, et le test fige la décision.
- **Tests.** `tests/functional/settings/public_preferences.spec.ts` : une
  valeur inconnue laisse la préférence inchangée sans 422 (les deux routes),
  une valeur connue est persistée sur le profil **et** en cookie, un visiteur
  anonyme n'obtient que le cookie, et le throttle refuse au-delà de 30.
