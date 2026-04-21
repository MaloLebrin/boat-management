import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router.get('/', [controllers.Home, 'index']).as('home')
router.on('/design-system').renderInertia('design_system', {}).as('design_system')
