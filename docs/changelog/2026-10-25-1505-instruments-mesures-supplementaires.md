# Instruments : mesures supplémentaires du catalogue Signal K (#1006)

Date : 2026-10-25

## Ce qui change

- L'onglet Instruments affiche et historise une vingtaine de mesures de plus, lues sur le serveur Signal K du bord : **énergie** (autonomie restante et état de santé des batteries, panneaux et contrôleurs solaires, chargeurs, onduleurs), **moteur** (température d'huile et d'échappement, pressions de refroidissement et de suralimentation, charge, tension de l'alternateur), **réservoirs** (volume en litres), **environnement** (vent sur le fond, humidité, températures intérieures et par zone comme la cale moteur ou le frigo, hauteur de marée) et **navigation** (distance totale et distance du trajet en milles).
- Le vent réel et le vent apparent (vitesse et angle) étaient déjà lus.
- La catégorie « Batteries » devient « Énergie » ; la distance s'affiche en milles nautiques (NM) et la puissance en watts (W).
- Les règles d'alerte de l'admin et les graphiques d'historique s'appliquent à ces mesures sans réglage supplémentaire.

## Pas encore pris en charge

- **Prévisions météo** : l'API Weather de Signal K v2 passe par un plugin fournisseur et du REST, ce n'est pas un chemin du flux.
- **AIS** : les cibles sont d'autres navires (`vessels.urn:mrn:imo:mmsi:*`), hors du modèle « un bateau = une source ».

## Technique

- `INSTRUMENT_PATH_CATALOG` (`shared/constants/instruments.ts`) : 28 motifs ajoutés, dont `environment.inside.<zone>.*` (segment libre `<zone>`) ; `NM` et `W` ajoutés à `toDisplayUnit`, `displayToSi` et `fractionDigits` ; cadences d'échantillonnage dans `inertia/lib/signalk/path_catalog.ts` ; libellés `instruments.path.*` FR/EN.
- Aucune migration : la colonne `path` accepte tout chemin du catalogue.
- Base de connaissance du copilote : mots-clés « panneaux solaires », « humidite », « maree », « distance parcourue », « charge moteur ».
