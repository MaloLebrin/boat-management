# Désactivation explicite de l'upload de photos hors-ligne (#621, v1)

**Date** : 2026-08-31

## Contexte

La file d'attente hors-ligne de l'épic PWA terrain (#481, lots #487–#491) stocke du JSON dans IndexedDB, alors que les galeries photo postent des `File` en multipart : un upload tenté hors-ligne échouait silencieusement (erreur réseau Inertia, aucun retour utilisateur). En attendant l'arbitrage de l'épic « upload hors-ligne » complet (stockage `Blob`, quota, compression, resynchronisation multipart), cette v1 applique la doctrine du refus explicite déjà actée pour les défauts d'inspection (#491).

## Comportement

Quand l'appareil est hors-ligne (`useNetworkStatus`), sur les deux galeries photo :

- `inertia/components/media/MediaPhotoGallery.vue` (voiles, gréement, sécurité, équipements, moteurs, pièces, inspections) ;
- `inertia/components/boats/show/BoatPhotoGallery.vue` (galerie du bateau) :

les boutons « Prendre une photo » et « Ajouter » sont désactivés (ainsi que la tuile d'upload et la zone d'empty state cliquable), un message `role="alert"` explique que l'ajout de photos est indisponible hors connexion, et le handler de soumission refuse tout envoi par garde défensive. Tout se réactive automatiquement au retour du réseau (listeners `online`/`offline` du composable). La suppression de photos et la consultation ne sont pas affectées.

## i18n

Nouvelle clé partagée `offline.photoUploadUnavailable` dans `resources/lang/{en,fr}/common.json`, à côté du vocabulaire hors-ligne existant (`offline.banner`…).

## Tests

- `tests/inertia/media_photo_gallery.spec.ts` : +5 tests (boutons désactivés + message hors-ligne, pas de POST hors-ligne, état en ligne inchangé, dropzone inerte hors-ligne, clé i18n dans les deux locales).
- `tests/inertia/boat_photo_gallery.spec.ts` : +4 tests équivalents (dont la tuile d'upload).
