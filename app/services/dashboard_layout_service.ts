import type User from '#models/user'
import QuotaService from '#services/quota_service'
import {
  normalizeDashboardLayoutPayload,
  resolveDashboardLayout,
} from '#shared/helpers/dashboard_layout'
import type {
  DashboardWidgetAvailability,
  ResolvedDashboardLayout,
  UpdateDashboardLayoutPayload,
} from '#shared/types/dashboard_layout'
import type { OrgRole } from '#shared/types/organization'
import { inject } from '@adonisjs/core'

/**
 * Disposition personnalisée du tableau de bord (widgets visibles et ordre par
 * colonne, par utilisateur). Le service porte aussi la **disponibilité** des
 * widgets — rôle, plan, modules — pour que le contrôleur de la page et celui
 * de la personnalisation appliquent exactement les mêmes gardes.
 */
@inject()
export default class DashboardLayoutService {
  constructor(private quotaService: QuotaService) {}

  /**
   * Widgets accessibles à l'utilisateur. `user.organization` doit être chargée.
   * - `spend` : admins seulement (les membres gardent le budget par bateau) ;
   * - `upcoming_reservations` : module Location actif **et** `boats.view` ;
   * - `ports` : plans avec cartographie de port (#604), hors profil particulier ;
   * - `invoicing` : module CRM/Facturation actif **et** `invoices.view` ;
   * - `charter_occupancy` : même garde que `upcoming_reservations`.
   */
  async availabilityFor(user: User, role: OrgRole | null): Promise<DashboardWidgetAvailability> {
    const org = user.organizationId ? user.organization : null
    const canViewReservations =
      org && user.organizationId
        ? (await this.quotaService.canManageReservations(org)) &&
          (await user.hasPermission(user.organizationId, 'boats.view'))
        : false

    // Factures : module CRM actif **et** capability de lecture — même garde
    // que les factures impayées de « À traiter » (#832), calculée une fois ici.
    const canViewInvoices =
      org && user.organizationId
        ? (await this.quotaService.canManageInvoices(org)) &&
          (await user.hasPermission(user.organizationId, 'invoices.view'))
        : false

    return {
      kpis: true,
      attention: true,
      at_sea: true,
      upcoming_reservations: canViewReservations,
      activity: true,
      boats: true,
      ai_panel: true,
      spend: role === 'admin',
      ports: org ? this.quotaService.canManagePorts(org) : false,
      planned_tasks: true,
      notifications: true,
      safety_compliance: true,
      fuel: true,
      low_stock: true,
      invoicing: canViewInvoices,
      charter_occupancy: canViewReservations,
    }
  }

  resolveForUser(user: User, availability: DashboardWidgetAvailability): ResolvedDashboardLayout {
    return resolveDashboardLayout(user.dashboardLayout, availability)
  }

  async save(
    user: User,
    payload: UpdateDashboardLayoutPayload,
    availability: DashboardWidgetAvailability
  ): Promise<void> {
    user.dashboardLayout = normalizeDashboardLayoutPayload(payload, availability)
    await user.save()
  }

  async reset(user: User): Promise<void> {
    user.dashboardLayout = null
    await user.save()
  }
}
