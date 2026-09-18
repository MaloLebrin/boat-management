# 2026-09-18 — Snapshots marketing : les props partagées ne sont plus recopiées (#710)

`tests/functional/marketing/props_snapshot.spec.ts` compare les props de chaque page marketing à une
fixture, par `assert.deepEqual` sur l'objet entier. Pour ne garder que les props **propres à la
page**, il filtre les props partagées — via une liste de dix-huit clés **écrite en dur**, copie sans
lien de `InertiaMiddleware.share`.

Conséquence : ajouter une prop partagée dans le middleware faisait tomber les **vingt** fixtures d'un
coup, avec un diff montrant vingt fichiers porteurs d'une clé en trop — jamais « vous avez ajouté une
prop partagée et oublié de l'inscrire ici ». Le réflexe devant ce mur rouge est de régénérer les
fixtures avec `UPDATE_MARKETING_FIXTURES=1`, ce qui enterre la vraie question : cette prop doit-elle
être partagée, et sur les pages publiques ? Le snapshot est le test le plus strict du dépôt sur les
pages marketing ; c'est précisément parce qu'il est strict que son échec doit rester lisible, sans
quoi il finit régénéré sans examen et ne protège plus rien.

- **Correctif.** La liste est **dérivée de sa source** : `tests/support/inertia_shared_props.ts`
  relit `app/middleware/inertia_middleware.ts` et extrait les clés de premier niveau du `return` de
  `share`. Le snapshot les écarte donc automatiquement, et une prop partagée ajoutée ne casse plus
  aucune fixture.
- **La question, elle, est désormais posée une fois.**
  `tests/unit/hygiene/inertia_shared_props.spec.ts` compare les clés déclarées à une liste **revue**,
  et échoue en **nommant** la prop ajoutée ou disparue — un seul échec, explicite, au lieu de vingt
  fixtures rouges. Son message rappelle l'enjeu : ces props partent sur toutes les pages rendues par
  Inertia, pages marketing publiques comprises.
- **Pourquoi relire le disque plutôt qu'importer le middleware.** Instancier `InertiaMiddleware` pour
  lui demander ses clés supposerait un `HttpContext` complet et rendrait la liste dépendante de
  l'état de la requête : une prop conditionnelle (`vapidPublicKey` sans push configuré) manquerait à
  l'appel. Lire la source donne le **contrat déclaré**, pas ce qu'une requête particulière produit.
  Même précaution que `ci_shards.spec.ts` (#687), `inertia_pages_covered.spec.ts` (#689) et
  `policies_covered.spec.ts` (#690) : une garde qui partagerait sa source avec sa cible hériterait de
  ses angles morts, et resterait verte.
- **Garde-fou de l'extraction.** Un refactor qui casserait le repérage rendrait une liste vide, et le
  snapshot recommencerait à comparer des props partagées **sans que rien ne le dise**.
  `readSharedPropKeys` jette donc sous un seuil de dix clés, et un second cas de la garde vérifie que
  la liste extraite n'est ni vide, ni dupliquée, ni malformée — une garde muette ne garde rien.
- **Tests.** 2 cas ajoutés dans `tests/unit/hygiene/inertia_shared_props.spec.ts`. Aucune fixture
  modifiée : les dix-huit clés extraites correspondent exactement, et dans le même ordre, à la liste
  qui était écrite à la main.
- **Non-vacuité.** Vérifié à la main : une prop `foo` ajoutée à `share` laisse les vingt snapshots au
  vert (elle est filtrée) et fait tomber **la seule** garde, avec le message
  « prop(s) partagée(s) ajoutée(s) dans InertiaMiddleware.share sans revue : foo ».

Le mécanisme de régénération `UPDATE_MARKETING_FIXTURES=1` reste documenté en tête du spec, inchangé.
