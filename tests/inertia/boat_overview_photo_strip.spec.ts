import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import BoatOverviewPhotoStrip from '../../inertia/components/boats/show/tabs/overview/BoatOverviewPhotoStrip.vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}(${JSON.stringify(params)})` : k,
  }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template:
      '<button type="button" data-testid="see-all" @click="$emit(\'click\')"><slot /></button>',
    props: ['variant', 'size'],
    emits: ['click'],
  },
}))

function media(id: number, kind: 'photo' | 'document' = 'photo') {
  return {
    id,
    kind,
    secureUrl: `https://cdn.test/${kind}-${id}.jpg`,
    originalFilename: `${kind}-${id}.jpg`,
    format: 'jpg',
    bytes: 1024,
    width: 800,
    height: 600,
    position: id,
    caption: null,
  }
}

function mountStrip(mediaRows: unknown[], canManage = true) {
  return mount(BoatOverviewPhotoStrip, {
    props: { boat: { id: 3, media: mediaRows }, canManage } as never,
  })
}

describe('BoatOverviewPhotoStrip (#811)', () => {
  test('shows at most 4 thumbnails, in position order', () => {
    const rows = Array.from({ length: 17 }, (_, i) => media(17 - i))
    const wrapper = mountStrip(rows)

    const srcs = wrapper.findAll('img').map((img) => img.attributes('src'))
    expect(srcs).toEqual([1, 2, 3, 4].map((id) => `https://cdn.test/photo-${id}.jpg`))
  })

  test('the see-all link counts every photo and ignores documents', () => {
    const wrapper = mountStrip([media(1), media(2), media(3, 'document')])

    expect(wrapper.findAll('img')).toHaveLength(2)
    expect(wrapper.find('[data-testid="see-all"]').text()).toBe(
      'boats.show.overview.viewAllPhotos({"count":"2"})'
    )
  })

  test('the see-all link and thumbnails open the photos tab', async () => {
    const wrapper = mountStrip([media(1), media(2)])

    await wrapper.find('[data-testid="see-all"]').trigger('click')
    await wrapper.findAll('img')[1].element.parentElement!.click()

    expect(wrapper.emitted('go-to-tab')).toEqual([['photos'], ['photos']])
  })

  test('without photos, a manager gets an add tile leading to the photos tab', async () => {
    const wrapper = mountStrip([media(1, 'document')])

    expect(wrapper.find('[data-testid="see-all"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('boats.show.mediaUpload.addPhoto')
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('go-to-tab')).toEqual([['photos']])
  })

  test('without photos, a read-only user sees nothing', () => {
    const wrapper = mountStrip([], false)

    expect(wrapper.find('[data-testid="boat-overview-photo-strip"]').exists()).toBe(false)
  })

  test('new keys are translated in both locales', () => {
    for (const locale of ['en', 'fr'] as const) {
      const json = JSON.parse(
        readFileSync(resolve(__dirname, `../../resources/lang/${locale}/boats.json`), 'utf8')
      )
      expect(json.show.tabs.photos, `tabs.photos (${locale})`).toBeTruthy()
      expect(json.show.overview.viewAllPhotos, `viewAllPhotos (${locale})`).toContain('{count}')
    }
  })
})
