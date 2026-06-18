// Backend-only: process.env is not available in the Vite/browser bundle — never import this file in inertia/
export const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'demo@fleetai.app'
export const DEMO_ORG_SLUG = 'marina-demo'
export const DEMO_SESSION_DURATION_MS = 15 * 60 * 1000
