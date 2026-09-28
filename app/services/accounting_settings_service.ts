import type Organization from '#models/organization'
import AuditLogService from '#services/audit_log_service'
import type { AccountingSettings } from '#shared/types/export'
import { inject } from '@adonisjs/core'

export interface AccountingSettingsInput {
  siren?: string | null
  salesAccount: string
  vatAccount: string
  customerAccount: string
  bankAccount: string
}

/**
 * Comptes du FEC et SIREN de l'organisation (#879), carte « Export
 * comptable » de `/settings/billing`.
 */
@inject()
export default class AccountingSettingsService {
  constructor(private auditLogService: AuditLogService) {}

  settingsFor(org: Organization, canManage: boolean): AccountingSettings {
    return {
      siren: org.accountingSiren,
      accounts: {
        sales: org.accountingSalesAccount,
        vat: org.accountingVatAccount,
        customers: org.accountingCustomerAccount,
        bank: org.accountingBankAccount,
      },
      canManage,
    }
  }

  async update(org: Organization, input: AccountingSettingsInput, userId: number): Promise<void> {
    org.merge({
      accountingSiren: input.siren ?? null,
      accountingSalesAccount: input.salesAccount,
      accountingVatAccount: input.vatAccount,
      accountingCustomerAccount: input.customerAccount,
      accountingBankAccount: input.bankAccount,
    })
    await org.save()

    await this.auditLogService.log({
      organizationId: org.id,
      userId,
      action: 'accounting_settings.update',
      entityType: 'organization',
      entityId: org.id,
      metadata: {
        siren: org.accountingSiren,
        accounts: this.settingsFor(org, true).accounts,
      },
    })
  }
}
