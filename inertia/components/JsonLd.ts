import { defineComponent, h } from 'vue'

export default defineComponent({
  props: {
    schema: { type: String, required: true },
  },
  render() {
    return h('script', { type: 'application/ld+json', innerHTML: this.schema })
  },
})
