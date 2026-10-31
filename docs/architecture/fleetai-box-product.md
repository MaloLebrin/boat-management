# Boîte FleetAi — étude produit « brancher, découvrir, rattacher, faire installer »

> Étude du 2026-10-26, épopée #1044. Suite de #986 (instruments), #1018–#1024 (auto-installation) et #1032 (image Pi + appairage par code). Convention : **[V]** lu dans une documentation ou une source citée en fin de page, **[D]** déduit, **[M]** à mesurer sur matériel. **Rien n'a été testé sur un bateau.**

## 1. Ambition

Un client achète l'application **et** une boîte FleetAi. Il la branche sur le bus NMEA 2000 de son voilier (un seul câble, qui l'alimente), saisit un code dans FleetAi, et FleetAi **trouve lui-même** moteurs, batteries, cuves, GPS, AIS et météo, puis propose de les rattacher au carnet de bord. Quand la découverte ne suffit pas, FleetAi produit un **rapport de diagnostic** qui dit quoi ajouter et comment, et **propose la pose** par un électronicien partenaire. Aucune limite de principe : le code, le matériel et la prestation font partie du produit.

## 2. Ce que la découverte automatique peut et ne peut pas faire

La découverte dépend du **bus** présent à bord, pas du logiciel.

| Bus                                | Bateaux concernés                                                            | Découverte                                                                                                                                                                                                                                     | Ce qu'il faut                                                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NMEA 2000**                      | ≈ 2008 et plus, moteurs électroniques, Victron, Raymarine/B&G/Garmin récents | **Oui** : chaque appareil s'annonce (PGN 60928 adresse, PGN 126996 fabricant, modèle, série, fonction) ; canboatjs, embarqué par Signal K, décode ces PGN [V]. Signal K expose a priori ces métadonnées dans la branche `sources` [D, **T11**] | Une passerelle : HAT PICAN-M ou USB (Actisense NGX-1, Digital Yacht iKonvert). Signal K ne détecte aucune passerelle seul [V]                           |
| **NMEA 0183**                      | GPS, AIS, girouettes anciennes                                               | Partielle : aucune autodétection du débit (4800 / 38400) dans Signal K, seul OpenPlotter a un bouton « AUTO » [V] ; faisable chez nous par essai des deux débits [D]                                                                           | Convertisseur USB-série par source, ou multiplexeur                                                                                                     |
| **SeaTalk 1**                      | Raymarine ≈ 1995–2010, très courant sur voiliers                             | Non sans matériel                                                                                                                                                                                                                              | Convertisseur Raymarine SeaTalk 1 → SeaTalkng/NMEA 2000 (E22158 / R52131) [V] ; lecture GPIO possible côté Pi mais sans retour vers les instruments [V] |
| **Aucun bus** (jauges analogiques) | Bateaux anciens                                                              | Impossible                                                                                                                                                                                                                                     | Capteurs à poser : c'est le cas « technicien »                                                                                                          |

Conséquence : sur un voilier avec bus NMEA 2000, la boîte peut lister « moteur Volvo Penta EVC bâbord, moniteur de batterie BMV-712, jauge de cuve Maretron » dès le branchement [D]. Sur un bateau de 1998 sans bus, personne ne trouvera rien sans tirer des câbles : FleetAi doit le **dire**, pas échouer en silence.

## 3. Décisions prises (2026-10-26)

| Sujet              | Décision                                                                                                                                                            | Pourquoi                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Parc cible         | 1) NMEA 2000 présent ; 2) SeaTalk 1 / NMEA 0183 via un **kit Raymarine** (convertisseur) et un câble USB-série en option ; pas de bateau sans bus en v1             | Seul NMEA 2000 permet une vraie découverte ; SeaTalk 1 est trop répandu sur voiliers pour l'ignorer                          |
| Vente              | **Kit assemblé par FleetAi** (FleetAi devient fabricant), ≈ **350 € TTC**, vente unique ; l'abonnement reste le plan Pro/Entreprise                                 | Le plus simple pour le client ; reste sous les concurrents (§6)                                                              |
| Boîte de référence | **Raspberry Pi 4 (4 Go) + PICAN-M version SMPS** : un seul câble, la boîte est alimentée par le bus et le lit                                                       | Un câble = plug and play ; le SMPS de la PICAN-M est limité à 3 A, donc **pas de Pi 5** [V]                                  |
| Connectivité       | Wi-Fi / Ethernet du bord ; **pas de 4G** pour l'instant                                                                                                             | Niveau 3 de #1032 ; HAT SIM7600 ≈ 90 $ + SIM à gérer, plus tard                                                              |
| Alimentation       | **Toujours allumée**, 12 V permanent                                                                                                                                | Surveillance au port (batteries, mouillage) ; impose lecture seule + watchdog (#1040)                                        |
| Équipements v1     | Moteurs + carburant, énergie (batteries, solaire, quai), position/AIS/météo ; capteurs supplémentaires = **capteurs NMEA 2000 du marché** (Yacht Devices, Maretron) | Ils s'annoncent sur le bus : même découverte, aucun firmware à maintenir ; pas de GPIO ni de Bluetooth                       |
| Technicien         | **Rapport de diagnostic** généré, **mode technicien** sur la page locale, **pose proposée par FleetAi** (sous-traitée) ; pas d'annuaire                             | Aucun annuaire d'installateurs NMEA 2000 n'existe en France [V] ; le rapport est le document que tout électronicien comprend |

## 4. Architecture cible

### 4.1 Matériel : le kit

| Pièce     | Candidat                                                                                                          | Coût indicatif |
| --------- | ----------------------------------------------------------------------------------------------------------------- | -------------- |
| Carte     | Raspberry Pi 4, 4 Go                                                                                              | ≈ 65 €         |
| NMEA 2000 | PICAN-M SMPS (SK Pang / Copperhill) : overlay `mcp2515-can0`, oscillateur 16 MHz, interruption 25, 250 kbit/s [V] | ≈ 70 €         |
| Stockage  | microSD 32 Go industrielle                                                                                        | ≈ 15 €         |
| Boîtier   | ABS IP54, presse-étoupe                                                                                           | ≈ 15 €         |
| Câble     | dérivation NMEA 2000 Micro-C 1 m                                                                                  | ≈ 15 €         |
| Étiquette | QR d'appairage + libellé `fleetai-xxxx` (flux #1032 niveau 2)                                                     | —              |

Total pièces ≈ 150–180 €. Options : kit Raymarine (convertisseur ≈ 150 €), câble USB-série isolé, capteurs NMEA 2000 conseillés par le rapport. Détail, fournisseurs, conformité et prix : #1041.

### 4.2 Logiciel à bord (dépôt image `signalk-fleetai-image` + plugin `signalk-fleetai`)

- Base décidée par le spike (`signalk-image-spike.md`) : Pi OS Lite Trixie, Signal K, plugin en mode appairage, point d'accès de repli `FleetAi-xxxx`, Ethernet sans réglage.
- **`fleetai-hwdetect`** (#1039) : overlay PICAN-M actif par défaut, règles udev pour NGX-1 / NGT-1 / iKonvert (VID:PID à relever [M]) avec connexion Signal K générée, essai 4800 puis 38400 sur tout port série inconnu avec reconnaissance de phrases `$…` à somme de contrôle valide. Il **propose** et journalise ; il ne touche jamais une connexion faite à la main.
- **Inventaire** (#1036) : le plugin lit les appareils connus de Signal K (fabricant, modèle, série, fonction, adresse, chemins fournis) et les envoie à `POST /api/instruments/inventory` avec le jeton d'ingestion, au démarrage puis à chaque changement. Si `sources` n'expose pas les métadonnées NMEA 2000 (T11), le plugin écoute lui-même les PGN 126996 / 60928.
- **Page locale** `http://fleetai.local` : état réseau, code d'appairage, appareils trouvés, et un onglet **Technicien** (ports et débits, trames brutes, overlay CAN, redémarrage de Signal K, export de diagnostic) sans terminal, protégé par le mot de passe généré au premier démarrage.
- **12 V permanent** (#1040) : système en lecture seule + overlay, données Signal K sur une partition séparée, journal en RAM, watchdog matériel, horloge sans RTC (pas d'horodatage avant NTP), consommation mesurée (T12).

### 4.3 Côté FleetAi

```
boîte ──inventaire──▶ boat_instrument_devices ──▶ encart « Ce que la boîte a trouvé » (#1036)
                               │
                               ├──▶ propositions de rattachement ──▶ moteurs / batteries / cuves (#1037)
                               │
                               └──▶ rapport de diagnostic PDF : trouvé / manquant / conseillé (#1038)
                                              │
                                              └──▶ « Demander une installation » (#1042)
```

- **Inventaire** : table `boat_instrument_devices` (identifiant stable haché, libellé, fonction, bus, chemins, première/dernière vue, disparu), service, route API, transformer, types `shared/types/instruments.ts`.
- **Rattachement** : nouveaux modèles `boat_batteries` et `boat_tanks` (FleetAi n'en a aucun aujourd'hui) ; service pur de propositions ; l'étape « Relier les moteurs » de l'assistant devient « Relier les équipements » et réutilise `PATCH …/engines/:engineId/instrument-key` (`start/routes/boats.ts`) et `detectedEngineIds` (`inertia/composables/use_instrument_setup.ts`).
- **Rapport** : catalogue `INSTRUMENT_GAP_CATALOG` (donnée attendue → cause probable → matériel NMEA 2000 conseillé), rendu Edge + `pdf_service.ts`, locale de l'utilisateur.
- **Pose** : formulaire « Demander une installation » (onglet, rapport, page publique), table `installation_requests`, e-mail à l'exploitant ; pas de planning ni de paiement.
- **Assistant et page publique** (#1043) : option « Boîte FleetAi » en tête, kit Raymarine, capteurs conseillés, FAQ, JSON-LD `Product`.

## 5. Découpage et ordre

| #     | Issue                                    | Où           | Dépend de      |
| ----- | ---------------------------------------- | ------------ | -------------- |
| #1036 | Inventaire des appareils                 | ici + plugin | #1032 B        |
| #1037 | Batteries, réservoirs, auto-rattachement | ici          | #1036          |
| #1038 | Rapport de diagnostic PDF                | ici          | #1036, #1037   |
| #1039 | `fleetai-hwdetect` + mode technicien     | image        | #1032 C        |
| #1040 | 12 V permanent                           | image        | #1032 C        |
| #1041 | Kit matériel (hors code)                 | affaires     | tests matériel |
| #1042 | Pose FleetAi                             | ici          | #1038          |
| #1043 | Assistant et page publique               | ici          | #1032 D, #1036 |

Ordre : #1032 B et C → #1036 ∥ #1039 ∥ #1040 ∥ #1041 → #1037 → #1038 → #1042 ∥ #1043.

## 6. Concurrence (prix US relevés en 2026)

| Produit                            | Matériel      | Abonnement | Installateur                 |
| ---------------------------------- | ------------- | ---------- | ---------------------------- |
| Siren 3 Pro                        | ≈ 800 $       | ≈ 225 $/an | non exigé                    |
| Garmin OnDeck                      | ≈ 800 $       | ≈ 240 $/an | non exigé, écosystème Garmin |
| Digital Yacht 4G Xtream + NavAlert | 2 300–2 850 $ | —          | non exigé                    |
| Njord NjordLINK+                   | ≈ 500 $       | —          | non exigé                    |
| Vanemar NMEA 2000 Boat Adapter     | 329 $         | oui        | non exigé                    |

Tous sont des boîtiers NMEA 2000 à abonnement ; aucun ne combine découverte des équipements, carnet d'entretien et assistant. Une boîte à ≈ 350 € avec l'abonnement FleetAi existant se place sous tous sauf Vanemar [V].

## 7. Conformité et vente

Assembler un Pi et une PICAN-M dans un boîtier et le vendre fait de FleetAi un **fabricant** au sens des directives européennes : marquage CE (CEM, sans doute RED à cause du Wi-Fi), déclaration de conformité, dossier technique ; éco-participation **DEEE** affichée séparément ; **garantie légale de conformité** de 2 ans ; CGV matériel, rétractation, assurance responsabilité produit [V, à valider par un juriste]. Repli si c'est trop lourd au départ : un partenaire nautique assemble et vend sous sa marque, FleetAi fournissant image et plugin. Décision et démarches : #1041.

## 8. Risques

| Risque                                                      | Parade                                                                                         |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `sources` de Signal K n'expose pas fabricant/modèle (T11)   | Lecteur de PGN 126996 / 60928 dans le plugin                                                   |
| Overlay PICAN-M actif sans carte perturbe le démarrage (T8) | Détection par EEPROM de HAT si elle existe, sinon activation depuis la page locale             |
| Corruption de carte sur coupure 12 V (T12)                  | Lecture seule + overlay, carte industrielle, watchdog                                          |
| Consommation jugée trop élevée au port                      | Valeur mesurée affichée ; conseil de branchement sur la servitude ; veille à étudier plus tard |
| Conformité CE / DEEE sous-estimée                           | Issue #1041 avant toute vente ; repli partenaire                                               |
| La pose sous-traitée engage la responsabilité de FleetAi    | Contrat partenaire, assurance, périmètre « rapport + mise en relation » en v1                  |
| Bateau sans bus : déception                                 | Dit clairement sur la page publique et dans le rapport ; rapport = plan d'équipement           |

## 9. À valider sur matériel

Protocole `signalk-image-test-protocol.md`, complété par :

- **T11** : `sources` expose-t-il `manufacturerName` / `productName` / `serialNumber` / `deviceFunction` des appareils NMEA 2000 ? Avec quel délai après branchement ? Que donne un appareil NMEA 0183 ?
- **T12** : consommation Pi 4 + PICAN-M sur 24 h (repos, charge), tenue à 50 coupures franches, temps de retour en service, température en boîtier fermé.
- **T8 étendu** : PICAN-M sans carte, NGX-1, iKonvert, USB-série 4800 et 38400, branchement à chaud.

## 10. Sources

- canboatjs (passerelles prises en charge, PGN 60928 / 126996) : <https://github.com/canboat/canboatjs> ; <https://github.com/SignalK/signalk-to-nmea2000/issues/143>
- FAQ Signal K (SocketCAN, passerelles) : <https://github.com/SignalK/signalk-server/wiki/FAQ:-Frequently-Asked-Questions>
- Connexions NMEA 0183 de Signal K (débits, `/dev/ttyUSB*`) : <https://unpkg.com/signalk-server@2.30.0/docs/dist/Configuration/NMEA_Connections.html> ; bouton AUTO d'OpenPlotter : <https://openplotter.readthedocs.io/3.x.x/serial/connectingGPS.html>
- PICAN-M (overlay, SMPS 3 A, Pi 5) : <https://copperhilltech.com/content/pican-m_UGB_30.pdf> ; <https://copperhilltech.com/blog/tag/CAN+bus+Raspberry+Pi>
- SeaTalk 1 → NMEA 2000 : <https://marinehowto.com/raymarine-seatalk-1-to-seatalkng-nmea2000/> ; <https://openplotter.readthedocs.io/4.x.x/description/how_does_it_work.html>
- Victron Venus OS Large : <https://www.victronenergy.com/live/venus-os:large> ; <https://professional.victronenergy.com/news/detail/256/>
- Passerelles et prix : <https://udstyr.danskmarinecenter.dk/en/products/actisense-ngx-1-usb-nmea-2000-gateway-usb> ; <https://www.freeportmarine.com/products/digital-yacht-ikonvert-usb-79012> ; <https://yachtd.com/downloads/Yacht_Devices_Catalog_2025_EN.pdf>
- Concurrence : <https://smartboats.org/guides/best-cellular-boat-monitoring> ; <https://digitalyacht.co.uk/product/4g-router-remote-alarms-wifi/> ; <https://digitalyachtamerica.com/product/njordlink/> ; <https://vanemar.com/products/nmea-2000-sensor/>
- 4G (option future) : <https://www.waveshare.com/product/sim7600g-h-4g-hat.htm>
- Installateurs et certification en France : <https://boatindustry.com/news/25520/nmea-2000-a-certification-centre-in-rennes> ; <https://figaronautisme.meteoconsult.fr/actus-nautisme-bateaux/2025-05-15/77963-quel-bus-nmea-choisir-pour-connecter-vos-appareils-marins>
- Marquage CE : <https://questions.assemblee-nationale.fr/dyn/13/questions/QANR5L13QE100718.pdf>
