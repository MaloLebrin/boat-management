/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router.on('/').renderInertia('home', {}).as('home')

router
  .group(() => {
    router.get('boats', [controllers.Boats, 'index']).as('boats.index')
    router.get('boats/new', [controllers.Boats, 'create']).as('boats.create')
    router.post('boats', [controllers.Boats, 'store']).as('boats.store')
    router.get('boats/:id', [controllers.Boats, 'show']).as('boats.show')
    router.get('boats/:id/edit', [controllers.Boats, 'edit']).as('boats.edit')
    router.put('boats/:id', [controllers.Boats, 'update']).as('boats.update')
    router.delete('boats/:id', [controllers.Boats, 'destroy']).as('boats.destroy')
  })
  .use(middleware.auth())

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])
  })
  .use(middleware.auth())
