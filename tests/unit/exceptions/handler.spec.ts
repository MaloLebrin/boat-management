import { test } from '@japa/runner'
import HttpExceptionHandler from '#exceptions/handler'

test.group('HttpExceptionHandler statusPages', () => {
  test('maps the 401..403 range to the forbidden Inertia page', async ({ assert }) => {
    const handler = new HttpExceptionHandler()
    // statusPages is protected on the class — read it for the test.
    const statusPages = (handler as any).statusPages

    // assert.property() treats dots as nested-path separators, which breaks on
    // the "401..403" range key — check the own property directly instead.
    assert.isTrue(Object.hasOwn(statusPages, '401..403'))

    let renderedView: string | undefined
    const ctx = {
      inertia: {
        render: (view: string) => {
          renderedView = view
          return 'rendered'
        },
      },
    }

    const result = await statusPages['401..403'](null, ctx)

    assert.equal(renderedView, 'errors/forbidden')
    assert.equal(result, 'rendered')
  })

  test('maps 419 and 429 to their Inertia pages (#864)', async ({ assert }) => {
    const handler = new HttpExceptionHandler()
    const statusPages = (
      handler as unknown as {
        statusPages: Record<string, (error: null, ctx: unknown) => Promise<void>>
      }
    ).statusPages

    assert.isTrue(Object.hasOwn(statusPages, '419'))
    assert.isTrue(Object.hasOwn(statusPages, '429'))

    let renderedView: string | undefined
    let renderedProps: unknown
    const ctx = {
      inertia: {
        render: (view: string, props: unknown) => {
          renderedView = view
          renderedProps = props
          return 'rendered'
        },
      },
    }

    await statusPages['419'](null, ctx)
    assert.equal(renderedView, 'errors/session_expired')

    await statusPages['429'](null, ctx)
    assert.equal(renderedView, 'errors/too_many_requests')
    assert.deepEqual(renderedProps, { retryAfter: 0, offerSignup: false })
  })
})
