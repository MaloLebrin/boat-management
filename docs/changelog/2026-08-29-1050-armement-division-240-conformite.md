# 2026-08-29 — Armement obligatoire Division 240 et score de conformité (#582)

`boats.navigation_category` était stockée depuis toujours sans qu'aucune logique
n'en découle, et l'inventaire de sécurité ne connaissait que ce que
l'utilisateur avait saisi : ni équipement obligatoire **absent**, ni durée de vie
réglementaire quand la date de péremption est vide. Pendant ce temps, le site
marketing expliquait déjà que « la Division 240 (annexe 240-A.2) définit les
équipements de sécurité obligatoires selon la catégorie de navigation ». Ce lot
livre la feature promise.

- **Zone d'armement ≠ catégorie CE.** La Division 240 ne raisonne pas en
  catégorie de conception CE (A–D) mais en **distance d'un abri**. Nouveau champ
  `boats.armament_zone` (`basic` ≤ 2 M / `coastal` ≤ 6 M / `semi_offshore` ≤ 60 M
  / `offshore` > 60 M), **nullable**, avec `down()` implémenté. Le select est
  posé à côté de `navigationCategory` dans le formulaire bateau, et les deux
  champs portent désormais une aide expliquant qu'ils ne parlent pas de la même
  chose. `navigation_category` n'est ni détournée ni modifiée.
- **Aucun changement pour les bateaux existants.** Zone nulle → aucun contrôle,
  aucune ligne, aucun score : le panneau se contente d'inviter à renseigner la
  zone. Toute la flotte antérieure est dans ce cas.
- **Corpus.** Nouveau `shared/constants/safety/division240_content.ts`, sur le
  modèle du catalogue d'opérations (#581) : 13 exigences réparties sur les 4
  zones, **cumulatives** (une règle `coastal` s'applique aussi au-delà), mappées
  sur les 16 `safetyEquipmentTypes` existants, avec quantité fonction de
  `max_persons` pour les gilets et les harnais. Six durées de vie par type
  (fusées 3 ans, extincteur et radeau vérifiés tous les ans, percuteurs de gilets
  tous les 2 ans, batterie de balise tous les 5 ans). Chaque exigence cite
  l'annexe 240-A.2 et le fichier **date la version du texte**
  (`DIVISION_240_TEXT_VERSION`), la Division 240 étant régulièrement modifiée.
- **Ce que le corpus ne suit pas, il le dit.** Six éléments d'armement n'ont pas
  de type dans l'inventaire (moyen de repérage lumineux, moyen de remorquage,
  RIPAM, cartes marines, réception météo, document de synthèse) : ils sont
  affichés en note sous le panneau et jamais comptés comme manquants — signaler
  « absent » ce que l'utilisateur ne peut pas saisir n'aurait été que du bruit.
- **Panneau Conformité.** `BoatSafetyCompliancePanel.vue`, en tête du filtre
  « Sécurité » de l'onglet Équipements : score, équipements manquants, quantités
  insuffisantes, périmés et à réviser. Chaque ligne « manquant » propose
  « Ajouter cet équipement », qui ouvre la modale de création **pré-remplie** sur
  le bon type. Le rapport est calculé côté serveur
  (`BoatSafetyComplianceService`, calcul pur : inventaire + zone + `maxPersons` →
  rapport) et passé dans le squelette de la fiche, pas dans les données
  différées.
- **Informatif, jamais bloquant.** Aucune réservation, aucune sortie, aucun
  formulaire n'est verrouillé par une non-conformité. Le disclaimer (« ce suivi
  ne remplace ni le texte officiel ni un contrôle des Affaires maritimes ») et la
  version du texte sont affichés en permanence.
- **Notifications.** `notification_scan_service.ts` couvre désormais les
  équipements sans date de péremption saisie mais avec une date d'achat : la
  durée de vie du corpus les date. Les deux volets sont fusionnés avant
  agrégation, pour qu'un bateau cumulant les deux cas ne reçoive qu'une seule
  notification, avec le bon compte.
- **Tests.** Japa : 15 cas unitaires sur le service (zone nulle et zone inconnue,
  absence, quantité par personne, cumul des zones, harnais réservé aux voiliers,
  péremption saisie, durée de vie par défaut, révision distinguée de la
  péremption, échéance proche non bloquante, équipement hors zone, tri des
  écarts), 6 cas fonctionnels de bout en bout (persistance de la zone, refus
  d'une valeur hors vocabulaire, remise à vide, indépendance vis-à-vis de la
  catégorie CE, rapport exposé par la fiche bateau avec et sans zone) et 4 cas
  fonctionnels sur le scan de notifications. Vitest : invariants
  et parité i18n `fr`/`en` du corpus, plus le rendu du panneau (état sans zone,
  score, ajout pré-rempli, absence de bouton sans droits, échéance déduite).
- **Documentation.** `docs/domain/safety-compliance.md` (nouveau),
  `docs/data/schema.md`.
