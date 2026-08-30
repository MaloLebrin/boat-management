# 2026-08-30 — Sélecteur de marque moteur guidé par le type de moteur (#597)

Le formulaire moteur proposait les marques du catalogue dans un ordre purement
alphabétique, quel que soit le moteur décrit. Sur un corpus de plus de soixante-dix
motoristes et une liste tronquée à cinquante suggestions, un utilisateur qui saisissait
un hors-bord pouvait tout simplement ne jamais voir Yamaha ou Tohatsu : elles étaient
noyées derrière les motoristes in-bord, voire coupées par la troncature.

- **Correctif.** Le sélecteur de marque dépend désormais du type de moteur saisi. Les
  marques qui couvrent la gamme du moteur passent en tête, sous un intitulé de section
  « Marques de ce type de moteur » ; les autres suivent sous « Autres marques ». La
  liste se réordonne à chaque changement de `kind`, `fuel` ou `family`, sans aller-retour
  serveur — les marques sont déjà toutes présentes dans les props de page.
- **Priorisation, jamais filtrage.** Aucune marque n'est retirée, et la saisie libre
  reste acceptée telle quelle : c'est l'invariant de l'épic #572, que la carte
  d'un moteur d'occasion hors corpus continue d'exiger.
- **Déduction.** `engineCatalogFamiliesFromSignals()` (`shared/helpers/engine_family.ts`)
  traduit le moteur en cours de saisie en familles du catalogue. La famille de
  motorisation saisie l'emporte sur `kind` + `fuel`, plus précise et choisie
  explicitement — préciser « embase Z » sur un moteur resté marqué hors-bord remonte
  bien les motoristes essence in-bord. Sans carburant, les deux familles plausibles
  sont retenues plutôt qu'une devinée. Un type qui ne désigne aucune gamme du
  catalogue (`hybrid`, `other`) ne priorise rien : la liste garde son ordre
  alphabétique, sans sections.
- **Sections dans la combobox.** `BaseCombobox` accepte un `group` par option et rend
  un en-tête au changement de groupe. Les en-têtes sont en `role="presentation"` : la
  navigation clavier et le décompte ARIA ne voient toujours que les options.
- **i18n.** Deux clés ajoutées dans les deux locales :
  `boats.engines.catalog.brandGroupForEngineType` et
  `boats.engines.catalog.brandGroupOther`.
- **Tests.** 5 tests unitaires Japa sur la déduction des familles (hors-bord, in-bord
  par carburant, primauté de la famille saisie, types sans gamme, valeurs toujours dans
  `ENGINE_CATALOG_FAMILIES`) ; 5 tests Vitest sur la priorisation du sélecteur (ordre,
  sections, marques hors type conservées, marque multi-familles, alias préservés) ;
  4 tests Vitest sur la réaction du formulaire au type saisi ; 2 tests Vitest sur les
  sections de `BaseCombobox` et leur neutralité au clavier.
