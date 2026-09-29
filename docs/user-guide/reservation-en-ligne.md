# Ouvrir la réservation en ligne à ses clients

> Module Location (plan Pro + module `charter`, ou Entreprise). Écran : fiche du
> bateau → **Réservations** → encart « Réservation en ligne ».
> Détails techniques : `docs/domain/reservations-and-pricing.md` §5.2 quater (#881).

La page de réservation en ligne est un lien à mettre sur votre site, vos
réseaux sociaux ou dans une signature d'e-mail. Vos clients y voient les
disponibilités d'un bateau, obtiennent un devis pour leurs dates et vous
envoient une demande. Ils n'ont pas besoin de compte, et vous ne payez pas de
commission.

## 1. Ouvrir la page d'un bateau

1. Dans l'encart **Réservation en ligne**, activez **Page ouverte**.
2. Cliquez sur **Copier le lien**, ou sur **Voir la page** pour la découvrir
   comme vos clients.

Le lien a la forme `…/book/<votre-organisation>/<bateau>`. Il ne change pas si
vous renommez le bateau, ni si vous fermez puis rouvrez la page. Fermée, la
page répond « introuvable ».

Quand plusieurs bateaux sont ouverts, la page flotte `…/book/<votre-organisation>`
les présente tous. Son adresse figure sous le lien du bateau.

## 2. Ce que voient vos clients

- Les photos du bateau, ses caractéristiques et vos tarifs (jour, semaine,
  caution, durée minimale).
- Un calendrier où les jours occupés sont grisés : vos réservations et
  options, les dates bloquées par un calendrier importé (iCal) et les
  entretiens planifiés. Le calendrier n'en dit jamais plus : ni nom de client,
  ni plateforme, ni motif.
- Un devis dès qu'ils ont choisi une arrivée et un départ. Il est calculé
  comme dans FleetAi, saisons comprises, avec l'acompte de 30 % demandé à la
  confirmation.

La page porte le nom de votre organisation. En plan Entreprise, elle montre
aussi le logo de votre marque blanche. Elle n'est pas référencée par les
moteurs de recherche.

## 3. Recevoir et traiter une demande

Une demande arrive comme une **option** sur le bateau, avec le badge
« Demande en ligne ». Le message du client est dans les notes. Les admins de
l'organisation reçoivent une notification (dans l'app et sur mobile) et un
e-mail. Le client reçoit un accusé de réception.

- **Confirmer** : passez l'option en « Confirmée ». Le client reçoit un
  e-mail de confirmation. Envoyez ensuite le contrat et réclamez l'acompte
  depuis la réservation, comme d'habitude.
- **Refuser** : annulez l'option. Le client reçoit un e-mail poli.

Confirmer une autre réservation sur les mêmes dates annule l'option : le
client est alors prévenu que sa demande n'a pas pu être confirmée.

## 4. Données personnelles

Le client coche une case de consentement avant d'envoyer sa demande. Une
demande jamais confirmée (restée en option, ou refusée) est supprimée
automatiquement 30 jours après son envoi, avec ses coordonnées. Une location
confirmée reste dans l'historique.
