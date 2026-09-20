# 2026-09-19 — Le hook `before()` ne tranche plus sur une ressource illisible (#771)

`OrgScopedPolicy.before()` est le laissez-passer admin de toutes les policies.
Depuis #690 il refusait une ressource appartenant à une autre organisation —
mais seulement quand il _savait_ à quelle organisation elle appartenait.

- **Cause.** Le hook rendait un booléen dans tous les cas, et un retour booléen
  court-circuite entièrement la méthode de policy. Sur une ressource dont
  l'organisation n'était pas lisible — relation non préchargée, payload de
  validation, forme inattendue — `isForeignResource` rendait `false`, donc
  l'admin passait. Autrement dit, le hook ne distinguait pas « rien à
  vérifier » de « je n'ai pas pu vérifier », et sur ce second cas la défense
  en profondeur n'avait de nouveau qu'une profondeur : le refus ne venait plus
  que du scoping des services.
- **Correctif.** Trois situations au lieu de deux. Organisation lisible et
  identique → autorise ; lisible et différente → refuse ; **illisible → ne
  tranche pas** (`undefined`), et la méthode de policy décide. Le cas « aucune
  ressource passée » est traité à part et continue d'autoriser l'admin : c'est
  le cas légitime des actions sans cible (`create`, `viewMembers`…), et le
  confondre avec le doute casserait la moitié des écrans d'administration.
  Une seule ressource étrangère suffit à refuser, une seule ressource illisible
  suffit à s'abstenir même si les autres sont légitimes.
- **Aucun site d'appel n'est affecté aujourd'hui.** L'issue attendait que le
  changement « fasse apparaître les call sites qui ne préchargent pas ce qu'il
  faut ». Le relevé en donne zéro : les cinq types de ressources réellement
  passés à `authorize()`/`allows()` — `Boat`, `Port`, `Spot`,
  `BoatReservation`, `Invoice` — portent tous une colonne `organization_id`
  directe. `MouillagePolicy` et `PontoonPolicy` existent mais ne sont
  utilisées par aucun contrôleur : mouillages et pontons autorisent via
  `PortPolicy` avec un port préchargé. C'est donc un durcissement pur, dont
  l'effet est sur les écrans **futurs**.
- **`organizationIdOf` reconnaît une troisième forme**, la relation `boat`
  préchargée, et sa liste close est documentée dans le code : depuis ce
  correctif, « illisible » ne veut plus dire « autorisé », donc y retomber a
  un coût.
- **Un test figeait l'ancien comportement.**
  `policy_before_hook.spec.ts` assertait qu'un admin garde l'accès sur une
  ressource sans organisation lisible, avec le raisonnement de #690 en
  commentaire. Il est inversé, et cinq cas viennent s'ajouter : ressource
  préchargée de sa propre organisation (le témoin de la régression que
  l'issue redoutait), action sans ressource, argument illisible à côté d'un
  argument légitime, ressource étrangère qui l'emporte sur une illisible, et
  la forme `boat`.
