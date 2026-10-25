import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'
import BaseCopyField from '../../inertia/components/base/BaseCopyField.vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

afterEach(() => vi.unstubAllGlobals())

describe('BaseCopyField (#1018)', () => {
  test('shows a readonly value with its label and hint', () => {
    const w = mount(BaseCopyField, {
      props: { modelValue: 'https://x.test', label: 'Adresse', hint: 'Aide', name: 'addr' },
    })
    const input = w.find('input')
    expect((input.element as HTMLInputElement).value).toBe('https://x.test')
    expect(input.attributes('readonly')).toBeDefined()
    expect(input.attributes('name')).toBe('addr')
    expect(w.text()).toContain('Adresse')
    expect(w.text()).toContain('Aide')
  })

  test('copies the value and switches the label to « copied »', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const w = mount(BaseCopyField, { props: { modelValue: 'abc' } })
    expect(w.find('button').text()).toBe('common.clipboard.copy')
    await w.find('button').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('abc')
    expect(w.find('button').text()).toBe('common.clipboard.copied')
  })

  test('secret hides the value in a password field', () => {
    const w = mount(BaseCopyField, { props: { modelValue: 's3cret', secret: true } })
    expect(w.find('input').attributes('type')).toBe('password')
  })

  test('without clipboard support, the button is disabled and a hint says why', async () => {
    vi.stubGlobal('navigator', {})
    const w = mount(BaseCopyField, { props: { modelValue: 'abc' } })
    await flushPromises()
    expect(w.find('button').attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('common.clipboard.unavailable')
  })
})
