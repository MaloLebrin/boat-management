import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import type { PublicPartSearchConversationProps } from '../../shared/types/spare_part_chat'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string>) =>
      key + (params ? `:${JSON.stringify(params)}` : ''),
  }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDate: (d: string) => `date(${d})` }),
}))

const routerPost = vi.fn()
vi.mock('@inertiajs/vue3', () => ({
  router: { post: (...args: unknown[]) => routerPost(...args) },
  usePage: () => ({ props: {} }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Link: {
    props: ['href'],
    template: '<a :href="href"><slot /></a>',
  },
}))

import PartsAiChatPanel from '../../inertia/components/marketing/parts_ai/PartsAiChatPanel.vue'

const QUOTA = { used: 0, limit: 2 }

function makeConversation(
  overrides: Partial<PublicPartSearchConversationProps> = {}
): PublicPartSearchConversationProps {
  return {
    token: 'feedface0001',
    status: 'active',
    phase: 'engine',
    messages: [
      { role: 'user', content: 'Je cherche une turbine.' },
      { role: 'assistant', content: 'Quel est le numéro de série ?' },
    ],
    result: null,
    identificationFailed: false,
    engine: { brand: 'Yamaha', model: null, catalogBrandSlug: 'yamaha' },
    ...overrides,
  }
}

test('without a conversation, the composer starts with brand and serial fields', () => {
  const w = mount(PartsAiChatPanel, {
    props: { conversation: null, quota: QUOTA, isAuthenticated: false },
  })

  expect(w.find('input[name="brand"]').exists()).toBe(true)
  expect(w.find('input[name="serialNumber"]').exists()).toBe(true)
  expect(w.text()).toContain('publicPartSearch.composer_start')
})

test('starting a conversation posts to the public route with the free-text context', async () => {
  routerPost.mockClear()
  const w = mount(PartsAiChatPanel, {
    props: { conversation: null, quota: QUOTA, isAuthenticated: false },
  })

  await w.find('input[name="brand"]').setValue('Yamaha')
  await w.find('input[name="serialNumber"]').setValue('6E0-S-123456')
  await w.find('textarea[name="message"]').setValue('Je cherche la turbine.')
  await w.find('form').trigger('submit')

  expect(routerPost).toHaveBeenCalledWith(
    '/parts-ai/conversations',
    { message: 'Je cherche la turbine.', brand: 'Yamaha', serialNumber: '6E0-S-123456' },
    expect.objectContaining({
      preserveScroll: true,
      only: ['conversation', 'quota', 'errors', 'flash'],
    })
  )
})

test('a reply posts to the conversation token without context fields', async () => {
  routerPost.mockClear()
  const w = mount(PartsAiChatPanel, {
    props: { conversation: makeConversation(), quota: QUOTA, isAuthenticated: false },
  })

  expect(w.find('input[name="brand"]').exists()).toBe(false)
  await w.find('textarea[name="message"]').setValue('Le code plaque est 6E0.')
  await w.find('form').trigger('submit')

  expect(routerPost).toHaveBeenCalledWith(
    '/parts-ai/conversations/feedface0001/messages',
    { message: 'Le code plaque est 6E0.' },
    expect.objectContaining({ preserveScroll: true })
  )
})

test('an identification failure shows the static fallback, never an LLM text', () => {
  const w = mount(PartsAiChatPanel, {
    props: {
      conversation: makeConversation({ phase: 'part', identificationFailed: true }),
      quota: QUOTA,
      isAuthenticated: false,
    },
  })

  expect(w.text()).toContain('publicPartSearch.identification_failed_title')
  expect(w.text()).toContain('publicPartSearch.identification_failed_text')
})

test('a completed conversation offers a new search while the quota allows it', () => {
  const w = mount(PartsAiChatPanel, {
    props: {
      conversation: makeConversation({
        status: 'completed',
        phase: 'part',
        result: { partKey: null, reference: null },
      }),
      quota: { used: 1, limit: 2 },
      isAuthenticated: false,
    },
  })

  expect(w.text()).toContain('publicPartSearch.new_conversation')

  const exhausted = mount(PartsAiChatPanel, {
    props: {
      conversation: makeConversation({
        status: 'completed',
        phase: 'part',
        result: { partKey: null, reference: null },
      }),
      quota: { used: 2, limit: 2 },
      isAuthenticated: false,
    },
  })
  expect(exhausted.text()).not.toContain('publicPartSearch.new_conversation')
})
