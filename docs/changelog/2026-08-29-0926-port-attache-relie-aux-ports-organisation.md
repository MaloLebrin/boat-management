# 2026-08-29 — Port d'attache relié aux ports de l'organisation (#579)

L'app entretenait **trois représentations déconnectées du même concept** : `boats.home_port`
(string libre saisi sur la fiche bateau, affiché sur le portail propriétaire, dans le PDF de
maintenance et injecté dans les prompts IA), `boat_port_stays.port_name` (string libre, sans FK,
consommé par le budget) et la table `ports` — la vraie entité, avec son CRUD, ses pontons, ses
mouillages et son plan de marina, reliée aux bateaux **uniquement** par `boats.spot_id`. Aucun
endroit du code ne rapprochait ces trois-là. Une organisation qui gère « Port-la-Forêt » dans son
module marina pouvait donc avoir des bateaux dont le `homePort` valait `Port la Foret`, `PLF` ou
`Port-La-Forêt` : trois orthographes, zéro rapprochement, et un tableau de bord marina incapable de
dire « ce bateau est chez nous ».

**Invariant du lot, comme pour le catalogue (#571) : la saisie libre reste la source de vérité.**
Aucune migration, aucune donnée touchée, aucune FK posée. Un plaisancier sans module ports, un port
de passage ou un port étranger hors référentiel s'écrivent librement — la liste propose, elle ne
contraint jamais. La normalisation vient de l'assistance à la saisie, pas d'une contrainte.

## Saisie assistée

- **Port d'attache.** `BoatFormHullFields.vue` passe le champ `homePort` de `BaseInput` à
  `BaseCombobox` (#571), alimentée par une nouvelle prop Inertia `portOptions` que
  `BoatsController.create()` / `edit()` remplissent avec `PortService.listNamesForOrg()` — le
  service existait déjà. **Aucun `fetch`/`axios`, aucun CSRF manuel, aucune route nouvelle.**
- **Escales.** Même traitement pour `portName` sur `BudgetPortStayForm.vue` et le formulaire
  d'édition en ligne de `BudgetPortStayList.vue`, alimentés par la même prop passée par
  `BudgetController.show()`.
- **Org sans port.** La liste est simplement vide : le champ se comporte exactement comme avant, et
  l'aide affichée bascule sur un texte de saisie libre plutôt que d'inviter à choisir dans une liste
  inexistante.
- **`BaseCombobox`** accepte désormais `required`, pour que le nom de port d'une escale conserve la
  contrainte HTML qu'il avait en `BaseInput`.

## Lien vers la fiche port

- `PortService.findIdByName()` rapproche le `home_port` texte libre d'un port de l'organisation par
  **comparaison à plat sur le nom** (trim + casse ignorée), sans jointure SQL ni FK. Un port hors
  référentiel, un bateau sans port d'attache ou un port homonyme d'une **autre** organisation ne
  remontent rien.
- `BoatsController.show()` passe le résultat en `homePortId` dans le squelette de la fiche
  (`toShowShellProps`), et l'onglet Caractéristiques rend le port d'attache en `<Link>` vers
  `/ports/:id` quand il y a correspondance — sinon le simple texte, comme avant.

## Hors périmètre (documenté, non fait)

La FK `boats.home_port_id` (`SET NULL`) reste une extension possible : elle ouvrirait le filtre
« bateaux de ce port » et des stats d'escales par port réel, au prix d'une migration et d'une
synchro du texte en cas de renommage du port. La v1 fonctionne sans. Idem pour un référentiel
**public** des ports de plaisance (jeux de données SHOM / data.gouv) : gros corpus, licence et
rafraîchissement à instruire — issue séparée si le besoin se confirme. Aucun rapprochement
rétroactif des valeurs déjà en base n'est effectué.

## i18n

`boats.homePortSuggest.*` (placeholder, aide avec et sans référentiel, message d'absence de
correspondance, libellé du lien vers la fiche port) et `budget.portStay.portNamePlaceholder` /
`portNameHint` / `noPortMatch` — en `fr` et en `en`, vouvoiement côté app.

## Tests

- **Japa.** `boat_home_port_suggestions.spec.ts` : `portOptions` exposé par `/boats/new`,
  `/boats/:id/edit` et `/boats/:id/budget`, liste vide pour une org sans port, cloisonnement par
  organisation, `homePortId` rapproché ou `null` (hors référentiel, sans port d'attache, homonyme
  d'une autre org), et l'invariant du lot — une saisie libre de port d'attache comme de nom
  d'escale est enregistrée telle quelle, la table `ports` restant intacte.
- **Vitest.** `boat_form_home_port.spec.ts` (combobox alimentée par les ports, aucune suggestion
  sans référentiel, choix d'un port écrivant son nom canonique, saisie hors référentiel conservée,
  valeur existante reprise à l'édition) et les specs `budget_port_stay_form` / `budget_port_stay_list`
  étendues à la combobox du formulaire de création et d'édition d'escale.
