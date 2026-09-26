import { describe, expect, it } from 'vitest'
import { createApp, createSSRApp, h } from 'vue'
import { pickVueAppFactory } from '~/utils/vue_app_factory'

describe('pickVueAppFactory (#835)', () => {
  it('hydrate avec createSSRApp quand le conteneur contient du HTML serveur', () => {
    const el = document.createElement('div')
    el.innerHTML = '<!--[--><main>SSR</main><!--]-->'

    expect(pickVueAppFactory(el)).toBe(createSSRApp)
  })

  it('monte avec createApp quand le conteneur est vide (SSR désactivé)', () => {
    const el = document.createElement('div')

    expect(pickVueAppFactory(el)).toBe(createApp)
  })

  it('hydrate réellement le HTML serveur sans le remplacer', () => {
    const el = document.createElement('div')
    el.innerHTML = '<p data-ssr="1">Bonjour</p>'
    const ssrNode = el.firstElementChild

    const app = pickVueAppFactory(el)({ render: () => h('p', { 'data-ssr': '1' }, 'Bonjour') })
    app.mount(el)

    expect(el.firstElementChild).toBe(ssrNode)
    app.unmount()
  })
})
