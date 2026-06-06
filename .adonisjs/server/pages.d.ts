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
    'boats/edit': ExtractProps<(typeof import('../../inertia/pages/boats/edit.vue'))['default']>
    'boats/engine_edit': ExtractProps<(typeof import('../../inertia/pages/boats/engine_edit.vue'))['default']>
    'boats/engine_part_show': ExtractProps<(typeof import('../../inertia/pages/boats/engine_part_show.vue'))['default']>
    'boats/engine_show': ExtractProps<(typeof import('../../inertia/pages/boats/engine_show.vue'))['default']>
    'boats/index': ExtractProps<(typeof import('../../inertia/pages/boats/index.vue'))['default']>
    'boats/new': ExtractProps<(typeof import('../../inertia/pages/boats/new.vue'))['default']>
    'boats/rig_edit': ExtractProps<(typeof import('../../inertia/pages/boats/rig_edit.vue'))['default']>
    'boats/sail_edit': ExtractProps<(typeof import('../../inertia/pages/boats/sail_edit.vue'))['default']>
    'boats/show': ExtractProps<(typeof import('../../inertia/pages/boats/show.vue'))['default']>
    'dashboard': ExtractProps<(typeof import('../../inertia/pages/dashboard.vue'))['default']>
    'design_system': ExtractProps<(typeof import('../../inertia/pages/design_system.vue'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.vue'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.vue'))['default']>
    'home': ExtractProps<(typeof import('../../inertia/pages/home.vue'))['default']>
    'invitations/accept': ExtractProps<(typeof import('../../inertia/pages/invitations/accept.vue'))['default']>
    'maintenance/history': ExtractProps<(typeof import('../../inertia/pages/maintenance/history.vue'))['default']>
    'marketing/about': ExtractProps<(typeof import('../../inertia/pages/marketing/about.vue'))['default']>
    'marketing/contact': ExtractProps<(typeof import('../../inertia/pages/marketing/contact.vue'))['default']>
    'marketing/home': ExtractProps<(typeof import('../../inertia/pages/marketing/home.vue'))['default']>
    'marketing/pricing': ExtractProps<(typeof import('../../inertia/pages/marketing/pricing.vue'))['default']>
    'organization/members': ExtractProps<(typeof import('../../inertia/pages/organization/members.vue'))['default']>
    'planning/index': ExtractProps<(typeof import('../../inertia/pages/planning/index.vue'))['default']>
    'ports/edit': ExtractProps<(typeof import('../../inertia/pages/ports/edit.vue'))['default']>
    'ports/index': ExtractProps<(typeof import('../../inertia/pages/ports/index.vue'))['default']>
    'ports/new': ExtractProps<(typeof import('../../inertia/pages/ports/new.vue'))['default']>
    'ports/show': ExtractProps<(typeof import('../../inertia/pages/ports/show.vue'))['default']>
    'settings/billing': ExtractProps<(typeof import('../../inertia/pages/settings/billing.vue'))['default']>
    'settings/index': ExtractProps<(typeof import('../../inertia/pages/settings/index.vue'))['default']>
    'settings/me': ExtractProps<(typeof import('../../inertia/pages/settings/me.vue'))['default']>
    'settings/members': ExtractProps<(typeof import('../../inertia/pages/settings/members.vue'))['default']>
    'settings/org': ExtractProps<(typeof import('../../inertia/pages/settings/org.vue'))['default']>
    'marketing/simulator': ExtractProps<(typeof import('../../inertia/pages/marketing/simulator.vue'))['default']>
  }
}
