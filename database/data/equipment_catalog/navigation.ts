import type { EquipmentBrandSeed } from '#shared/types/equipment_catalog'

/**
 * Électronique de navigation et communication (#577) : traceurs, sondeurs,
 * radars, AIS, pilotes, VHF, balises, antennes, compas.
 *
 * Règles de saisie : `database/data/equipment_catalog/README.md`. C'est la
 * catégorie où le modèle précis compte le plus (SAV, mises à jour, câblage
 * NMEA) — d'où la densité de modèles.
 */
export const NAVIGATION_BRANDS: readonly EquipmentBrandSeed[] = [
  {
    slug: 'garmin',
    name: 'Garmin',
    country: 'US',
    categories: ['navigation'],
    aliases: ['garmin marine'],
    models: {
      navigation: [
        { name: 'GPSMAP 723', productionStartYear: 2020 },
        { name: 'GPSMAP 923', productionStartYear: 2020 },
        { name: 'GPSMAP 1223', productionStartYear: 2020 },
        { name: 'GPSMAP 1243xsv', productionStartYear: 2020 },
        { name: 'ECHOMAP UHD2 62sv' },
        { name: 'ECHOMAP UHD2 72sv' },
        { name: 'ECHOMAP UHD2 92sv' },
        { name: 'ECHOMAP Ultra 2 102sv' },
        { name: 'STRIKER Vivid 4cv' },
        { name: 'STRIKER Vivid 7sv' },
        { name: 'STRIKER Vivid 9sv' },
        { name: 'Reactor 40 Wheel', aliases: ['reactor 40'] },
        { name: 'Reactor 40 Hydraulic' },
        { name: 'GMR Fantom 18x' },
        { name: 'GMR 24 xHD' },
        { name: 'GNX 20' },
        { name: 'GNX Wind' },
        { name: 'GHC 20' },
        { name: 'AIS 800' },
        { name: 'VHF 115i' },
        { name: 'VHF 215i AIS' },
      ],
    },
  },
  {
    slug: 'raymarine',
    name: 'Raymarine',
    country: 'GB',
    categories: ['navigation'],
    // Autohelm et Raytheon sont les anciens noms encore très présents sur les
    // pilotes et instruments à bord.
    aliases: ['autohelm', 'raytheon', 'ray marine'],
    models: {
      navigation: [
        { name: 'Axiom 7', productionStartYear: 2017 },
        { name: 'Axiom 9', productionStartYear: 2017 },
        { name: 'Axiom 12', productionStartYear: 2017 },
        { name: 'Axiom+ 7', productionStartYear: 2020 },
        { name: 'Axiom+ 9', productionStartYear: 2020 },
        { name: 'Axiom+ 12', productionStartYear: 2020 },
        { name: 'Axiom 2 Pro 9', productionStartYear: 2022 },
        { name: 'Axiom 2 Pro 12', productionStartYear: 2022 },
        { name: 'Element 7 HV' },
        { name: 'Element 9 HV' },
        { name: 'Element 12 HV' },
        { name: 'EV-100 Wheel' },
        { name: 'EV-100 Tiller' },
        { name: 'EV-200 Linear' },
        { name: 'i50 Speed' },
        { name: 'i50 Depth' },
        { name: 'i60 Wind' },
        { name: 'i70s' },
        { name: 'p70s' },
        { name: 'Quantum 2 Q24D' },
        { name: 'AIS700' },
        { name: 'Ray63' },
        { name: 'Ray73' },
        { name: 'Ray90' },
        { name: 'ST60 Tridata', productionEndYear: 2010 },
        { name: 'ST2000+ Tiller Pilot', aliases: ['st2000'] },
      ],
    },
  },
  {
    slug: 'b-and-g',
    name: 'B&G',
    country: 'GB',
    categories: ['navigation'],
    aliases: ['b and g', 'b g', 'brookes and gatehouse'],
    models: {
      navigation: [
        { name: 'Vulcan 7' },
        { name: 'Vulcan 9' },
        { name: 'Vulcan 12' },
        { name: 'Zeus 3S 9' },
        { name: 'Zeus 3S 12' },
        { name: 'Zeus S 9' },
        { name: 'Zeus S 12' },
        { name: 'Triton 2' },
        { name: 'Triton Edge' },
        { name: 'WS310' },
        { name: 'WS320' },
        { name: 'H5000' },
        { name: 'NAC-2' },
        { name: 'NAC-3' },
        { name: 'V60-B' },
      ],
    },
  },
  {
    slug: 'simrad',
    name: 'Simrad',
    country: 'NO',
    categories: ['navigation'],
    aliases: ['simrad yachting'],
    models: {
      navigation: [
        { name: 'NSS evo3S 9' },
        { name: 'NSS evo3S 12' },
        { name: 'NSX 3007' },
        { name: 'NSX 3009' },
        { name: 'NSX 3012' },
        { name: 'Cruise 5' },
        { name: 'Cruise 7' },
        { name: 'Cruise 9' },
        { name: 'GO7 XSR' },
        { name: 'GO9 XSE' },
        { name: 'HALO20+' },
        { name: 'RS40-B' },
      ],
    },
  },
  {
    slug: 'lowrance',
    name: 'Lowrance',
    country: 'US',
    categories: ['navigation'],
    models: {
      navigation: [
        { name: 'HDS PRO 9' },
        { name: 'HDS PRO 10' },
        { name: 'HDS PRO 12' },
        { name: 'Elite FS 7' },
        { name: 'Elite FS 9' },
        { name: 'HOOK Reveal 5' },
        { name: 'HOOK Reveal 7' },
        { name: 'HOOK Reveal 9' },
      ],
    },
  },
  {
    slug: 'furuno',
    name: 'Furuno',
    country: 'JP',
    categories: ['navigation'],
    models: {
      navigation: [
        { name: 'GP-39' },
        { name: 'GP-1871F' },
        { name: 'TZtouch3 TZT9F' },
        { name: 'TZtouch3 TZT12F' },
        { name: 'DRS4W' },
        { name: 'FCV-628' },
        { name: 'FA-40' },
        { name: 'FA-70' },
        { name: 'NavPilot 300' },
      ],
    },
  },
  {
    slug: 'humminbird',
    name: 'Humminbird',
    country: 'US',
    categories: ['navigation'],
    models: {
      navigation: [
        { name: 'HELIX 5 CHIRP GPS G3' },
        { name: 'HELIX 7 CHIRP MSI GPS G4' },
        { name: 'HELIX 9 CHIRP MSI+ GPS G4N' },
        { name: 'SOLIX 10 CHIRP MSI+ G3' },
        { name: 'APEX 13 CHIRP MSI+' },
      ],
    },
  },
  {
    slug: 'em-trak',
    name: 'em-trak',
    country: 'GB',
    categories: ['navigation'],
    aliases: ['emtrak', 'em trak'],
    models: {
      navigation: [{ name: 'B921' }, { name: 'B924' }, { name: 'B954' }, { name: 'A200' }],
    },
  },
  {
    slug: 'digital-yacht',
    name: 'Digital Yacht',
    country: 'GB',
    categories: ['navigation'],
    models: {
      navigation: [
        { name: 'AIT2000' },
        { name: 'AIT5000' },
        { name: 'iKonvert' },
        { name: 'NavLink2' },
      ],
    },
  },
  {
    slug: 'mcmurdo',
    name: 'McMurdo',
    country: 'GB',
    categories: ['navigation'],
    aliases: ['mc murdo'],
    models: {
      navigation: [{ name: 'SmartFind G8 AIS' }, { name: 'FastFind 220' }],
    },
  },
  {
    slug: 'acr',
    name: 'ACR Electronics',
    country: 'US',
    categories: ['navigation'],
    aliases: ['acr'],
    models: {
      navigation: [
        { name: 'GlobalFix V4' },
        { name: 'GlobalFix V5 AIS' },
        { name: 'ResQLink 400' },
        { name: 'ResQLink View' },
        { name: 'AISLink MOB' },
      ],
    },
  },
  {
    slug: 'ocean-signal',
    name: 'Ocean Signal',
    country: 'GB',
    categories: ['navigation'],
    models: {
      navigation: [
        { name: 'rescueME PLB1' },
        { name: 'rescueME EPIRB1' },
        { name: 'rescueME MOB1' },
        { name: 'ATB1' },
      ],
    },
  },
  {
    slug: 'nke',
    name: 'nke Marine Electronics',
    country: 'FR',
    categories: ['navigation'],
    aliases: ['nke'],
    models: {
      navigation: [
        { name: 'Multigraphic' },
        { name: 'Multidisplay' },
        { name: 'Gyropilot 2' },
        { name: 'HR Wind Sensor' },
      ],
    },
  },
  {
    slug: 'vesper',
    name: 'Vesper Marine',
    country: 'NZ',
    categories: ['navigation'],
    aliases: ['vesper'],
    models: {
      navigation: [{ name: 'Cortex V1' }, { name: 'XB-8000' }, { name: 'WatchMate 850' }],
    },
  },
  {
    slug: 'icom',
    name: 'Icom',
    country: 'JP',
    categories: ['navigation'],
    models: {
      navigation: [
        { name: 'IC-M25' },
        { name: 'IC-M37E' },
        { name: 'IC-M94DE' },
        { name: 'IC-M330E' },
        { name: 'IC-M423GE' },
        { name: 'IC-M510E' },
      ],
    },
  },
  {
    slug: 'standard-horizon',
    name: 'Standard Horizon',
    country: 'JP',
    categories: ['navigation'],
    aliases: ['standard'],
    models: {
      navigation: [
        { name: 'GX1400GPS' },
        { name: 'GX2400GPS' },
        { name: 'GX6000E' },
        { name: 'HX210E' },
        { name: 'HX300E' },
        { name: 'HX890E' },
      ],
    },
  },
  {
    slug: 'cobra',
    name: 'Cobra',
    country: 'US',
    categories: ['navigation'],
    aliases: ['cobra marine'],
    models: {
      navigation: [{ name: 'MR HH350 FLT' }, { name: 'MR HH500 FLT BT' }, { name: 'MR F45' }],
    },
  },
  {
    slug: 'uniden',
    name: 'Uniden',
    country: 'JP',
    categories: ['navigation'],
    models: {
      navigation: [{ name: 'UM385' }, { name: 'MHS75' }, { name: 'Atlantis 155' }],
    },
  },
  {
    slug: 'iridium',
    name: 'Iridium',
    country: 'US',
    categories: ['navigation'],
    models: {
      navigation: [
        { name: 'Iridium GO!' },
        { name: 'Iridium GO! exec' },
        { name: 'Iridium Extreme 9575' },
      ],
    },
  },
  {
    slug: 'starlink',
    name: 'Starlink',
    country: 'US',
    categories: ['navigation'],
    aliases: ['star link', 'spacex starlink'],
    models: {
      navigation: [{ name: 'Standard' }, { name: 'Mini' }, { name: 'Flat High Performance' }],
    },
  },
  {
    slug: 'pelagic',
    name: 'Pelagic Autopilot',
    country: 'US',
    categories: ['navigation'],
    aliases: ['pelagic'],
  },
  {
    slug: 'cpt-autopilot',
    name: 'CPT Autopilot',
    country: 'US',
    categories: ['navigation'],
    aliases: ['cpt'],
  },
  {
    slug: 'hydrovane',
    name: 'Hydrovane',
    country: 'CA',
    categories: ['navigation'],
  },
  {
    slug: 'windpilot',
    name: 'Windpilot',
    country: 'DE',
    categories: ['navigation'],
    aliases: ['wind pilot'],
    models: {
      navigation: [{ name: 'Pacific Light' }, { name: 'Pacific' }, { name: 'Pacific Plus' }],
    },
  },
  {
    slug: 'plastimo',
    name: 'Plastimo',
    country: 'FR',
    // Compas de route côté navigation, ancres Kobra côté mouillage, réchauds et
    // équipement de pont côté confort — marque généraliste par excellence.
    categories: ['navigation', 'anchoring', 'comfort'],
    models: {
      navigation: [
        { name: 'Olympic 100' },
        { name: 'Olympic 135' },
        { name: 'Contest 101' },
        { name: 'Iris 100' },
      ],
      anchoring: [{ name: 'Kobra 2', aliases: ['kobra'] }],
    },
  },
  {
    slug: 'silva',
    name: 'Silva',
    country: 'SE',
    categories: ['navigation'],
    models: {
      navigation: [{ name: '70P' }, { name: '85' }, { name: '100P' }],
    },
  },
  {
    slug: 'ritchie',
    name: 'Ritchie',
    country: 'US',
    categories: ['navigation'],
    aliases: ['ritchie navigation'],
    models: {
      navigation: [{ name: 'Explorer B-51' }, { name: 'Navigator BN-202' }],
    },
  },
  {
    slug: 'sailmon',
    name: 'Sailmon',
    country: 'NL',
    categories: ['navigation'],
    models: {
      navigation: [{ name: 'MAX' }, { name: 'MAX Mini' }],
    },
  },
  {
    slug: 'actisense',
    name: 'Actisense',
    country: 'GB',
    categories: ['navigation'],
    models: {
      navigation: [{ name: 'NGT-1' }, { name: 'NGX-1' }, { name: 'EMU-1' }],
    },
  },
  {
    slug: 'yacht-devices',
    name: 'Yacht Devices',
    country: 'CY',
    categories: ['navigation'],
    models: {
      navigation: [{ name: 'YDNU-02' }, { name: 'YDWG-02' }, { name: 'YDAB-01' }],
    },
  },
  {
    slug: 'amec',
    name: 'AMEC',
    country: 'TW',
    categories: ['navigation'],
    models: {
      navigation: [{ name: 'WideLink B600' }, { name: 'CAMINO-108' }],
    },
  },
  {
    slug: 'comar-systems',
    name: 'Comar Systems',
    country: 'GB',
    categories: ['navigation'],
    aliases: ['comar'],
    models: {
      navigation: [{ name: 'CSB200' }, { name: 'AIS-3R' }],
    },
  },
  {
    slug: 'kvh',
    name: 'KVH',
    country: 'US',
    categories: ['navigation'],
    models: {
      navigation: [{ name: 'TracPhone V30' }, { name: 'TracVision TV1' }],
    },
  },
  {
    slug: 'intellian',
    name: 'Intellian',
    country: 'KR',
    categories: ['navigation'],
    models: {
      navigation: [{ name: 'i2' }, { name: 'i3' }],
    },
  },
  {
    slug: 'shakespeare',
    name: 'Shakespeare',
    country: 'US',
    categories: ['navigation'],
    aliases: ['shakespeare marine'],
    models: {
      navigation: [{ name: '5215' }, { name: '5225-XT Galaxy' }],
    },
  },
  {
    slug: 'glomex',
    name: 'Glomex',
    country: 'IT',
    categories: ['navigation'],
    models: {
      navigation: [{ name: 'RA106' }, { name: 'RA300' }],
    },
  },
]
