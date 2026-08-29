# 2026-08-29 — Catalogue d'opérations de maintenance standard (#581)

La récurrence des tâches était câblée de bout en bout depuis longtemps
(`recurrenceIntervalMonths` / `recurrenceIntervalEngineHours`, auto-création de
la tâche suivante à la clôture), mais tout ce qu'elle consomme était saisi à la
main dans un champ texte vierge : « Vidange », « vidange moteur » et « Vidange +
filtre » créaient trois historiques distincts pour la même opération, et rien
dans l'app ne savait qu'une turbine se change tous les 2 ans. Ce lot livre le
contenu métier qui manquait.

- **Corpus.** Nouveau `shared/constants/maintenance/maintenance_operations.ts` :
  97 opérations réparties sur les 10 sujets (moteur, coque, voiles, gréement,
  électricité, plomberie, sécurité, pont, bateau entier, autre), sur le patron de
  `spare_parts_content.ts`. Chaque opération porte une `key` **stable à vie**
  préfixée par son sujet (`engine.oil_change`), une `labelKey` traduite dans les
  deux locales, et des intervalles **indicatifs** en mois et/ou en heures moteur.
  31 opérations portent en plus une note (« selon le manuel constructeur »,
  « purger le décanteur bien plus souvent »…) : les intervalles assistent, ils ne
  prescrivent pas.
- **Familles moteur.** Les opérations moteur déclarent les familles concernées et
  `resolveEngineFamily()` (`shared/helpers/maintenance_operations.ts`) dérive
  celle d'un moteur de son couple `kind` / `fuel` — repli assumé tant que
  `ENGINE_FAMILIES` (#574) n'est pas livré. Un diesel ne se voit jamais proposer
  « bougies d'allumage », un couple qui ne tranche pas ne filtre rien.
- **UI.** Le champ titre passe en `BaseCombobox` (#571) sur le formulaire de
  tâche et sur les deux modales d'événement (bateau et moteur). Retenir une
  opération remplit le titre, aligne le sujet et **complète les intervalles de
  récurrence encore vides** — jamais ceux déjà saisis. La saisie libre reste
  acceptée telle quelle : le corpus est une constante partagée, pas une API, et
  aucun `fetch` n'a été introduit dans `inertia/**`.
- **Garde-fou heures moteur.** Le service refuse une récurrence en heures moteur
  sans `boatEngineId` : les heures ne sont donc pré-remplies qu'une fois le
  moteur connu. Un bateau à moteur unique le voit retenu d'office ; sur une
  motorisation multiple, les heures attendent que l'utilisateur choisisse, et
  désélectionner le moteur reprend la valeur que le catalogue avait posée — mais
  jamais une valeur saisie à la main.
- **Sujets du formulaire de tâche.** Le sélecteur n'offrait que 4 sujets alors
  que le validator et l'onglet Tâches en gèrent 10 depuis toujours : la moitié du
  catalogue (carénage annuel, extincteurs, anodes de coque…) serait restée hors
  de portée d'une tâche planifiée. Les 10 sujets sont désormais proposés.
- **Nettoyages.** La liste des 10 sujets était recopiée dans trois fichiers
  (`boat_maintenance.ts`, `boat_maintenance_task.ts`, `shared/types/maintenance.ts`) ;
  tout part maintenant de `MAINTENANCE_SUBJECTS`. Le titre d'une tâche est
  plafonné à 200 caractères, comme celui d'un événement. Le formulaire de
  création de tâche est extrait dans `BoatMaintenanceTaskForm.vue` (limite des
  250 lignes par composant).
- **Hors périmètre.** `operation_key` n'est pas persistée : le corpus fonctionne
  sans, et les statistiques de coût par opération normalisée attendront une v2.
- **Tests.** Japa : invariants du corpus, filtrage par famille, sujets acceptés,
  plafond de 200 caractères, saisie libre inchangée
  (`tests/unit/helpers/maintenance_operations.spec.ts`). Vitest : invariants et
  parité i18n `fr`/`en` du corpus, plus le comportement de la combobox — titre,
  sujet, pré-remplissage non destructif, opérations essence masquées sur un
  diesel (`tests/inertia/maintenance_operations_content.spec.ts`,
  `tests/inertia/boat_maintenance_task_form.spec.ts`).
