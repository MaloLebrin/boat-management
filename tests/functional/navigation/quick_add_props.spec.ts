import { PortFactory } from '#database/factories/port_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

test.group('Navigation & dashboard quick-add props (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /navigation/logbook exposes portOptions and canCreateNavigationLogs for an org member', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get('/navigation/logbook').loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as {
      portOptions: { id: number; name: string }[]
      canCreateNavigationLogs: boolean
    }

    assert.isTrue(props.canCreateNavigationLogs)
    assert.sameMembers(
      props.portOptions.map((p) => p.id),
      [port.id]
    )
  })

  test('GET /navigation/incidents exposes canCreateIncidents for an org member', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()

    const response = await client.get('/navigation/incidents').loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as { canCreateIncidents: boolean }
    assert.isTrue(props.canCreateIncidents)
  })

  test('GET /dashboard exposes portOptions, canCreateNavigationLogs and canCreateIncidents for an org member', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get('/dashboard').loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as {
      portOptions: { id: number; name: string }[]
      canCreateNavigationLogs: boolean
      canCreateIncidents: boolean
    }

    assert.isTrue(props.canCreateNavigationLogs)
    assert.isTrue(props.canCreateIncidents)
    assert.sameMembers(
      props.portOptions.map((p) => p.id),
      [port.id]
    )
  })

  test('a user with no organization gets canCreateNavigationLogs/canCreateIncidents false and no port options', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()

    const logbookResponse = await client.get('/navigation/logbook').loginAs(user).withInertia()
    logbookResponse.assertStatus(200)
    const logbookProps = logbookResponse.inertiaProps as {
      portOptions: unknown[]
      canCreateNavigationLogs: boolean
    }
    assert.isFalse(logbookProps.canCreateNavigationLogs)
    assert.lengthOf(logbookProps.portOptions, 0)

    const incidentsResponse = await client.get('/navigation/incidents').loginAs(user).withInertia()
    incidentsResponse.assertStatus(200)
    const incidentsProps = incidentsResponse.inertiaProps as { canCreateIncidents: boolean }
    assert.isFalse(incidentsProps.canCreateIncidents)

    const dashboardResponse = await client.get('/dashboard').loginAs(user).withInertia()
    dashboardResponse.assertStatus(200)
    const dashboardProps = dashboardResponse.inertiaProps as {
      canCreateNavigationLogs: boolean
      canCreateIncidents: boolean
    }
    assert.isFalse(dashboardProps.canCreateNavigationLogs)
    assert.isFalse(dashboardProps.canCreateIncidents)
  })
})
