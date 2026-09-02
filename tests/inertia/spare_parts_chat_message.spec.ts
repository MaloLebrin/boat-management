import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

import SparePartsChatMessage from '../../inertia/components/spare_parts/chat/SparePartsChatMessage.vue'

test('renders a user message with the app-tone label', () => {
  const w = mount(SparePartsChatMessage, {
    props: { message: { role: 'user' as const, content: 'Je cherche une turbine' } },
  })
  expect(w.text()).toContain('parts.ai.chatYou')
  expect(w.text()).toContain('Je cherche une turbine')
})

test('renders an assistant message with the assistant label', () => {
  const w = mount(SparePartsChatMessage, {
    props: { message: { role: 'assistant' as const, content: 'Quel est le numéro de série ?' } },
  })
  expect(w.text()).toContain('parts.ai.chatAssistant')
  expect(w.text()).toContain('Quel est le numéro de série ?')
})
