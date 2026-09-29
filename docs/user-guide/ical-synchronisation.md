# Synchroniser ses réservations avec un agenda ou une plateforme (iCal)

> Module Location (plan Pro + module `charter`, ou Entreprise). Écran : fiche du
> bateau → **Réservations** → encart « Synchroniser avec un calendrier externe ».
> Détails techniques : `docs/domain/reservations-and-pricing.md` §5.2 ter (#880).

Le format iCal (`.ics`) est le standard d'échange de calendriers. Tous les
agendas le lisent, et les plateformes de location l'utilisent pour se
synchroniser entre elles. FleetAi s'en sert dans les deux sens :

- **Exporter** : une adresse iCal publie les réservations d'un bateau, ou de
  toute la flotte, vers un agenda ou une plateforme ;
- **Importer** : l'adresse iCal d'une plateforme bloque dans FleetAi les
  dates louées là-bas. Plus de double réservation.

## 1. Exporter les réservations d'un bateau

1. Dans l'encart, cochez si besoin **Inclure le nom du client**, désactivé par
   défaut : l'adresse est lue par des tiers. Cochez aussi, si vous le voulez,
   **Inclure les entretiens planifiés**.
2. Cliquez sur **Créer l'adresse iCal**, puis sur **Copier l'adresse**.
3. Collez l'adresse là où vous voulez voir les réservations (voir §3).

Le flux contient les réservations confirmées, et les options marquées
« provisoires ». Une réservation annulée disparaît du flux. Les agendas
relisent l'adresse d'eux-mêmes, en général toutes les quelques heures, et
certaines plateformes plus souvent.

Pour toute la flotte, la carte **Flux iCal de la flotte** en bas de la page
**Réservations** fonctionne de la même façon.

**Sécurité.** Toute personne qui connaît l'adresse voit les dates réservées.
Si elle a circulé, cliquez sur **Régénérer** : l'ancienne adresse cesse aussitôt
de fonctionner, et il faut coller la nouvelle partout. **Révoquer** coupe le
flux sans en créer d'autre.

## 2. Importer le calendrier d'une plateforme

1. Sur la plateforme, copiez l'adresse d'export iCal du bateau (voir §3).
2. Dans l'encart, partie **Importer les calendriers des plateformes**,
   saisissez un nom (« Samboat ») et collez l'adresse, puis cliquez sur
   **Importer**.
3. FleetAi lit le calendrier tout de suite, puis toutes les 30 minutes. Le
   bouton **Synchroniser** force une lecture.

Les dates importées apparaissent en **violet pointillé** sur le calendrier du
bateau et sur la frise de la flotte. Elles ne se modifient que sur la
plateforme d'origine. Une réservation FleetAi qui les chevauche est refusée,
avec le nom du calendrier en cause.

Si un créneau importé chevauchait déjà une réservation FleetAi, l'encart
affiche « double réservation » : c'est à traiter avec le client.

Seules les adresses `https` publiques sont acceptées (`webcal://` aussi). Si la
lecture échoue, par exemple parce que la plateforme ne répond pas ou que
l'adresse ne renvoie pas de calendrier, l'encart l'indique. Les dates déjà
importées restent bloquées jusqu'à la lecture suivante réussie.

## 3. Où trouver et où coller l'adresse

Les menus des plateformes changent : les noms ci-dessous sont indicatifs.

| Où                   | Exporter depuis la plateforme (à importer dans FleetAi)                           | Importer dans la plateforme (l'adresse FleetAi)                             |
| -------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Google Agenda**    | —                                                                                 | Autres agendas → « + » → **À partir de l'URL** → coller l'adresse           |
| **Apple Calendrier** | —                                                                                 | Fichier → **Nouvel abonnement à un calendrier**, ou le bouton **S'abonner** |
| **Outlook**          | —                                                                                 | Ajouter un calendrier → **S'abonner à partir du web**                       |
| **Click&Boat**       | Espace loueur → calendrier du bateau → synchronisation / export iCal              | Même écran → importer un calendrier externe                                 |
| **Samboat**          | Espace propriétaire → calendrier de l'annonce → lien iCal                         | Même écran → ajouter un calendrier iCal                                     |
| **Airbnb**           | Calendrier de l'annonce → Disponibilité → **Associer des calendriers** → exporter | Même écran → **Importer un calendrier**                                     |

## 4. Limites

- Un bateau accepte au plus 10 calendriers importés, et chacun au plus 2 000
  créneaux.
- Les dates importées ne comptent ni dans le chiffre d'affaires, ni dans
  l'occupation, ni dans les factures : la location est facturée par la
  plateforme.
- Un événement récurrent n'est lu qu'à sa première occurrence : les
  plateformes publient une réservation par événement.
- Les dates importées ne sont jamais republiées dans le flux FleetAi : elles
  reviendraient en écho sur la plateforme d'où elles viennent.
