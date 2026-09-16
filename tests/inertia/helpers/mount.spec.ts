import { describe, expect, test, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { router, useForm, usePage } from '@inertiajs/vue3'
import BaseButton from '../../../inertia/components/base/BaseButton.vue'
import BaseInput from '../../../inertia/components/base/BaseInput.vue'
import BaseSelect from '../../../inertia/components/base/BaseSelect.vue'
import BaseBadge from '../../../inertia/components/base/BaseBadge.vue'
import { useT } from '../../../inertia/composables/use_t'
import { forms, formSpies, mountWithStubs, pageState, routerSpies } from './mount'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./inertia_mock')
  return inertiaMock()
})

/** Composant d'essai : un bouton, un champ, une liste, une traduction et une mutation. */
const Probe = defineComponent({
  props: { disabled: { type: Boolean, default: false } },
  setup(props) {
    const { t, locale } = useT()
    const form = useForm({ name: 'initial' })
    const page = usePage()
    return () =>
      h('div', [
        h(
          BaseButton,
          { type: 'submit', disabled: props.disabled, onClick: () => form.post('/probe') },
          () => t('probe.submit')
        ),
        h(BaseInput, {
          'name': 'name',
          'modelValue': form.name,
          'onUpdate:modelValue': (v: string) => (form.name = v),
        }),
        h(BaseSelect, {
          name: 'kind',
          modelValue: 'b',
          options: [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ],
        }),
        h(BaseBadge, { variant: 'warning' }, () => 'badge'),
        h('p', { 'data-locale': locale.value }, String(page.props.currentPlan ?? '')),
        h('button', { 'data-nav': true, 'onClick': () => router.visit('/elsewhere') }),
      ])
  },
})

describe('mountWithStubs — stubs uniformes', () => {
  test('BaseButton forwards type, disabled and click', async () => {
    const enabled = mountWithStubs(Probe)
    const button = enabled.get('[data-base-button]')
    expect(button.attributes('type')).toBe('submit')
    expect(button.attributes('disabled')).toBeUndefined()
    await button.trigger('click')
    expect(formSpies.post).toHaveBeenCalledWith('/probe')

    const disabled = mountWithStubs(Probe, { props: { disabled: true } })
    expect(disabled.get('[data-base-button]').attributes('disabled')).toBeDefined()
    // resetInertiaMock() a remis les espions à zéro entre les deux montages.
    expect(formSpies.post).not.toHaveBeenCalled()
  })

  test('BaseInput and BaseSelect render a native control with name and v-model', async () => {
    const wrapper = mountWithStubs(Probe)
    const input = wrapper.get('input[name="name"]')
    expect((input.element as HTMLInputElement).value).toBe('initial')

    await input.setValue('changed')
    expect(forms.at(-1)?.name).toBe('changed')
    expect(forms.at(-1)?.data()).toEqual({ name: 'changed' })

    const select = wrapper.get('select[name="kind"]').element as HTMLSelectElement
    expect(select.value).toBe('b')
    expect(wrapper.findAll('option').map((o) => o.text())).toEqual(['A', 'B'])
  })

  test('a base stub can be switched off to render the real component', () => {
    const stubbed = mountWithStubs(Probe)
    expect(stubbed.get('[data-base-badge]').attributes('data-variant')).toBe('warning')

    const real = mountWithStubs(Probe, { stubs: { BaseBadge: false } })
    expect(real.find('[data-base-badge]').exists()).toBe(false)
    expect(real.text()).toContain('badge')
  })
})

describe('mountWithStubs — Inertia mocké', () => {
  test('useT() runs for real on top of the mocked page: identity t() and locale', () => {
    const en = mountWithStubs(Probe)
    expect(en.get('[data-base-button]').text()).toBe('probe.submit')
    expect(en.get('p').attributes('data-locale')).toBe('en')

    const fr = mountWithStubs(Probe, { locale: 'fr', pageProps: { currentPlan: 'pro' } })
    expect(fr.get('p').attributes('data-locale')).toBe('fr')
    expect(fr.get('p').text()).toBe('pro')
    expect(pageState.props.currentPlan).toBe('pro')
  })

  test('router calls are captured by routerSpies', async () => {
    const wrapper = mountWithStubs(Probe)
    await wrapper.get('[data-nav]').trigger('click')
    expect(routerSpies.visit).toHaveBeenCalledWith('/elsewhere')
  })
})
