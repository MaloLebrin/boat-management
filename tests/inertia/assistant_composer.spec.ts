import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import AssistantComposer from '../../inertia/components/assistant/AssistantComposer.vue'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      appT: {
        'assistant.composerPlaceholder': 'Posez votre question…',
        'assistant.composerStart': 'Démarrer la conversation',
        'assistant.composerSend': 'Envoyer',
      },
      locale: 'fr',
    },
  }),
}))

function mountComposer(
  props: Partial<{ mode: 'start' | 'reply'; processing: boolean; disabled: boolean }> = {}
) {
  return mount(AssistantComposer, {
    props: { mode: 'start', processing: false, disabled: false, ...props },
  })
}

describe('AssistantComposer', () => {
  test('émet submit avec le message saisi puis vide le champ', async () => {
    const wrapper = mountComposer()
    await wrapper.find('textarea').setValue('  Quelles maintenances sont urgentes ?  ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toEqual([['Quelles maintenances sont urgentes ?']])
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('')
  })

  test('Entrée envoie, Maj+Entrée non', async () => {
    const wrapper = mountComposer()
    await wrapper.find('textarea').setValue('Bonjour')
    await wrapper.find('textarea').trigger('keydown', { key: 'Enter', shiftKey: true })
    expect(wrapper.emitted('submit')).toBeUndefined()

    await wrapper.find('textarea').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('submit')).toEqual([['Bonjour']])
  })

  test("n'émet rien quand le message est vide", async () => {
    const wrapper = mountComposer()
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  test('désactivé pendant le traitement ou une action en attente', async () => {
    for (const props of [{ processing: true }, { disabled: true }]) {
      const wrapper = mountComposer(props)
      expect(wrapper.find('textarea').attributes('disabled')).toBeDefined()
      await wrapper.find('textarea').setValue('Bonjour')
      await wrapper.find('form').trigger('submit')
      expect(wrapper.emitted('submit')).toBeUndefined()
    }
  })
})
