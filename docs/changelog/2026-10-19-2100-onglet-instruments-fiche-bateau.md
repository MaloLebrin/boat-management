# 2026-10-19 — Onglet « Instruments » de la fiche bateau (#990)

Troisième brique de l'épopée #986 : l'écran qui affiche les instruments d'un bateau et qui y branche le serveur Signal K. Il s'appuie sur la bibliothèque client de la PR 2 (#989) et sur la prop différée `instruments` de la PR 1 (#988).

- **Onglet.** « Instruments » dans le groupe Navigation, après Position, pour les plans Pro et Entreprise. Un groupe de props différées dédié (`instruments`) : le skeleton n'attend que lui.
- **Écran.** Bandeau de connexion (état, erreur lisible : injoignable, jeton requis, certificat, protocole), jauges par catégorie (moteurs, navigation, environnement, batteries, réservoirs) avec unités converties, liste des alarmes Signal K actives. Hors flux, les jauges affichent la dernière valeur connue datée ; au-delà de deux minutes, un badge « périmé ».
- **Formulaire de source.** Réservé aux admins : adresse, jeton en écriture seule (jamais pré-rempli, indice quand un jeton existe, option pour l'effacer), contexte du navire, activation, retrait confirmé.
- **Droits.** Un membre qui peut éditer le bateau ouvre le flux ; un lecteur voit les dernières valeurs sans flux ni jeton.
- **Hors-ligne.** « Préparer la traversée » pré-charge `?tab=instruments` quand le plan l'ouvre.
- **Textes.** Namespace `instruments.json` (EN/FR, vouvoiement), libellé de la page pré-chargée, et la FAQ marketing « pas de capteurs connectés » complète désormais sa réponse.
- **Tests.** Vitest : composants (jauge, alarmes, bandeau, formulaire, orchestrateur), onglets visibles selon le plan, groupe différé, complétude des libellés du catalogue, pages pré-chargées.
- **Réserve.** Le go/no-go iOS du spike (#985) n'est pas encore consigné : le flux depuis un iPhone reste à mesurer.
