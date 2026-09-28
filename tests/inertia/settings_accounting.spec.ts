import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import SettingsAccounting from '../../inertia/components/settings/SettingsAccounting.vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

const formSpies = {
  put: vi.fn(),
  transform: vi.fn().mockReturnThis(),
}

vi.mock('@inertiajs/vue3', async () => {
  return {
    usePage: () => ({ props: { appT: {}, locale: 'en' } }),
    useForm: (data: Record<string, unknown>) => ({
      ...data,
      errors: {},
      processing: false,
      ...formSpies,
    }),
  }
})

const BASE_STUBS = {
  BaseButton: {
    name: 'BaseButton',
    props: ['variant', 'size', 'disabled', 'type'],
    emits: ['click'],
    template:
      '<button data-base-button :type="type ?? \'button\'" :disabled="disabled"><slot /></button>',
  },
  BaseCard: {
    name: 'BaseCard',
    template: '<div data-base-card><slot /></div>',
  },
  BaseInput: {
    name: 'BaseInput',
    props: [
      'label',
      'id',
      'name',
      'modelValue',
      'placeholder',
      'hint',
      'error',
      'maxlength',
      'inputmode',
      'pattern',
    ],
    emits: ['update:modelValue'],
    template:
      '<div data-base-input><input :id="id" :name="name" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
  },
}

function mountComponent(canManage = true) {
  return mount(SettingsAccounting, {
    props: {
      settings: {
        siren: '123456789',
        accounts: {
          sales: '706',
          vat: '44571',
          customers: '411',
          bank: '512',
        },
        canManage,
      },
    },
    global: { stubs: BASE_STUBS },
  })
}

describe('SettingsAccounting — read-only mode', () => {
  test('shows admin-only message when canManage is false', () => {
    const w = mountComponent(false)
    expect(w.text()).toContain('settings.billing.accounting.adminOnly')
    expect(w.find('form').exists()).toBe(false)
  })

  test('shows form when canManage is true', () => {
    const w = mountComponent(true)
    expect(w.find('form').exists()).toBe(true)
    expect(w.text()).not.toContain('settings.billing.accounting.adminOnly')
  })
})

describe('SettingsAccounting — form submission', () => {
  test('submits form with correct data', async () => {
    const w = mountComponent(true)

    const form = w.find('form')
    await form.trigger('submit')

    expect(formSpies.transform).toHaveBeenCalled()
    expect(formSpies.put).toHaveBeenCalledWith('/settings/billing/accounting', {
      preserveScroll: true,
    })
  })

  test('renders all account fields', () => {
    const w = mountComponent(true)

    const inputs = w.findAll('input')
    expect(inputs.length).toBeGreaterThanOrEqual(5) // SIREN + 4 accounts
  })

  test('pre-fills values from props', () => {
    const w = mountComponent(true)

    const inputs = w.findAll('input')
    const values = inputs.map((i) => i.element.value)

    expect(values).toContain('123456789')
    expect(values).toContain('706')
    expect(values).toContain('44571')
    expect(values).toContain('411')
    expect(values).toContain('512')
  })
})

describe('SettingsAccounting — testid', () => {
  test('has testid for targeting', () => {
    const w = mountComponent(true)
    expect(w.find('[data-testid="accounting-settings"]').exists()).toBe(true)
  })
})
