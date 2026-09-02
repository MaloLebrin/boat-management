import { aiThrottle } from '#start/limiter'
import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const BoatEngineSparePartsController = () =>
  import('#controllers/boat_engine_spare_parts_controller')
const SparePartChatController = () => import('#controllers/spare_part_chat_controller')

router
  .group(() => {
    router.get('spare-parts', [BoatEngineSparePartsController, 'index']).as('spareParts.index')

    router
      .get('boats/:boatId/engines/:engineId/spare-parts', [
        BoatEngineSparePartsController,
        'identify',
      ])
      .as('spareParts.identify')
    router
      .get('boats/:boatId/engines/:engineId/spare-parts/assemblies/:assemblySlug', [
        BoatEngineSparePartsController,
        'assembly',
      ])
      .where('assemblySlug', /^[a-z-]+$/)
      .as('spareParts.assembly')

    // Chat IA de recherche de références par numéro de série (#634). Les
    // mutations déclenchent un appel Mistral synchrone → même throttle que les
    // routes IA authentifiées.
    router
      .get('boats/:boatId/engines/:engineId/spare-parts/chat', [SparePartChatController, 'show'])
      .as('spareParts.chat.show')
    router
      .post('boats/:boatId/engines/:engineId/spare-parts/chat/conversations', [
        SparePartChatController,
        'start',
      ])
      .as('spareParts.chat.start')
      .use(aiThrottle)
    router
      .post('boats/:boatId/engines/:engineId/spare-parts/chat/conversations/:token/messages', [
        SparePartChatController,
        'message',
      ])
      .as('spareParts.chat.message')
      .use(aiThrottle)

    router
      .post('boats/:boatId/engines/:engineId/spare-parts/cart', [
        BoatEngineSparePartsController,
        'addCartItem',
      ])
      .as('spareParts.cart.add')
    router
      .patch('boats/:boatId/engines/:engineId/spare-parts/cart/:itemId', [
        BoatEngineSparePartsController,
        'updateCartItem',
      ])
      .where('itemId', router.matchers.number())
      .as('spareParts.cart.update')
    router
      .delete('boats/:boatId/engines/:engineId/spare-parts/cart/:itemId', [
        BoatEngineSparePartsController,
        'removeCartItem',
      ])
      .where('itemId', router.matchers.number())
      .as('spareParts.cart.remove')
    router
      .get('boats/:boatId/engines/:engineId/spare-parts/cart/export', [
        BoatEngineSparePartsController,
        'exportCart',
      ])
      .as('spareParts.cart.export')
  })
  .use(middleware.auth())
