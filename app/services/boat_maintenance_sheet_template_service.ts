import type { SheetTemplateItem, SheetType } from '#shared/types/maintenance'
import { inject } from '@adonisjs/core'

export type { SheetTemplateItem, SheetType }

const templates: Record<SheetType, string[]> = {
  entretien: [
    'Inspection visuelle de la coque',
    'Vérification et remplacement des anodes',
    'Contrôle du safran et axe de gouvernail',
    'Inspection du moteur (niveaux, filtres, courroies)',
    'Vérification du circuit électrique',
    'Contrôle des instruments de navigation',
    'Inspection de l\'accastillage',
    'Vérification des équipements de sécurité',
    'Contrôle du gréement dormant',
    'Nettoyage général',
  ],
  montage: [
    'Vérification du mât et barres de flèche',
    'Inspection des haubans et étais',
    'Montage et réglage du gréement dormant',
    'Installation et orientation des voiles',
    'Réglage du gréement courant',
    'Vérification des bloqueurs et poulies',
    'Test des winches',
    'Contrôle des têtes de mât et instruments',
    'Vérification du pataras et étai de trinquette',
    'Test de navigation courte',
  ],
  hivernage: [
    'Sortie de l\'eau et nettoyage de la coque',
    'Traitement antifouling',
    'Vérification et remplacement des anodes',
    'Vidange et rinçage du moteur',
    'Antigel du circuit de refroidissement',
    'Traitement du carburant (stabilisateur)',
    'Décharge contrôlée et stockage des batteries',
    'Démontage et rangement des voiles',
    'Démontage du gréement courant',
    'Protection des cordages et poulies',
    'Fermeture des vannes de coque',
    'Mise hors tension et rangement de l\'électronique',
    'Ventilation du bateau',
    'Pose de la bâche de protection',
  ],
  dehivernage: [
    'Inspection générale de la coque',
    'Vérification des passe-coques et vannes',
    'Contrôle du safran et du gouvernail',
    'Remise en charge des batteries',
    'Révision du moteur (huile, filtres, courroies)',
    'Test du circuit de refroidissement',
    'Vérification du circuit électrique',
    'Montage des voiles',
    'Vérification du gréement dormant',
    'Vérification du gréement courant',
    'Test des instruments de navigation',
    'Test de la VHF et de la radio',
    'Vérification de l\'armement de sécurité',
    'Essai en mer',
  ],
  atelier: [
    'Diagnostic initial',
    'Préparation du poste de travail',
    'Dépose des pièces concernées',
    'Réparation / remplacement des pièces',
    'Tests et contrôles',
    'Remontage et ajustements',
    'Nettoyage du poste de travail',
    'Compte-rendu des travaux effectués',
  ],
}

@inject()
export default class BoatMaintenanceSheetTemplateService {
  /**
   * Returns the default items for a given sheet type.
   */
  getItems(type: SheetType): SheetTemplateItem[] {
    const labels = templates[type]
    return labels.map((label, index) => ({
      label,
      position: index + 1,
    }))
  }
}
