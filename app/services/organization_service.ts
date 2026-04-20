import Organization from '#models/organization'
import crypto from 'node:crypto'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

function slugify(value: string) {
  const base = value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return base || 'org'
}

export default class OrganizationService {
  async createForSignup(
    params: { email: string; fullName?: string | null },
    trx?: TransactionClientContract
  ) {
    const name =
      params.fullName?.trim() ||
      params.email.split('@')[0]?.trim() ||
      params.email.trim() ||
      'Organization'

    const baseSlug = slugify(name)

    for (let attempt = 0; attempt < 5; attempt++) {
      const suffix = attempt === 0 ? '' : `-${crypto.randomBytes(3).toString('hex')}`
      const slug = `${baseSlug}${suffix}`

      const existing = await Organization.query({ client: trx }).where('slug', slug).first()
      if (!existing) {
        return await Organization.create({ name, slug }, { client: trx })
      }
    }

    return await Organization.create(
      {
        name,
        slug: `${baseSlug}-${crypto.randomBytes(8).toString('hex')}`,
      },
      { client: trx }
    )
  }
}
