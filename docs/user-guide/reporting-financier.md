# Guide utilisateur — Le reporting financier de flotte

Le reporting met côte à côte ce que chaque bateau vous coûte et ce qu'il vous
rapporte, sur la période de votre choix.

## À qui s'adresse le reporting

- **Plans Pro et Entreprise.** Sur le plan Starter, la page s'affiche en aperçu
  flouté avec un bouton pour découvrir les plans.
- **Administrateurs** de l'organisation. Les membres gardent la page Budget de
  chaque bateau.
- Les **revenus de location**, la **marge** et l'**occupation** apparaissent
  avec le module **Location** ; la colonne **Encaissé** avec le module
  **Facturation**. Sans module, le reporting montre les coûts.

## Lire la page

1. Ouvrez **Reporting** dans le menu (section Business).
2. Choisissez une **période** : mois en cours, trimestre, année, 12 derniers
   mois, ou **Personnalisée** (saisissez les deux dates puis **Appliquer**).
3. Choisissez **Toute la flotte** ou un **bateau**.

En tête, les indicateurs clés et leur évolution par rapport à la période
précédente. Dessous, les dépenses par poste et par mois, les revenus comparés
aux coûts pour chaque bateau, l'occupation mois par mois, puis le détail par
bateau. Cliquez sur le nom d'un bateau pour ouvrir son budget.

## Comment les chiffres sont calculés

- **Coûts** : les mêmes postes que la page Budget du bateau (maintenance,
  carburant, documents / assurance, port, équipements, dépenses libres).
- **Revenus de location** : le prix des réservations **confirmées**, réparti
  au prorata des jours loués dans la période. Une location à cheval sur deux
  mois compte pour partie dans chacun. Les options et les annulations ne
  comptent pas.
- **Marge** : revenus de location moins coûts.
- **Encaissé** : factures payées sur la période, moins les avoirs remboursés.
  Indiqué à part : il ne s'ajoute pas aux revenus de location, qui portent
  souvent le même argent.
- **Occupation** : jours loués divisés par le nombre de jours disponibles de
  la flotte.
- **Coût par heure moteur / par mille** : à partir des sorties saisies dans le
  journal de bord (heures moteur de départ et d'arrivée, distance). « — »
  s'affiche quand il n'y a pas de quoi calculer.

## Exporter

Le bouton **Exporter CSV** télécharge le détail par bateau et le total de la
flotte pour la période et le bateau choisis. Le fichier s'ouvre dans Excel ou
LibreOffice (séparateur point-virgule).

## Sur le tableau de bord et avec l'assistant

- Ajoutez le widget **« Marge du mois »** depuis la galerie du tableau de bord
  (bouton **Personnaliser**).
- Demandez à l'assistant FleetAi « quel bateau me coûte le plus cher ? » ou
  « quelle est ma marge ce trimestre ? ».

## Limites actuelles

- Une seule devise par organisation.
- Pas d'export PDF du rapport ni de rapport envoyé par e-mail pour l'instant.
