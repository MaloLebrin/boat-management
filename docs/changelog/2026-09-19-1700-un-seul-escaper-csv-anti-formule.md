# 2026-09-19 — Un seul escaper CSV, qui neutralise les formules (#773)

Les exports CSV étaient produits par deux fonctions d'échappement
indépendantes. Toutes les deux appliquaient correctement la mise entre
guillemets RFC 4180, et aucune des deux ne neutralisait les caractères qui
font qu'un tableur interprète une cellule comme une formule (CWE-1236).

- **Cause.** `escapeCell` (`csv_export_service.ts`) traitait `;`, `"`, CR et
  LF, mais pas `=`, `+`, `-`, `@` ni TAB en tête de cellule. Le second escaper
  (`boat_engine_spare_parts_service.ts`) mettait **toujours** la valeur entre
  guillemets, ce qui pouvait passer pour une protection : ce n'en était pas
  une, le tableur retire les guillemets à l'import puis évalue le contenu. Les
  deux exports posent en plus un BOM UTF-8, ce qui dit explicitement que le
  consommateur visé est Excel — le tableur qui évalue.
- **Chemin d'attaque.** Ce n'est pas de l'auto-sabotage : les champs de texte
  libre concernés (`notes`, `title`, `supplier`, `reference`, noms de port…)
  sont aussi **écrits par l'import CSV**. Qui a le droit d'importer peut donc
  empoisonner des lignes que quelqu'un d'autre exportera et ouvrira plus tard,
  en confiance, puisque le fichier vient de notre app.
- **Correctif.** Un seul escaper, dans `csv_export_service.ts`. Celui du
  service de pièces détachées est supprimé et l'export passe par `buildCsv`.
  Une chaîne commençant par `=`, `+`, `-`, `@`, TAB ou CR est préfixée d'une
  apostrophe — la contre-mesure recommandée par l'OWASP — **et** mise entre
  guillemets, puisqu'elle peut aussi contenir un `;`.
- **Le point délicat : ne pas casser les nombres.** Deux exemptions. Un
  `number` n'est jamais préfixé, sinon les colonnes de coûts cessent d'être
  sommables. Et une chaîne qui est un littéral numérique exact
  (`^-?\d+(?:[.,]\d+)?$`) non plus : `-42` commence par un caractère de la
  liste noire sans être une formule. L'ancrage est ce qui rend l'exemption
  sûre — `-1+1` ne matche pas et se fait neutraliser.
- **Effet de bord visible.** L'export de la liste de réparation ne met plus
  tout entre guillemets ; seules les cellules qui l'exigent le sont. Une
  assertion de `spare_parts_cart.spec.ts` figeait l'ancien comportement
  (`assert.include(body, '"2"')`) et a été mise à jour : elle vérifiait la
  mise entre guillemets d'une quantité, c'est-à-dire précisément ce que le
  correctif supprime.
- **Tests.** `tests/unit/services/csv_export_service.spec.ts` couvre les
  charges (`=1+1`, `@SUM`, TAB, CR, `=HYPERLINK(…)`, la famille DDE) **et**
  les témoins (`-42`, `-42.50`, `-1234,56`, un nombre, une date ISO), plus le
  cas `-1+1` qui ne doit pas passer par l'exemption numérique.
  `tests/functional/spare_parts/spare_parts_cart_export.spec.ts` fige le fait
  que cet export utilise bien l'escaper partagé, et qu'il ne pose pas le BOM
  deux fois maintenant qu'il vient de `buildCsv`.
