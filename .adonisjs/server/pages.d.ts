import '@adonisjs/inertia/types'

import type { VNodeProps, AllowedComponentProps, ComponentInstance } from 'vue'

type ExtractProps<T> = Omit<
  ComponentInstance<T>['$props'],
  keyof VNodeProps | keyof AllowedComponentProps
>

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'auth/forgot_password': ExtractProps<(typeof import('../../inertia/pages/auth/forgot_password.vue'))['default']>
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.vue'))['default']>
    'auth/reset_password': ExtractProps<(typeof import('../../inertia/pages/auth/reset_password.vue'))['default']>
    'auth/signup': ExtractProps<(typeof import('../../inertia/pages/auth/signup.vue'))['default']>
    'boats/budget': ExtractProps<(typeof import('../../inertia/pages/boats/budget.vue'))['default']>
    'boats/edit': ExtractProps<(typeof import('../../inertia/pages/boats/edit.vue'))['default']>
    'boats/engine_edit': ExtractProps<(typeof import('../../inertia/pages/boats/engine_edit.vue'))['default']>
    'boats/engine_part_show': ExtractProps<(typeof import('../../inertia/pages/boats/engine_part_show.vue'))['default']>
    'boats/engine_show': ExtractProps<(typeof import('../../inertia/pages/boats/engine_show.vue'))['default']>
    'boats/index': ExtractProps<(typeof import('../../inertia/pages/boats/index.vue'))['default']>
    'boats/navigation': ExtractProps<(typeof import('../../inertia/pages/boats/navigation.vue'))['default']>
    'boats/new': ExtractProps<(typeof import('../../inertia/pages/boats/new.vue'))['default']>
    'boats/reservations': ExtractProps<(typeof import('../../inertia/pages/boats/reservations.vue'))['default']>
    'boats/rig_edit': ExtractProps<(typeof import('../../inertia/pages/boats/rig_edit.vue'))['default']>
    'boats/sail_edit': ExtractProps<(typeof import('../../inertia/pages/boats/sail_edit.vue'))['default']>
    'boats/show': ExtractProps<(typeof import('../../inertia/pages/boats/show.vue'))['default']>
    'boats/simulator': ExtractProps<(typeof import('../../inertia/pages/boats/simulator.vue'))['default']>
    'clients/index': ExtractProps<(typeof import('../../inertia/pages/clients/index.vue'))['default']>
    'clients/show': ExtractProps<(typeof import('../../inertia/pages/clients/show.vue'))['default']>
    'dashboard': ExtractProps<(typeof import('../../inertia/pages/dashboard.vue'))['default']>
    'design_system': ExtractProps<(typeof import('../../inertia/pages/design_system.vue'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.vue'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.vue'))['default']>
    'home': ExtractProps<(typeof import('../../inertia/pages/home.vue'))['default']>
    'invitations/accept': ExtractProps<(typeof import('../../inertia/pages/invitations/accept.vue'))['default']>
    'invoices/form': ExtractProps<(typeof import('../../inertia/pages/invoices/form.vue'))['default']>
    'invoices/index': ExtractProps<(typeof import('../../inertia/pages/invoices/index.vue'))['default']>
    'invoices/show': ExtractProps<(typeof import('../../inertia/pages/invoices/show.vue'))['default']>
    'maintenance/history': ExtractProps<(typeof import('../../inertia/pages/maintenance/history.vue'))['default']>
    'marketing/about': ExtractProps<(typeof import('../../inertia/pages/marketing/about.vue'))['default']>
    'marketing/contact': ExtractProps<(typeof import('../../inertia/pages/marketing/contact.vue'))['default']>
    'marketing/guide': ExtractProps<(typeof import('../../inertia/pages/marketing/guide.vue'))['default']>
    'marketing/home': ExtractProps<(typeof import('../../inertia/pages/marketing/home.vue'))['default']>
    'marketing/pricing': ExtractProps<(typeof import('../../inertia/pages/marketing/pricing.vue'))['default']>
    'marketing/simulator_share': ExtractProps<(typeof import('../../inertia/pages/marketing/simulator_share.vue'))['default']>
    'marketing/simulator': ExtractProps<(typeof import('../../inertia/pages/marketing/simulator.vue'))['default']>
    'navigation/fuel': ExtractProps<(typeof import('../../inertia/pages/navigation/fuel.vue'))['default']>
    'navigation/incidents': ExtractProps<(typeof import('../../inertia/pages/navigation/incidents.vue'))['default']>
    'navigation/logbook': ExtractProps<(typeof import('../../inertia/pages/navigation/logbook.vue'))['default']>
    'notifications/index': ExtractProps<(typeof import('../../inertia/pages/notifications/index.vue'))['default']>
    'organization/crew': ExtractProps<(typeof import('../../inertia/pages/organization/crew.vue'))['default']>
    'organization/members': ExtractProps<(typeof import('../../inertia/pages/organization/members.vue'))['default']>
    'planning/index': ExtractProps<(typeof import('../../inertia/pages/planning/index.vue'))['default']>
    'ports/edit': ExtractProps<(typeof import('../../inertia/pages/ports/edit.vue'))['default']>
    'ports/index': ExtractProps<(typeof import('../../inertia/pages/ports/index.vue'))['default']>
    'ports/new': ExtractProps<(typeof import('../../inertia/pages/ports/new.vue'))['default']>
    'ports/show': ExtractProps<(typeof import('../../inertia/pages/ports/show.vue'))['default']>
    'pricing/seasons/index': ExtractProps<(typeof import('../../inertia/pages/pricing/seasons/index.vue'))['default']>
    'reservations/index': ExtractProps<(typeof import('../../inertia/pages/reservations/index.vue'))['default']>
    'settings/ai': ExtractProps<(typeof import('../../inertia/pages/settings/ai.vue'))['default']>
    'settings/audit_log': ExtractProps<(typeof import('../../inertia/pages/settings/audit_log.vue'))['default']>
    'settings/billing': ExtractProps<(typeof import('../../inertia/pages/settings/billing.vue'))['default']>
    'settings/branding': ExtractProps<(typeof import('../../inertia/pages/settings/branding.vue'))['default']>
    'settings/import': ExtractProps<(typeof import('../../inertia/pages/settings/import.vue'))['default']>
    'settings/index': ExtractProps<(typeof import('../../inertia/pages/settings/index.vue'))['default']>
    'settings/me': ExtractProps<(typeof import('../../inertia/pages/settings/me.vue'))['default']>
    'settings/members': ExtractProps<(typeof import('../../inertia/pages/settings/members.vue'))['default']>
    'settings/org': ExtractProps<(typeof import('../../inertia/pages/settings/org.vue'))['default']>
  }
}
