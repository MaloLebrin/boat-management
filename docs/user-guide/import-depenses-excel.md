# Guide utilisateur — Importer des dépenses depuis Excel ou CSV

Ce guide explique comment charger en une fois l'historique des dépenses d'un
bateau dans FleetAi à partir d'un classeur Excel (`.xlsx`) ou d'un fichier CSV,
plutôt que de saisir chaque dépense à la main sur la page Budget.

## À qui s'adresse l'import

- **Plan Entreprise** uniquement.
- **Administrateur** de l'organisation uniquement. Un membre, un mécanicien ou
  un propriétaire de bateau ne voit pas le formulaire d'import (les exports de
  la même page restent disponibles dès le plan Pro, à tous les rôles).
- Les dépenses importées rejoignent le poste **« Dépenses libres »** de la page
  Budget du bateau, exactement comme une dépense saisie à la main. Elles sont
  ensuite modifiables et supprimables ligne par ligne depuis cette page.

## En deux minutes

1. Ouvrez la page **Budget** du bateau concerné et cliquez sur
   **« Importer des dépenses »** (ou allez dans **Réglages › Import / Export**
   et choisissez le type **« Dépenses (budget) »** puis le bateau).
2. Sélectionnez votre fichier `.xlsx` ou `.csv` et cliquez sur
   **« Prévisualiser »**.
3. Vérifiez l'aperçu : chaque ligne est marquée **OK**, **Erreur** ou
   **Déjà présente**.
4. Cliquez sur **« Importer N lignes »**. Seules les lignes **OK** sont
   enregistrées.

Rien n'est écrit avant la confirmation : vous pouvez annuler à tout moment
depuis l'aperçu.

## Préparer le classeur Excel

Le fichier doit respecter trois règles :

- **La première feuille** du classeur est lue, les autres sont ignorées.
- **La ligne 1 contient les en-têtes**, une colonne par information.
- **Chaque ligne suivante est une dépense.** Les lignes entièrement vides sont
  ignorées.

### Colonnes

| Colonne         | Obligatoire | En-têtes reconnues                                              | Contenu attendu                                                                                  |
| --------------- | ----------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Date**        | Oui         | `date`                                                          | `2024-01-15`, `15/01/2024`, `15-01-2024`, ou une vraie cellule au format Date d'Excel            |
| **Libellé**     | Oui         | `label`, `libellé`, `intitulé`, `titre`, `title`, `désignation` | Texte libre, 255 caractères maximum (ex. `Antifouling`, `Plein gasoil`)                          |
| **Montant**     | Oui         | `amount`, `montant`, `prix`, `cost`, `coût`, `total`            | Nombre : `350`, `350,00`, `1 234,56`, `1.234,56`, `120,50 €`. Un montant négatif = remboursement |
| **Catégorie**   | Non         | `category`, `catégorie`, `type`                                 | Voir la liste ci-dessous. Vide = `other` (autre)                                                 |
| **Description** | Non         | `description`, `notes`, `note`, `commentaire`, `comment`        | Texte libre                                                                                      |

Les en-têtes sont reconnues **sans tenir compte de la casse ni des accents** :
`Libellé`, `LIBELLE` ou `libelle` sont équivalents. L'ordre des colonnes est
libre. Les colonnes qui ne correspondent à rien (fournisseur, moyen de
paiement…) sont simplement ignorées : inutile de les supprimer.

### Catégories acceptées

| Valeur enregistrée | Écritures acceptées dans le fichier                          | Rôle dans le budget      |
| ------------------ | ------------------------------------------------------------ | ------------------------ |
| `maintenance`      | `maintenance`, `entretien`, `réparation`                     | Entretien et réparations |
| `fuel`             | `fuel`, `carburant`, `gasoil`, `essence`                     | Carburant                |
| `documents`        | `documents`, `document`, `papiers`, `assurance`, `insurance` | Documents et assurance   |
| `port`             | `port`, `escale`, `mooring`, `marina`                        | Port et mouillage        |
| `equipment`        | `equipment`, `équipement`, `matériel`                        | Équipement               |
| `other`            | `other`, `autre`, `autres`, `divers`, ou cellule vide        | Autre                    |

Une catégorie qui n'est pas dans cette liste met la ligne en **Erreur** : la
ligne n'est pas importée tant qu'elle n'est pas corrigée.

> La catégorie est conservée sur chaque dépense (badge sur la page Budget),
> mais **toutes les dépenses importées sont additionnées dans le poste
> « Dépenses libres »** du budget, comme les dépenses saisies à la main. Les
> postes Carburant, Documents, Port et Équipement sont alimentés par les autres
> modules (pleins, documents du bateau, séjours au port, équipements).

### Exemple

| Date       | Libellé         | Montant  | Catégorie | Description            |
| ---------- | --------------- | -------- | --------- | ---------------------- |
| 15/01/2024 | Antifouling     | 350,00   | entretien | Carénage annuel        |
| 2024-02-03 | Plein gasoil    | 120,50 € | carburant |                        |
| 10/03/2024 | Avoir assurance | -85      | assurance | Remboursement partiel  |
| 22/04/2024 | Cordage 12 mm   | 64,90    |           | Catégorie vide → autre |

### Limites

- **2 Mo** et **2 000 lignes** par fichier. Au-delà, le fichier est refusé
  avant toute analyse : découpez-le en plusieurs classeurs.
- Une seule prévisualisation en attente par utilisateur : lancer un nouvel
  aperçu remplace le précédent.

## Préparer un fichier CSV

Même colonnes, mêmes règles. En plus :

- séparateur **point-virgule** (`;`) — c'est le format « CSV » d'Excel en
  français ;
- encodage **UTF-8** (avec ou sans BOM) ;
- une valeur qui contient un `;` doit être entre guillemets (`"Plein; gasoil"`).

```
date;label;amount;category;description
2024-01-15;Antifouling;350.00;maintenance;Carénage annuel
15/02/2024;Plein gasoil;120,50;carburant;
```

## Lire l'aperçu

L'aperçu affiche les 50 premières lignes et le décompte complet :
_« N lignes valides sur M — X erreurs — Y doublons ignorés »_.

| Statut            | Signification                                                                                                        | Que faire                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **OK**            | La ligne sera enregistrée à la confirmation.                                                                         | Rien.                                                                                             |
| **Erreur**        | Une colonne est invalide ; le message précise laquelle (date, libellé, montant, catégorie).                          | Corrigez le fichier et relancez l'aperçu. Les autres lignes peuvent être importées sans attendre. |
| **Déjà présente** | Une dépense de **même date, même libellé et même montant** existe déjà sur ce bateau (ou plus haut dans le fichier). | Rien : la ligne est ignorée, ce qui évite les doublons quand vous réimportez un même export.      |

La comparaison du libellé ignore les majuscules et les espaces en trop :
`Antifouling` et `antifouling ` sont la même dépense.

## Erreurs fréquentes

| Message                                                  | Cause                                                                    | Correction                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| _En-têtes manquantes dans le fichier : label, amount_    | La ligne 1 ne contient pas de colonne libellé et/ou montant reconnue.    | Renommez les en-têtes avec l'une des écritures du tableau des colonnes.                  |
| _Date invalide (formats attendus : …)_                   | Date écrite autrement (`2024/01/15`, `15 janvier`) ou date inexistante.  | Utilisez `AAAA-MM-JJ` ou `JJ/MM/AAAA`, ou appliquez le format Date d'Excel à la colonne. |
| _Montant invalide (nombre attendu)_                      | Texte dans la colonne montant (`environ 300`, `N/A`).                    | Ne laissez que le nombre, avec ou sans `€`.                                              |
| _Catégorie invalide. Valeurs acceptées : …_              | Catégorie hors liste (`loisirs`, `divers achats`).                       | Utilisez une valeur du tableau des catégories, ou laissez la cellule vide.               |
| _Le fichier n'a pas pu être lu_                          | Classeur endommagé, ou fichier renommé en `.xlsx` sans être un classeur. | Ré-enregistrez depuis Excel au format « Classeur Excel (.xlsx) », ou exportez en CSV.    |
| _Votre fichier contient N lignes, la limite est de 2000_ | Fichier trop volumineux.                                                 | Découpez-le en plusieurs fichiers.                                                       |
| _La prévisualisation a expiré_                           | La session a changé entre l'aperçu et la confirmation.                   | Relancez l'aperçu.                                                                       |

## Bonnes pratiques

- **Un fichier par bateau** : l'import cible le bateau choisi dans le
  formulaire, le fichier ne porte pas de colonne bateau.
- **Réimporter un export bancaire mis à jour** est sans risque : les lignes
  déjà connues sont marquées « Déjà présente » et seules les nouvelles sont
  ajoutées.
- **Vérifiez l'année** sur la page Budget après l'import : le sélecteur d'année
  affiche par défaut l'année en cours.
- Pour des **séjours au port**, utilisez le formulaire dédié de la page Budget :
  l'import de dépenses ne les crée pas.

## Voir aussi

- Import de l'historique de maintenance : même écran, type « Événements de
  maintenance » (colonnes `date`, `title`, `subject`…), format détaillé dans
  l'aide de la page.
- Documentation technique : `docs/domain/csv-import-export.md`.
