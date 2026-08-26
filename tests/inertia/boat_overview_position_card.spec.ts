import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import BoatOverviewPositionCard from '../../inertia/components/boats/show/tabs/overview/BoatOverviewPositionCard.vue'

/**
 * #486 — bouton « Ma position actuelle » : la géolocalisation remplit les deux
 * champs lat/lng (arrondis à 5 décimales) sans soumission automatique, et
 * chaque échec (permission, indisponible, timeout) affiche son propre message.
 */

const mockRouterPost = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  router: { post: mockRouterPost },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/components/base/BaseCard.vue', () => ({
  default: { template: '<div><slot /></div>', props: ['padded'] },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template:
      '<button :type="type" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled', 'route'],
    // sans emits déclaré, le clic natif remonte en plus du $emit et le
    // toggle showForm bascule deux fois
    emits: ['click'],
  },
}))

vi.mock('~/components/base/BaseInput.vue', () => ({
  default: {
    template:
      '<label>{{ label }}<input :name="name" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></label>',
    props: ['id', 'name', 'label', 'inputmode', 'modelValue', 'errors'],
  },
}))

const GEO_ERROR = { PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }

const mockGetCurrentPosition = vi.fn()

const baseProps = {
  positionLabel: null,
  boatId: 7,
  canManage: true,
  latestGpsPosition: null,
}

async function mountWithOpenForm() {
  const wrapper = mount(BoatOverviewPositionCard, { props: baseProps })
  // Ouvre le formulaire manuel (bouton « Set GPS position »)
  await wrapper.find('button').trigger('click')
  return wrapper
}

function geoButton(wrapper: Awaited<ReturnType<typeof mountWithOpenForm>>) {
  return wrapper
    .findAll('button')
    .find((b) => b.text().includes('boats.show.position.useCurrentPosition'))!
}

describe('BoatOverviewPositionCard — géolocalisation (#486)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: { getCurrentPosition: mockGetCurrentPosition },
      configurable: true,
    })
  })

  test('fills both fields rounded to 5 decimals and shows accuracy on success', async () => {
    mockGetCurrentPosition.mockImplementation((onSuccess) => {
      onSuccess({
        coords: { latitude: 43.2965123456, longitude: 5.3698123456, accuracy: 8.4 },
      })
    })
    const wrapper = await mountWithOpenForm()

    await geoButton(wrapper).trigger('click')

    const inputs = wrapper.findAll('input')
    expect((inputs[0].element as HTMLInputElement).value).toBe('43.29651')
    expect((inputs[1].element as HTMLInputElement).value).toBe('5.36981')
    expect(wrapper.text()).toContain('boats.show.position.geoAccuracy')
    expect(mockGetCurrentPosition.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: true })
  })

  test('does not auto-submit after a successful fix', async () => {
    mockGetCurrentPosition.mockImplementation((onSuccess) => {
      onSuccess({ coords: { latitude: 43.1, longitude: 5.2, accuracy: 5 } })
    })
    const wrapper = await mountWithOpenForm()

    await geoButton(wrapper).trigger('click')

    expect(mockRouterPost).not.toHaveBeenCalled()
  })

  test('shows the permission message and leaves fields untouched when denied', async () => {
    mockGetCurrentPosition.mockImplementation((_onSuccess, onError) => {
      onError({ code: 1, ...GEO_ERROR })
    })
    const wrapper = await mountWithOpenForm()

    await geoButton(wrapper).trigger('click')

    expect(wrapper.text()).toContain('boats.show.position.geoPermissionDenied')
    const inputs = wrapper.findAll('input')
    expect((inputs[0].element as HTMLInputElement).value).toBe('')
    expect((inputs[1].element as HTMLInputElement).value).toBe('')
  })

  test('shows the timeout message when the request times out', async () => {
    mockGetCurrentPosition.mockImplementation((_onSuccess, onError) => {
      onError({ code: 3, ...GEO_ERROR })
    })
    const wrapper = await mountWithOpenForm()

    await geoButton(wrapper).trigger('click')

    expect(wrapper.text()).toContain('boats.show.position.geoTimeout')
  })

  test('shows the unavailable message for other errors', async () => {
    mockGetCurrentPosition.mockImplementation((_onSuccess, onError) => {
      onError({ code: 2, ...GEO_ERROR })
    })
    const wrapper = await mountWithOpenForm()

    await geoButton(wrapper).trigger('click')

    expect(wrapper.text()).toContain('boats.show.position.geoUnavailable')
  })

  test('a new attempt clears the previous error', async () => {
    mockGetCurrentPosition.mockImplementationOnce((_onSuccess, onError) => {
      onError({ code: 3, ...GEO_ERROR })
    })
    mockGetCurrentPosition.mockImplementationOnce((onSuccess) => {
      onSuccess({ coords: { latitude: 43.1, longitude: 5.2, accuracy: 12 } })
    })
    const wrapper = await mountWithOpenForm()

    await geoButton(wrapper).trigger('click')
    expect(wrapper.text()).toContain('boats.show.position.geoTimeout')

    await geoButton(wrapper).trigger('click')
    expect(wrapper.text()).not.toContain('boats.show.position.geoTimeout')
    expect(wrapper.text()).toContain('boats.show.position.geoAccuracy')
  })

  test('hides the geolocation button when the API is unsupported', async () => {
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: undefined,
      configurable: true,
    })
    const wrapper = await mountWithOpenForm()

    const btn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('boats.show.position.useCurrentPosition'))
    expect(btn).toBeUndefined()
  })

  test('geolocation keys are translated in both locales', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    for (const locale of ['en', 'fr'] as const) {
      const json = JSON.parse(
        readFileSync(resolve(__dirname, `../../resources/lang/${locale}/boats.json`), 'utf8')
      ) as { show: { position: Record<string, string> } }
      for (const key of [
        'useCurrentPosition',
        'locating',
        'geoAccuracy',
        'geoPermissionDenied',
        'geoUnavailable',
        'geoTimeout',
      ]) {
        expect(json.show.position[key], `boats.show.position.${key} (${locale})`).toBeTruthy()
      }
    }
  })
})
