import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'
import BaseCodeBlock from '../../inertia/components/base/BaseCodeBlock.vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

afterEach(() => vi.unstubAllGlobals())

describe('BaseCodeBlock (#1018)', () => {
  test('renders the code in pre/code with label, language and caption slot', () => {
    const w = mount(BaseCodeBlock, {
      props: { code: 'npm i foo', language: 'bash', label: 'Commande' },
      slots: { caption: 'Collez dans le terminal' },
    })
    expect(w.find('pre code').text()).toBe('npm i foo')
    expect(w.find('code').attributes('data-language')).toBe('bash')
    expect(w.text()).toContain('Commande')
    expect(w.text()).toContain('Collez dans le terminal')
  })

  test('scrolls horizontally by default and wraps with `wrap`', () => {
    const plain = mount(BaseCodeBlock, { props: { code: 'x' } })
    expect(plain.find('pre').classes()).toContain('overflow-x-auto')
    const wrapped = mount(BaseCodeBlock, { props: { code: 'x', wrap: true } })
    expect(wrapped.find('pre').classes()).toContain('whitespace-pre-wrap')
  })

  test('copies the exact code', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const w = mount(BaseCodeBlock, { props: { code: 'line1\nline2' } })
    await w.find('button').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('line1\nline2')
    expect(w.find('button').text()).toBe('common.clipboard.copied')
  })

  test('without clipboard support, the button is disabled', async () => {
    vi.stubGlobal('navigator', {})
    const w = mount(BaseCodeBlock, { props: { code: 'x' } })
    await flushPromises()
    expect(w.find('button').attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('common.clipboard.unavailable')
  })
})
