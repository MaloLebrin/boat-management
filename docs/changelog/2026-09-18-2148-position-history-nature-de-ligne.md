# 2026-09-18 — `boat_position_history` : séjours à quai et positions GPS ne se ferment plus (#722)

Constaté en écrivant les tests de #695 et caractérisé par
`tests/functional/boats/boat_berth_history.spec.ts` : la table
`boat_position_history` porte deux choses de nature différente — un **point de
position** (`latitude`/`longitude`, `POST /boats/:boatId/position`) et un
**séjour à quai** (`spot_id`, `BoatHullService._logBerthChange`). Les deux
employaient la même convention de ligne ouverte **et le même geste de clôture**.

- **Cause.** `BoatPositionService.storeManualPosition` et
  `BoatHullService._logBerthChange` clôturaient tous deux par
  `where('boatId', …).whereNull('endedAt')`, sans rien qui distingue la nature
  de la ligne. Enregistrer une position GPS clôturait donc le séjour à quai en
  cours alors que `boats.spot_id` disait toujours le bateau amarré ; amarrer un
  bateau clôturait réciproquement son dernier point de position. Rien ne le
  montrait à l'écran — le compteur de places libres, le plan de marina et la
  fiche bateau lisent tous `boats.spot_id`, jamais l'historique — mais
  l'historique des séjours était faux, et inutilisable le jour où on voudrait
  s'en servir (facturation d'un séjour, statistiques d'occupation, export).

- **Correctif.** Colonne discriminante `kind` (`berth` | `position`) sur
  `boat_position_history`, avec un index `(boat_id, kind)`. Le geste de clôture
  ne s'écrit plus des deux côtés : il vit une seule fois dans
  `BoatPositionHistory.closeOpenOfKind(boatId, kind, trx?)` et porte toujours
  son `kind`, donc il ne balaie que les lignes de sa propre nature. Un bateau
  amarré qui émet des positions a maintenant deux lignes ouvertes — une par
  nature — et c'est l'état correct.

- **Migration.** `1849000001000_alter_boat_position_history_add_kind` classe
  l'existant (`spot_id IS NOT NULL` ⇒ `berth`, sinon `position` : déterministe,
  seul `_logBerthChange` écrivait un `spot_id` et seul `storeManualPosition`
  écrivait des coordonnées), puis **répare** les séjours faussement clos.
  `boats.spot_id` sert d'arbitre : un bateau amarré dont le dernier séjour porte
  cette même place tout en étant clos ne peut l'être que par la collision
  ci-dessus — une clôture légitime (démarrage, déplacement, éviction) ouvre
  toujours une ligne plus récente ou laisse `boats.spot_id` à `null`. Ces
  lignes-là sont rouvertes ; aucune autre n'est touchée. Le `down()` retire
  colonne et index, la réparation n'étant pas réversible.

- **Frontend.** `kind` remonte dans `BoatPositionHistoryRow` via le transformer.
  `latestGpsPosition` et le tracé de l'onglet Position filtrent désormais sur
  `kind === 'position'` : maintenant qu'un séjour à quai peut rester ouvert en
  même temps qu'un point GPS, il ne doit pas être pris pour la dernière position
  connue. Aucun changement visible à l'écran.

- **Tests.** Les deux caractérisations `⚠️ (#722)` de
  `boat_berth_history.spec.ts` deviennent des validations, dans les deux sens
  (un point GPS laisse le séjour ouvert, amarrer laisse le point ouvert), plus
  deux tests neufs : chaque nature continue de se clôturer elle-même (deux
  points GPS ⇒ un seul ouvert, à côté du séjour), et `kind` est bien écrit sur
  chaque ligne. Côté transformer, un test vérifie qu'un séjour ouvert sans
  coordonnées n'est pas élu « dernière position ». Les trois tests de collision
  échouent si l'on retire le `.where('kind', …)` de la clôture — vérifié.

- **Toujours ouvert.** #721 (la route d'affectation hors de la garde de plan, et
  son no-op silencieux sur place étrangère) reste caractérisé, non corrigé.
