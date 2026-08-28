import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const BoatEngineSparePartsController = () =>
  import('#controllers/boat_engine_spare_parts_controller')

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
