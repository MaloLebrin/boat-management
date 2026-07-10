import { defineConfig } from '@adonisjs/core/bodyparser'

/**
 * Payload size limit applied only to the batch upload routes below.
 * Worst case is a document batch: up to 20 files x 20mb each.
 */
export const LARGE_UPLOAD_LIMIT = '400mb'

/**
 * Routes handling batch file uploads (multiple photos / documents in one request).
 * They are excluded from the default auto-processing (kept at the base 20mb limit)
 * and re-processed with `LARGE_UPLOAD_LIMIT` by the LargeMultipartUploadMiddleware.
 *
 * Patterns must match `ctx.route.pattern` exactly (leading slash, no trailing slash).
 * Non-batch multipart routes (branding logo, CSV imports, signed contract) stay on
 * the base 20mb limit and must NOT be listed here.
 */
export const LARGE_UPLOAD_ROUTES: string[] = [
  '/boats/:boatId/photos',
  '/boats/:boatId/documents',
  '/boats/:boatId/engines/:engineId/photos',
  '/boats/:boatId/engines/:engineId/documents',
  '/boats/:boatId/engines/:engineId/parts/:partId/photos',
  '/boats/:boatId/engines/:engineId/parts/:partId/documents',
  '/boats/:boatId/sails/:sailId/photos',
  '/boats/:boatId/rig/photos',
  '/boats/:boatId/safety-equipment/:safetyId/photos',
  '/boats/:boatId/generic-equipment/:genericId/photos',
  '/boats/:boatId/reservations/:reservationId/inspections/:inspectionId/photos',
  '/clients/:id/documents',
]

const bodyParserConfig: ReturnType<typeof defineConfig> = defineConfig({
  /**
   * Parse request bodies for these HTTP methods.
   * Keep this aligned with methods that receive payloads in your routes.
   */
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],

  /**
   * Config for the "application/x-www-form-urlencoded"
   * content-type parser.
   */
  form: {
    /**
     * Normalize empty string values to null.
     */
    convertEmptyStringsToNull: true,

    /**
     * Content types handled by the form parser.
     */
    types: ['application/x-www-form-urlencoded'],
  },

  /**
   * Config for the JSON parser.
   */
  json: {
    /**
     * Normalize empty string values to null.
     */
    convertEmptyStringsToNull: true,

    /**
     * Content types handled by the JSON parser.
     */
    types: [
      'application/json',
      'application/json-patch+json',
      'application/vnd.api+json',
      'application/csp-report',
    ],
  },

  /**
   * Config for the "multipart/form-data" content-type parser.
   * File uploads are handled by the multipart parser.
   */
  multipart: {
    /**
     * Automatically process uploaded files into the system tmp directory.
     */
    autoProcess: true,

    /**
     * Normalize empty string values to null.
     */
    convertEmptyStringsToNull: true,

    /**
     * Batch upload routes opt out of auto-processing so the
     * LargeMultipartUploadMiddleware can process them with `LARGE_UPLOAD_LIMIT`.
     * Every other multipart route keeps the base `limit` below.
     */
    processManually: LARGE_UPLOAD_ROUTES,

    /**
     * Base payload size limit for all other multipart requests
     * (branding logo, CSV imports, signed contract…).
     */
    limit: '20mb',

    /**
     * Content types handled by the multipart parser.
     */
    types: ['multipart/form-data'],
  },
})

export default bodyParserConfig
