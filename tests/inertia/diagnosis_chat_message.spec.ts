import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

import DiagnosisChatMessage from '../../inertia/components/marketing/diagnosis/DiagnosisChatMessage.vue'

test('renders a user message with the visitor label', () => {
  const w = mount(DiagnosisChatMessage, {
    props: { message: { role: 'user' as const, content: 'Engine stalls after 30 seconds' } },
  })
  expect(w.text()).toContain('publicDiagnosis.chat_you')
  expect(w.text()).toContain('Engine stalls after 30 seconds')
})

test('renders an assistant message with the assistant label', () => {
  const w = mount(DiagnosisChatMessage, {
    props: { message: { role: 'assistant' as const, content: 'Does the tell-tale flow?' } },
  })
  expect(w.text()).toContain('publicDiagnosis.chat_assistant')
  expect(w.text()).toContain('Does the tell-tale flow?')
})
