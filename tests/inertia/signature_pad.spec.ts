import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key, locale: { value: 'en' } }),
}))

import SignaturePad from '../../inertia/components/reservations/inspection/SignaturePad.vue'

/** Pad de signature de l'état des lieux (#889) — jsdom n'a pas de canvas : on le simule. */
describe('SignaturePad (#889)', () => {
  const DATA_URL = 'data:image/png;base64,AAAA'
  let ctx: Record<string, ReturnType<typeof vi.fn> | unknown>

  beforeEach(() => {
    ctx = {
      scale: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(DATA_URL)
  })

  afterEach(() => vi.restoreAllMocks())

  function mountPad(props: Record<string, unknown> = {}) {
    return mount(SignaturePad, {
      props: { id: 'pad', label: 'Client', modelValue: null, ...props },
      global: { stubs: { BaseButton: { template: '<button v-bind="$attrs"><slot /></button>' } } },
    })
  }

  async function draw(wrapper: ReturnType<typeof mountPad>) {
    const canvas = wrapper.find('canvas')
    await canvas.trigger('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 })
    await canvas.trigger('pointermove', { clientX: 40, clientY: 30, pointerId: 1 })
    await canvas.trigger('pointerup', { pointerId: 1 })
  }

  test('a stroke emits the PNG of the drawing', async () => {
    const wrapper = mountPad()
    await draw(wrapper)

    expect(ctx.lineTo).toHaveBeenCalledWith(40, 30)
    expect(wrapper.emitted('update:modelValue')).toEqual([[DATA_URL]])
  })

  test('moving without pressing draws nothing', async () => {
    const wrapper = mountPad()
    await wrapper.find('canvas').trigger('pointermove', { clientX: 40, clientY: 30 })
    await wrapper.find('canvas').trigger('pointerup')

    expect(ctx.lineTo).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  test('clear empties the pad and the model', async () => {
    const wrapper = mountPad({ modelValue: DATA_URL })
    await wrapper.find('button').trigger('click')

    expect(ctx.clearRect).toHaveBeenCalled()
    expect(wrapper.emitted('update:modelValue')).toEqual([[null]])
  })

  test('a disabled pad ignores the pen', async () => {
    const wrapper = mountPad({ disabled: true })
    await draw(wrapper)

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  test('the canvas is labelled for assistive technologies', () => {
    const wrapper = mountPad({ error: 'Required' })
    expect(wrapper.find('canvas').attributes('aria-labelledby')).toBe('pad-label')
    expect(wrapper.find('#pad-label').text()).toBe('Client')
    expect(wrapper.find('[role="alert"]').text()).toBe('Required')
  })
})
