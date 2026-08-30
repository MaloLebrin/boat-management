import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

import BaseCombobox from '../../inertia/components/base/BaseCombobox.vue'

const OPTIONS = [
  { value: 'beneteau', label: 'Bénéteau', hint: 'Voilier monocoque' },
  { value: 'jeanneau', label: 'Jeanneau' },
  { value: 'zodiac', label: 'Zodiac', keywords: ['bombard', 'zodiac nautic'] },
]

function mountCombobox(modelValue = '') {
  return mount(BaseCombobox, {
    props: {
      id: 'brand',
      name: 'manufacturer',
      label: 'Constructeur',
      options: OPTIONS,
      modelValue,
    },
  })
}

test('expose les attributs ARIA d’une combobox', () => {
  const w = mountCombobox()
  const input = w.find('input')

  expect(input.attributes('role')).toBe('combobox')
  expect(input.attributes('aria-expanded')).toBe('false')
  expect(input.attributes('aria-controls')).toBe('brand-listbox')
  expect(w.find('[role="listbox"]').exists()).toBe(true)
})

test('ouvre la liste au focus et propose toutes les options', async () => {
  const w = mountCombobox()
  await w.find('input').trigger('focus')

  expect(w.find('input').attributes('aria-expanded')).toBe('true')
  expect(w.findAll('[role="option"]').length).toBe(3)
})

test('filtre sans tenir compte de la casse ni des accents', async () => {
  const w = mountCombobox('bene')
  await w.find('input').trigger('focus')

  const options = w.findAll('[role="option"]')
  expect(options.length).toBe(1)
  expect(options[0].text()).toContain('Bénéteau')
})

test('un mot-clé remonte l’option sans jamais s’afficher', async () => {
  const w = mountCombobox('bombard')
  await w.find('input').trigger('focus')

  const options = w.findAll('[role="option"]')
  expect(options.length).toBe(1)
  expect(options[0].text()).toContain('Zodiac')
  // Le mot-clé sert la recherche, il n'entre pas dans le libellé affiché.
  expect(options[0].text()).not.toContain('bombard')
})

test('une option sans mot-clé n’est pas remontée par la saisie d’un autre', async () => {
  const w = mountCombobox('bombard')
  await w.find('input').trigger('focus')

  expect(w.text()).not.toContain('Jeanneau')
})

test('émet la saisie brute — une valeur hors catalogue reste acceptée', async () => {
  const w = mountCombobox()
  await w.find('input').setValue('Chantier de mon oncle')

  expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['Chantier de mon oncle'])
  expect(w.emitted('select')).toBeUndefined()

  // Une fois la valeur remontée au parent, aucune option ne correspond : la
  // liste le dit, elle ne bloque pas la saisie.
  await w.setProps({ modelValue: 'Chantier de mon oncle' })
  expect(w.findAll('[role="option"]').length).toBe(0)
})

test('flèche bas puis Entrée retient l’option surlignée', async () => {
  const w = mountCombobox()
  const input = w.find('input')

  await input.trigger('focus')
  await input.trigger('keydown', { key: 'ArrowDown' })
  expect(input.attributes('aria-activedescendant')).toBe('brand-option-0')

  await input.trigger('keydown', { key: 'Enter' })
  expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['Bénéteau'])
  expect(w.emitted('select')?.[0]?.[0]).toMatchObject({ value: 'beneteau' })
})

test('flèche haut boucle sur la dernière option', async () => {
  const w = mountCombobox()
  const input = w.find('input')

  await input.trigger('focus')
  await input.trigger('keydown', { key: 'ArrowUp' })

  expect(input.attributes('aria-activedescendant')).toBe('brand-option-2')
})

test('Entrée sans option surlignée laisse passer la saisie libre', async () => {
  const w = mountCombobox('Chantier inconnu')
  const input = w.find('input')

  await input.trigger('focus')
  await input.trigger('keydown', { key: 'Enter' })

  expect(w.emitted('select')).toBeUndefined()
})

test('Échap referme la liste', async () => {
  const w = mountCombobox()
  const input = w.find('input')

  await input.trigger('focus')
  expect(input.attributes('aria-expanded')).toBe('true')

  await input.trigger('keydown', { key: 'Escape' })
  expect(input.attributes('aria-expanded')).toBe('false')
})

test('un clic sur une option la retient', async () => {
  const w = mountCombobox()
  await w.find('input').trigger('focus')

  await w.findAll('[role="option"]')[2].trigger('mousedown')

  expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['Zodiac'])
  expect(w.emitted('select')?.[0]?.[0]).toMatchObject({ value: 'zodiac' })
})

test('affiche le message de repli quand rien ne correspond', async () => {
  const w = mount(BaseCombobox, {
    props: {
      id: 'brand',
      options: OPTIONS,
      modelValue: 'zzz',
      emptyLabel: 'Aucun constructeur — votre saisie sera conservée',
    },
  })
  await w.find('input').trigger('focus')

  expect(w.text()).toContain('Aucun constructeur — votre saisie sera conservée')
})

test('range les options en sections et n’affiche l’intitulé qu’au changement de groupe', async () => {
  const w = mount(BaseCombobox, {
    props: {
      id: 'brand',
      name: 'manufacturer',
      options: [
        { value: 'yamaha', label: 'Yamaha', group: 'Marques de ce type' },
        { value: 'tohatsu', label: 'Tohatsu', group: 'Marques de ce type' },
        { value: 'yanmar', label: 'Yanmar', group: 'Autres marques' },
      ],
      modelValue: '',
    },
  })
  await w.find('input').trigger('focus')

  const headers = w.findAll('[role="listbox"] li[role="presentation"]')
  expect(headers.map((h) => h.text())).toEqual(['Marques de ce type', 'Autres marques'])
  // Les en-têtes ne sont pas des options : la navigation clavier et le décompte
  // ARIA continuent de ne voir que les trois marques.
  expect(w.findAll('[role="option"]')).toHaveLength(3)
})

test('les en-têtes de section ne perturbent pas la navigation clavier', async () => {
  const w = mount(BaseCombobox, {
    props: {
      id: 'brand',
      options: [
        { value: 'yamaha', label: 'Yamaha', group: 'Marques de ce type' },
        { value: 'yanmar', label: 'Yanmar', group: 'Autres marques' },
      ],
      modelValue: '',
    },
  })
  const input = w.find('input')
  await input.trigger('focus')
  await input.trigger('keydown', { key: 'ArrowDown' })
  await input.trigger('keydown', { key: 'ArrowDown' })
  await input.trigger('keydown', { key: 'Enter' })

  // Deux flèches depuis « rien de surligné » doivent atteindre la 2e marque, et
  // non un en-tête.
  expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['Yanmar'])
})
