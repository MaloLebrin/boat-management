import { InvalidPromoCodeError } from '#exceptions/billing_errors'
import StripeService from '#services/stripe_service'
import type {
  DiscountDetails,
  PromoCodeEvaluation,
  ResolvedPromoCode,
  SyncedDiscount,
} from '#shared/types/billing'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import type Stripe from 'stripe'

/**
 * Le coupon porté par un code promo ou une remise. Depuis l'API embarquée par le
 * SDK v22, il vit sous `promotion.coupon` / `source.coupon` et n'est **développé**
 * que si l'appel l'a demandé (`expand`) : un identifiant nu signifie qu'on a
 * oublié l'expansion, pas que le coupon manque. Seul cet adaptateur et
 * `discountFromStripe` connaissent cette forme — si Stripe la change encore, c'est
 * ici que ça se corrige.
 */
function couponOf(source: { coupon: string | Stripe.Coupon | null }): Stripe.Coupon | null {
  const coupon = source.coupon
  return coupon !== null && typeof coupon === 'object' ? coupon : null
}

/** Projection d'un coupon Stripe sur le sous-ensemble que l'app affiche et persiste. */
export function discountDetailsFromCoupon(
  coupon: Stripe.Coupon,
  promoCode: string | null
): DiscountDetails {
  return {
    couponId: coupon.id,
    promoCode,
    name: coupon.name ?? null,
    percentOff: coupon.percent_off ?? null,
    amountOffCents: coupon.amount_off ?? null,
    currency: coupon.currency ?? null,
    duration: coupon.duration,
    durationInMonths: coupon.duration_in_months ?? null,
  }
}

/**
 * Stripe passe `coupon.valid` à `false` quand le coupon lui-même est épuisé
 * (`max_redemptions`) ou périmé (`redeem_by`), indépendamment des limites du code
 * promo : le client doit lire « limite atteinte » ou « expiré », pas « inconnu »
 * — il croirait à une faute de frappe.
 */
function invalidCouponReason(
  coupon: Stripe.Coupon,
  nowSeconds: number
): 'expired' | 'exhausted' | 'notFound' {
  if (coupon.max_redemptions !== null && coupon.times_redeemed >= coupon.max_redemptions) {
    return 'exhausted'
  }
  if (coupon.redeem_by !== null && coupon.redeem_by <= nowSeconds) return 'expired'
  return 'notFound'
}

/**
 * Vrai si Stripe refuse la création de la session **à cause de la remise**
 * (première transaction, montant minimum, produits, client) : seul cas où l'erreur
 * est une faute de saisie à montrer sous le champ. Un prix inconnu ou une clé
 * invalide lève la même classe d'erreur — ils doivent remonter, pas se déguiser
 * en « code non applicable ».
 */
export function isPromotionRefusal(error: { message: string; param?: string }): boolean {
  if (/^(discounts|promotion_code|coupon)/.test(error.param ?? '')) return true
  return /promotion code|coupon|discount/i.test(error.message)
}

/**
 * Pré-contrôle local des règles que l'on peut vérifier sans créer la session
 * Checkout : code actif et coupon valide, date d'expiration, plafond
 * d'utilisations. Les restrictions que Stripe seul peut évaluer (première
 * transaction du client, montant minimum, coupon limité à d'autres produits)
 * remontent en `StripeInvalidRequestError` à la création de la session — le
 * contrôleur les traduit en `notApplicable`.
 */
export function evaluatePromotionCode(
  promo: Stripe.PromotionCode,
  nowSeconds = Math.floor(Date.now() / 1000)
): PromoCodeEvaluation {
  const coupon = couponOf(promo.promotion)
  if (!promo.active || !coupon) return { ok: false, reason: 'notFound' }
  if (!coupon.valid) return { ok: false, reason: invalidCouponReason(coupon, nowSeconds) }
  if (promo.expires_at !== null && promo.expires_at <= nowSeconds) {
    return { ok: false, reason: 'expired' }
  }
  if (promo.max_redemptions !== null && promo.times_redeemed >= promo.max_redemptions) {
    return { ok: false, reason: 'exhausted' }
  }

  return {
    ok: true,
    value: { promotionCodeId: promo.id, ...discountDetailsFromCoupon(coupon, promo.code) },
  }
}

/**
 * Remise d'un abonnement, telle que le webhook la persiste. `null` si le coupon
 * n'est pas développé — l'appelant doit alors relire l'abonnement avec `expand`.
 * Le code promo n'est connu que si `promotion_code` est développé lui aussi ;
 * sinon la remise est enregistrée sans code (coupon posé depuis le Dashboard).
 */
export function discountFromStripe(discount: Stripe.Discount): SyncedDiscount | null {
  const coupon = couponOf(discount.source)
  if (!coupon) return null

  const promo = discount.promotion_code
  const promoCode = promo !== null && typeof promo === 'object' ? promo.code : null

  return {
    ...discountDetailsFromCoupon(coupon, promoCode),
    end: discount.end !== null ? DateTime.fromSeconds(discount.end) : null,
  }
}

@inject()
export default class PromoCodeService {
  constructor(private stripeService: StripeService) {}

  /**
   * Résout un code saisi par le client en code promo Stripe utilisable au
   * checkout (#955). Lance `InvalidPromoCodeError` avec la raison du refus.
   */
  async resolve(code: string): Promise<ResolvedPromoCode> {
    const promo = await this.stripeService.findPromotionCode(code)
    if (!promo) throw new InvalidPromoCodeError('notFound')

    const result = evaluatePromotionCode(promo)
    if (!result.ok) throw new InvalidPromoCodeError(result.reason)
    return result.value
  }
}
