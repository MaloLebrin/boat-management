import router from '@adonisjs/core/services/router'

router.on('/').renderInertia('home', {}).as('home')
router.on('/design-system').renderInertia('design_system', {}).as('design_system')
