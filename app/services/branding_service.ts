import { inject } from '@adonisjs/core'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import { CloudinaryService, CloudinaryFolders } from '#services/cloudinary_service'
import type Organization from '#models/organization'
import { PLAN_LIMITS } from '#shared/types/plan'
import type {
  BrandingConfig,
  BrandingEmailParams,
  BrandingSharedProps,
} from '#shared/types/branding'

@inject()
export class BrandingService {
  constructor(private cloudinaryService: CloudinaryService) {}

  toEmailParams(org: Organization): BrandingEmailParams | null {
    if (!PLAN_LIMITS[org.plan].canWhiteLabel) return null
    return {
      appName: org.appName,
      primaryColor: org.primaryColor,
      logoUrl: org.logoUrl,
    }
  }

  toBrandingConfig(org: Organization): BrandingConfig {
    return {
      logoUrl: org.logoUrl,
      logoPublicId: org.logoPublicId,
      primaryColor: org.primaryColor,
      secondaryColor: org.secondaryColor,
      appName: org.appName,
    }
  }

  toSharedProps(org: Organization): BrandingSharedProps {
    return {
      logoUrl: org.logoUrl,
      primaryColor: org.primaryColor,
      secondaryColor: org.secondaryColor,
      appName: org.appName,
    }
  }

  async uploadLogo(org: Organization, file: MultipartFile): Promise<void> {
    const result = await this.cloudinaryService.uploadImage(
      file,
      CloudinaryFolders.orgLogo(org.slug)
    )

    const oldPublicId = org.logoPublicId

    try {
      org.logoUrl = result.secureUrl
      org.logoPublicId = result.publicId
      await org.save()
    } catch (error) {
      // Nettoyer l'upload Cloudinary si la sauvegarde en DB échoue
      await this.cloudinaryService.deleteFile(result.publicId, 'image')
      throw error
    }

    if (oldPublicId) {
      await this.cloudinaryService.deleteFile(oldPublicId, 'image')
    }
  }

  async deleteLogo(org: Organization): Promise<void> {
    if (!org.logoPublicId) return
    await this.cloudinaryService.deleteFile(org.logoPublicId, 'image')
    org.logoUrl = null
    org.logoPublicId = null
    await org.save()
  }

  async updateBranding(
    org: Organization,
    data: { primaryColor?: string | null; secondaryColor?: string | null; appName?: string | null }
  ): Promise<void> {
    org.primaryColor = data.primaryColor !== undefined ? data.primaryColor : org.primaryColor
    org.secondaryColor =
      data.secondaryColor !== undefined ? data.secondaryColor : org.secondaryColor
    org.appName =
      data.appName !== undefined ? (data.appName === '' ? null : data.appName) : org.appName
    await org.save()
  }
}
