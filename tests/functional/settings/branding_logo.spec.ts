import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { createEnterpriseAdminUser } from '#tests/functional/helpers'

/**
 * Upload du logo de marque (#785) : le SVG est refusé côté validateur
 * (document XML actif). La validation Vine échoue avant Cloudinary.
 */
const MALICIOUS_SVG = `<svg xmlns="http://www.w3.org/2000/svg">
  <script>alert(1)</script>
  <circle cx="10" cy="10" r="5"/>
</svg>`

test.group('Branding logo upload (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('POST /settings/branding/logo refuses an SVG carrying a script', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()

    const response = await client
      .post('/settings/branding/logo')
      .loginAs(user)
      .header('Accept', 'application/json')
      .file('logo', Buffer.from(MALICIOUS_SVG), {
        filename: 'evil.svg',
        contentType: 'image/svg+xml',
      })

    response.assertStatus(422)

    await user.load('organization')
    assert.isNull(user.organization.logoUrl)
  })
})
