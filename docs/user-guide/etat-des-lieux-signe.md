# Faire signer l'état des lieux et l'envoyer au client

> Module Location (plan Pro + module `charter`, ou Entreprise). Écran : fiche du
> bateau → **Réservations** → action **État des lieux** d'une réservation.
> Détails techniques : `docs/domain/inspections.md`, section « État des lieux
> signé » (#889).

L'état des lieux signé est la pièce qui vous protège si une caution est
contestée : ce qui a été constaté, quand, avec quelles photos, signé par le
client et par vous. FleetAi en fait un PDF, le fait signer sur votre écran et
l'envoie au client.

## 1. Remplir l'état des lieux

Comme d'habitude : relevés (carburant, heures moteur), checklist point par
point, photos, défauts. Tant qu'il n'est pas signé, tout reste modifiable.

Le bouton **PDF (brouillon)** ouvre le document tel qu'il sortira. Il porte la
mention « BROUILLON — non signé » : il n'engage personne.

## 2. Faire signer

1. Cliquez sur **Faire signer**.
2. Vérifiez le **nom du client** (repris de la réservation).
3. Le client signe dans le premier cadre, au doigt, au stylet ou à la souris.
   Vous signez dans le second : votre nom est celui de votre compte.
4. Cliquez sur **Signer et figer**.

**Effacer** recommence un tracé. La signature demande une connexion : le PDF
signé est produit et archivé à cet instant.

Une fois signé, l'état des lieux est **figé** : plus de modification des
constats, des relevés, des photos ni des défauts, et plus de suppression. C'est
ce qui lui donne sa valeur. Vérifiez donc tout avant de faire signer.

## 3. Le PDF signé

Le bouton devient **PDF signé**. C'est toujours le même fichier, celui produit
au moment de la signature. Il contient :

- le bateau, la période, le client et la date du relevé ;
- la checklist par zone, avec les notes ;
- pour un retour, ce qui a changé depuis le départ (les dégradations en
  évidence) ;
- les défauts signalés et jusqu'à 12 photos ;
- les deux signatures, horodatées.

## 4. L'envoyer au client

Cliquez sur **Envoyer au client**. Le PDF part en pièce jointe à l'adresse de
la réservation, ou à défaut à celle de la fiche client. La date d'envoi
s'affiche, et **Renvoyer au client** permet un second envoi.

Sans adresse e-mail, FleetAi vous le signale : renseignez-la sur la
réservation.

## Bon à savoir

- Au retour, l'état des lieux signé justifie une retenue sur caution : le bloc
  **Caution** est juste en dessous, sur la même page.
- Les deux parties signent sur votre appareil. La signature à distance, par un
  lien envoyé au client, n'existe pas encore.
- Qui peut faire quoi : lire le PDF demande l'accès aux états des lieux ;
  faire signer et envoyer, le droit de les modifier.
