import { inject } from '@adonisjs/core'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import { CloudinaryService, CloudinaryFolders } from '#services/cloudinary_service'
import type Organization from '#models/organization'
import type { BrandingConfig } from '#shared/types/branding'

@inject()
export class BrandingService {
  constructor(private cloudinaryService: CloudinaryService) {}

  toBrandingConfig(org: Organization): BrandingConfig {
    return {
      logoUrl: org.logoUrl,
      logoPublicId: org.logoPublicId,
      primaryColor: org.primaryColor,
      secondaryColor: org.secondaryColor,
      appName: org.appName,
    }
  }

  async uploadLogo(org: Organization, file: MultipartFile): Promise<void> {
    if (org.logoPublicId) {
      await this.cloudinaryService.deleteFile(org.logoPublicId, 'image')
    }

    const result = await this.cloudinaryService.uploadImage(
      file,
      CloudinaryFolders.orgLogo(org.slug)
    )

    org.logoUrl = result.secureUrl
    org.logoPublicId = result.publicId
    await org.save()
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
    org.primaryColor = data.primaryColor ?? org.primaryColor
    org.secondaryColor = data.secondaryColor ?? org.secondaryColor
    org.appName = data.appName ?? org.appName
    await org.save()
  }
}
