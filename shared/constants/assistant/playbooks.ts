import type { AiSuggestionLocale } from '#shared/types/ai'
import type { AssistantToolPlanFlag } from '#shared/types/assistant_tools'

/**
 * Playbooks du copilote FleetAi : repères d'expert par domaine, injectés
 * dynamiquement dans le prompt système (2 max par tour) selon la question et
 * la page courante — plutôt qu'un prompt monolithique qui noierait le petit
 * modèle. Sélection déterministe (scoring mots-clés + bonus de page), même
 * convention que `product_knowledge.ts` : keywords minuscules sans accents.
 */
export interface AssistantPlaybook {
  id: string
  title: Record<AiSuggestionLocale, string>
  /** ~800 caractères max par locale — deux playbooks ≈ 400 tokens de prompt. */
  body: Record<AiSuggestionLocale, string>
  keywords: string[]
  /** Préfixes de chemin qui donnent le bonus de page (`/planning`, `/boats`…). */
  pagePrefixes: string[]
  planFlag?: AssistantToolPlanFlag
}

/** Nombre max de playbooks injectés par tour. */
export const ASSISTANT_MAX_PLAYBOOKS = 2

/** Bonus de score quand la page courante appartient au domaine du playbook. */
export const ASSISTANT_PLAYBOOK_PAGE_BONUS = 10

export const ASSISTANT_PLAYBOOKS: AssistantPlaybook[] = [
  {
    id: 'maintenance',
    title: { fr: 'Maintenance', en: 'Maintenance' },
    body: {
      fr: "Une tâche se planifie par date (dueAt) OU par échéance d'heures moteur (dueEngineHours, réservée à subject engine avec un boatEngineId). Préférez les heures moteur pour les vidanges et rodages (ex. toutes les 100 h via recurrenceIntervalEngineHours), la date pour l'administratif et la saison (hivernage en novembre, remise à l'eau au printemps, antifouling annuel, révision du gréement). Avant de proposer une tâche, vérifiez le planning avec list_maintenance : signalez un doublon plutôt que de le créer. Une intervention passée se consigne dans l'historique (écran Maintenance), pas comme tâche future. Les tâches en retard du digest sont prioritaires : proposez de les traiter avant d'en ajouter.",
      en: 'A task is scheduled by date (dueAt) OR by engine-hour due (dueEngineHours, restricted to subject engine with a boatEngineId). Prefer engine hours for oil changes and servicing (e.g. every 100 h via recurrenceIntervalEngineHours), dates for paperwork and season work (winterizing in November, spring relaunch, yearly antifouling, rig inspection). Before proposing a task, check the planning with list_maintenance: flag a duplicate rather than creating it. Past work belongs to the history (Maintenance screen), not to a future task. Overdue tasks from the digest come first: offer to handle them before adding more.',
    },
    keywords: [
      'maintenance',
      'entretien',
      'tache',
      'task',
      'vidange',
      'oil',
      'revision',
      'service',
      'hivernage',
      'winterizing',
      'antifouling',
      'carenage',
      'planning',
      'echeance',
      'due',
      'retard',
      'overdue',
      'recurrence',
      'heures',
      'hours',
    ],
    pagePrefixes: ['/planning', '/maintenance', '/engines'],
  },
  {
    id: 'navigation-fuel',
    title: { fr: 'Navigation et carburant', en: 'Navigation and fuel' },
    body: {
      fr: "Un bateau n'a qu'UNE sortie en cours à la fois : vérifiez avec list_operations avant de proposer start_trip, et proposez close_trip pour la clôturer — c'est la clôture (engineHoursEnd + boatEngineId) qui met à jour le compteur du moteur, ne proposez pas add_engine_hours en plus. Pour un plein (log_fuel), quantité × prix au litre doit correspondre au coût total : ne fournissez que les valeurs données par l'utilisateur, sans en déduire. Un événement anormal (échouement, voie d'eau, avarie de gréement, panne, collision, incendie, vol) se déclare via report_incident avec une description factuelle datée — utile pour l'assurance. Une panne moteur à diagnostiquer relève du handoff diagnosis, pas d'un incident seul.",
      en: 'A boat has only ONE trip in progress at a time: check with list_operations before proposing start_trip, and propose close_trip to close it — closing (engineHoursEnd + boatEngineId) is what updates the engine counter, do not also propose add_engine_hours. For a refueling (log_fuel), quantity × price per liter must match the total cost: only fill in the values the user gave, never derive them. An abnormal event (grounding, flooding, rigging failure, engine failure, collision, fire, theft) is reported via report_incident with a dated factual description — useful for insurance. An engine fault to diagnose calls for the diagnosis handoff, not just an incident.',
    },
    keywords: [
      'sortie',
      'trip',
      'navigation',
      'journal',
      'logbook',
      'carburant',
      'fuel',
      'plein',
      'refuel',
      'gasoil',
      'diesel',
      'essence',
      'litres',
      'liters',
      'incident',
      'avarie',
      'echouement',
      'grounding',
      'collision',
      'escale',
      'milles',
      'distance',
    ],
    pagePrefixes: ['/navigation'],
  },
  {
    id: 'commercial',
    title: { fr: 'Location et clients', en: 'Charter and clients' },
    body: {
      fr: "Une réservation est soit une option (pose un jalon, annulable) soit confirmée — une réservation confirmée annule automatiquement les options qui la chevauchent, et un conflit de dates est rejeté. Le prix total se calcule seul depuis la grille tarifaire du bateau (saisons) : ne l'inventez jamais. Avant create_reservation, cherchez le client existant via list_commercial et passez son clientId — un client en liste noire est refusé. Pour un nouveau client, create_client d'abord (le consentement RGPD se coche dans l'app, pas par le copilote). Les devis et factures se génèrent depuis la réservation ou l'écran Factures ; la numérotation est automatique et sans trou.",
      en: 'A reservation is either an option (a placeholder, cancellable) or confirmed — a confirmed reservation automatically cancels overlapping options, and a date conflict is rejected. The total price is computed from the boat pricing grid (seasons): never invent it. Before create_reservation, look up the existing client via list_commercial and pass their clientId — a blacklisted client is refused. For a new client, create_client first (GDPR consent is ticked in the app, not by the copilot). Quotes and invoices are generated from the reservation or the Invoices screen; numbering is automatic and gapless.',
    },
    keywords: [
      'reservation',
      'booking',
      'location',
      'charter',
      'client',
      'devis',
      'quote',
      'facture',
      'invoice',
      'option',
      'confirmee',
      'confirmed',
      'tarif',
      'price',
      'saison',
      'season',
      'blacklist',
      'caution',
    ],
    pagePrefixes: ['/reservations', '/clients', '/invoices'],
    planFlag: 'canManageReservations',
  },
  {
    id: 'safety-division240',
    title: { fr: 'Sécurité et Division 240', en: 'Safety and Division 240' },
    body: {
      fr: "La Division 240 (plaisance française < 24 m) impose un armement de sécurité selon la distance d'un abri : basique (< 2 milles), côtier (< 6), semi-hauturier (< 60), hauturier (au-delà). FleetAi suit l'armement par bateau et calcule un état de conformité par zone (get_boat le renvoie) : gilets, moyens de repérage lumineux, dispositif d'assèchement, coupe-circuit, extincteurs, puis VHF, fusées, trousse de secours et radeau selon la zone. Les dates de péremption (fusées, extincteurs, radeau, VHF portable) se suivent en tâches de maintenance datées. Vous informez, mais l'app ne remplace pas le texte réglementaire : en cas de doute, renvoyez vers la réglementation officielle.",
      en: "Division 240 (French pleasure craft < 24 m) mandates safety equipment by distance from shelter: basic (< 2 NM), coastal (< 6), semi-offshore (< 60), offshore (beyond). FleetAi tracks each boat's equipment and computes a compliance status per zone (get_boat returns it): lifejackets, light signalling, bailing device, kill switch, extinguishers, then VHF, flares, first-aid kit and liferaft depending on the zone. Expiry dates (flares, extinguishers, liferaft, handheld VHF) are tracked as dated maintenance tasks. You inform, but the app does not replace the regulation: when in doubt, point to the official text.",
    },
    keywords: [
      'securite',
      'safety',
      'division',
      '240',
      'armement',
      'gilet',
      'lifejacket',
      'fusee',
      'flare',
      'radeau',
      'liferaft',
      'extincteur',
      'vhf',
      'conformite',
      'compliance',
      'reglementation',
      'zone',
      'abri',
      'hauturier',
      'cotier',
    ],
    pagePrefixes: ['/boats'],
  },
  {
    id: 'ports',
    title: { fr: 'Ports et mouillages', en: 'Ports and moorings' },
    body: {
      fr: "Un port FleetAi se structure en pontons portant des places, plus des zones de mouillage — chaque place a un statut d'occupation et peut accueillir un bateau de la flotte ou un visiteur. list_ports renvoie les ports avec leurs places et l'occupation : appuyez-vous dessus pour dire ce qui est libre, jamais de mémoire. L'affectation d'un bateau à une place se fait sur l'écran Ports (plan interactif) — proposez le lien plutôt qu'une action. Les escales payantes d'un bateau en déplacement se consignent sur sa fiche (coûts d'escale) et pèsent dans son budget annuel.",
      en: 'A FleetAi port is structured as pontoons carrying spots, plus mooring areas — each spot has an occupancy status and can host a fleet boat or a visitor. list_ports returns the ports with their spots and occupancy: rely on it to say what is free, never from memory. Assigning a boat to a spot happens on the Ports screen (interactive map) — suggest the link rather than an action. Paid stopovers of a travelling boat are recorded on its page (stay costs) and count in its yearly budget.',
    },
    keywords: [
      'port',
      'ponton',
      'pontoon',
      'place',
      'spot',
      'mouillage',
      'mooring',
      'anchorage',
      'occupation',
      'occupancy',
      'escale',
      'stopover',
      'marina',
    ],
    pagePrefixes: ['/ports'],
    planFlag: 'canManagePorts',
  },
  {
    id: 'product-plans',
    title: { fr: 'Plans et réglages FleetAi', en: 'FleetAi plans and settings' },
    body: {
      fr: "Les capacités dépendent du plan de l'organisation et de ses modules : réservations/clients/factures relèvent d'Entreprise ou du module Location saisonnière, les ports des plans Pro et Entreprise, hors organisations déclarées « particulier ». Pour toute question de plan, quotas (bateaux, membres, tokens IA du mois) ou abonnement, appelez get_organization_status plutôt que de supposer — et search_product_help pour le « comment faire ». L'IA se règle dans Réglages — IA : instructions personnalisées de l'organisation et clé API propre (BYOK Mistral, Claude, ChatGPT ou Gemini) qui lève le quota de tokens de l'app. Si une fonctionnalité manque, dites quel plan ou module la débloque et proposez navTarget settings.billing.",
      en: 'Capabilities depend on the organization plan and modules: reservations/clients/invoices belong to Enterprise or the seasonal charter module, ports to Pro and Enterprise plans, except for organizations declared as private owners. For any question about plan, quotas (boats, members, monthly AI tokens) or subscription, call get_organization_status rather than assuming — and search_product_help for the “how do I”. AI is configured in Settings — AI: organization custom instructions and its own API key (BYOK Mistral, Claude, ChatGPT or Gemini) which lifts the app token quota. When a feature is missing, say which plan or module unlocks it and suggest navTarget settings.billing.',
    },
    keywords: [
      'plan',
      'abonnement',
      'subscription',
      'quota',
      'module',
      'entreprise',
      'enterprise',
      'pro',
      'tokens',
      'byok',
      'cle',
      'api',
      'facturation',
      'billing',
      'prix',
      'tarifs',
      'reglages',
      'settings',
    ],
    pagePrefixes: ['/settings'],
  },
]
