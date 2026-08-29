import MaintenancePolicy from '#policies/maintenance_policy'
import BoatEngineSparePartsService, {
  BoatEquipmentNotFoundError,
  EngineNotSparePartsEligibleError,
  RepairCartItemNotFoundError,
  SparePartNotFoundError,
} from '#services/boat_engine_spare_parts_service'
import BoatHullService, { BoatNotFoundError } from '#services/boat_hull_service'
import EngineCatalogService from '#services/engine_catalog_service'
import { PART_ASSEMBLY_SLUGS, type PartAssemblySlug } from '#shared/types/spare_parts'
import { addRepairCartItemValidator, updateRepairCartItemValidator } from '#validators/spare_parts'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type BoatEngine from '#models/boat_engine'

@inject()
export default class BoatEngineSparePartsController {
  constructor(
    private boatService: BoatHullService,
    private sparePartsService: BoatEngineSparePartsService,
    private engineCatalogService: EngineCatalogService
  ) {}

  private async loadBoat(ctx: Pick<HttpContext, 'auth' | 'response' | 'params'>) {
    const user = ctx.auth.getUserOrFail()
    try {
      const boat = await this.boatService.getForUserOrFail(user, Number(ctx.params.boatId))
      return { user, boat }
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        ctx.response.redirect('/boats')
        return null
      }
      throw error
    }
  }

  /**
   * Projection du moteur vers Inertia, avec sa marque **rapprochée du catalogue
   * côté serveur** (#573).
   *
   * `EngineCatalogService.resolveBrand()` interroge la base : les composants
   * pièces détachées ne peuvent pas l'appeler eux-mêmes, ils reçoivent donc le
   * slug résolu et le traduisent en marque du corpus #517 avec le helper pur
   * `sparePartsBrandFromCatalogSlug()`. `catalogBrandSlug` vaut `null` pour une
   * saisie hors catalogue, cas que les écrans savent déjà traiter.
   */
  private async engineProps(engine: BoatEngine) {
    const catalogBrand = await this.engineCatalogService.resolveBrand(engine.brand)

    return {
      id: engine.id,
      brand: engine.brand,
      model: engine.model,
      catalogBrandSlug: catalogBrand?.slug ?? null,
      serialNumber: engine.serialNumber,
      kind: engine.kind,
      status: engine.status,
    }
  }

  async index({ inertia, auth, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const canView = user.organizationId
      ? await user.hasPermission(user.organizationId, 'maintenance.view')
      : false
    if (!canView) return response.redirect('/dashboard')

    const engines = await this.sparePartsService.listEligibleEnginesForUser(user)

    return inertia.render('spare_parts/index', { engines })
  }

  async identify(ctx: HttpContext) {
    const { inertia, auth, response, params, bouncer, session, i18n } = ctx
    await auth.authenticate()
    const loaded = await this.loadBoat(ctx)
    if (!loaded) return
    const { user, boat } = loaded

    await bouncer.with(MaintenancePolicy).authorize('view', boat)

    const engineId = Number(params.engineId)
    try {
      const engine = await this.sparePartsService.getEligibleEngineOrFail(user, boat, engineId)
      const cartItems = await this.sparePartsService.getCartItems(engine)
      const canManage = await bouncer.with(MaintenancePolicy).allows('edit', boat)

      return inertia.render('spare_parts/identify', {
        boat: { id: boat.id, name: boat.name },
        engine: await this.engineProps(engine),
        cartItems,
        canManage,
      })
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        return response.redirect(`/boats/${boat.id}`)
      }
      if (error instanceof EngineNotSparePartsEligibleError) {
        session.flash('error', i18n.t('flash.spareParts.notEligible'))
        return response.redirect(`/boats/${boat.id}/engines/${engineId}`)
      }
      throw error
    }
  }

  async assembly(ctx: HttpContext) {
    const { inertia, auth, response, params, bouncer, session, i18n } = ctx
    await auth.authenticate()
    const loaded = await this.loadBoat(ctx)
    if (!loaded) return
    const { user, boat } = loaded

    await bouncer.with(MaintenancePolicy).authorize('view', boat)

    const engineId = Number(params.engineId)
    const assemblySlug = String(params.assemblySlug)

    if (!PART_ASSEMBLY_SLUGS.includes(assemblySlug as PartAssemblySlug)) {
      session.flash('error', i18n.t('flash.spareParts.assemblyNotFound'))
      return response.redirect(`/boats/${boat.id}/engines/${engineId}/spare-parts`)
    }

    try {
      const engine = await this.sparePartsService.getEligibleEngineOrFail(user, boat, engineId)
      const cartItems = await this.sparePartsService.getCartItems(engine)
      const canManage = await bouncer.with(MaintenancePolicy).allows('edit', boat)

      return inertia.render('spare_parts/assembly', {
        boat: { id: boat.id, name: boat.name },
        engine: await this.engineProps(engine),
        assemblySlug: assemblySlug as PartAssemblySlug,
        cartItems,
        canManage,
      })
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        return response.redirect(`/boats/${boat.id}`)
      }
      if (error instanceof EngineNotSparePartsEligibleError) {
        session.flash('error', i18n.t('flash.spareParts.notEligible'))
        return response.redirect(`/boats/${boat.id}/engines/${engineId}`)
      }
      throw error
    }
  }

  async addCartItem(ctx: HttpContext) {
    const { request, auth, response, params, bouncer, session, i18n } = ctx
    await auth.authenticate()
    const loaded = await this.loadBoat(ctx)
    if (!loaded) return
    const { user, boat } = loaded

    await bouncer.with(MaintenancePolicy).authorize('edit', boat)

    const payload = await request.validateUsing(addRepairCartItemValidator)

    try {
      await this.sparePartsService.addCartItem(user, boat, Number(params.engineId), payload.partKey)
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        return response.redirect(`/boats/${boat.id}`)
      }
      if (error instanceof EngineNotSparePartsEligibleError) {
        session.flash('error', i18n.t('flash.spareParts.notEligible'))
        return response.redirect().back()
      }
      if (error instanceof SparePartNotFoundError) {
        session.flash('error', i18n.t('flash.spareParts.partNotFound'))
        return response.redirect().back()
      }
      throw error
    }

    return response.redirect().back()
  }

  async updateCartItem(ctx: HttpContext) {
    const { request, auth, response, params, bouncer, session, i18n } = ctx
    await auth.authenticate()
    const loaded = await this.loadBoat(ctx)
    if (!loaded) return
    const { user, boat } = loaded

    await bouncer.with(MaintenancePolicy).authorize('edit', boat)

    const payload = await request.validateUsing(updateRepairCartItemValidator)

    try {
      await this.sparePartsService.updateCartItem(
        user,
        boat,
        Number(params.engineId),
        Number(params.itemId),
        payload
      )
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        return response.redirect(`/boats/${boat.id}`)
      }
      if (error instanceof EngineNotSparePartsEligibleError) {
        session.flash('error', i18n.t('flash.spareParts.notEligible'))
        return response.redirect().back()
      }
      if (error instanceof RepairCartItemNotFoundError) {
        session.flash('error', i18n.t('flash.spareParts.cartItemNotFound'))
        return response.redirect().back()
      }
      throw error
    }

    return response.redirect().back()
  }

  async removeCartItem(ctx: HttpContext) {
    const { auth, response, params, bouncer, session, i18n } = ctx
    await auth.authenticate()
    const loaded = await this.loadBoat(ctx)
    if (!loaded) return
    const { user, boat } = loaded

    await bouncer.with(MaintenancePolicy).authorize('edit', boat)

    try {
      await this.sparePartsService.removeCartItem(
        user,
        boat,
        Number(params.engineId),
        Number(params.itemId)
      )
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        return response.redirect(`/boats/${boat.id}`)
      }
      if (error instanceof EngineNotSparePartsEligibleError) {
        session.flash('error', i18n.t('flash.spareParts.notEligible'))
        return response.redirect().back()
      }
      if (error instanceof RepairCartItemNotFoundError) {
        session.flash('error', i18n.t('flash.spareParts.cartItemNotFound'))
        return response.redirect().back()
      }
      throw error
    }

    return response.redirect().back()
  }

  /** Export CSV de la liste de réparation — endpoint de téléchargement dédié. */
  async exportCart(ctx: HttpContext) {
    const { auth, response, params, bouncer, session, i18n } = ctx
    await auth.authenticate()
    const loaded = await this.loadBoat(ctx)
    if (!loaded) return
    const { user, boat } = loaded

    await bouncer.with(MaintenancePolicy).authorize('view', boat)

    const engineId = Number(params.engineId)
    try {
      const engine = await this.sparePartsService.getEligibleEngineOrFail(user, boat, engineId)
      const csv = await this.sparePartsService.buildCartCsv(engine, (key) => i18n.t(key))

      const slug = [engine.brand, engine.model]
        .filter(Boolean)
        .join('-')
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
      const filename = `repair-list${slug ? `-${slug}` : ''}.csv`

      response.header('Content-Type', 'text/csv; charset=utf-8')
      response.header('Content-Disposition', `attachment; filename="${filename}"`)
      // BOM UTF-8 pour qu'Excel détecte l'encodage des accents.
      return response.send('\ufeff' + csv)
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.engine.notFound'))
        return response.redirect(`/boats/${boat.id}`)
      }
      if (error instanceof EngineNotSparePartsEligibleError) {
        session.flash('error', i18n.t('flash.spareParts.notEligible'))
        return response.redirect(`/boats/${boat.id}/engines/${engineId}`)
      }
      throw error
    }
  }
}
