import Organization from '#models/organization'
import { inject } from '@adonisjs/core'
import crypto from 'node:crypto'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CreateOrganizationForSignupInput } from '#shared/types/organization'

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

@inject()
export default class OrganizationService {
  async createForSignup(params: CreateOrganizationForSignupInput, trx?: TransactionClientContract) {
    const name = params.name.trim() || 'Organization'
    const attributes = {
      name,
      type: params.type ?? null,
      fleetSize: params.fleetSize ?? null,
    }

    const baseSlug = slugify(name)

    for (let attempt = 0; attempt < 5; attempt++) {
      const suffix = attempt === 0 ? '' : `-${crypto.randomBytes(3).toString('hex')}`
      const slug = `${baseSlug}${suffix}`

      const existing = await Organization.query({ client: trx }).where('slug', slug).first()
      if (!existing) {
        return await Organization.create({ ...attributes, slug }, { client: trx })
      }
    }

    return await Organization.create(
      {
        ...attributes,
        slug: `${baseSlug}-${crypto.randomBytes(8).toString('hex')}`,
      },
      { client: trx }
    )
  }

  /**
   * Gets an organization by ID or throws.
   */
  async findOrFail(id: number): Promise<Organization> {
    return await Organization.findOrFail(id)
  }
}
