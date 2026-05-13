/**
 * Plan Limits Configuration
 * ─────────────────────────
 * Central source of truth for every feature gate in the Dinely platform.
 * Each key maps to a plan name (matching `organizations.subscription_plan`).
 *
 * Usage:
 *   import { getPlanLimits } from '../config/planLimits';
 *   const limits = getPlanLimits(org.subscription_plan);
 *   if (!limits.eposIntegration) throw new AppError('Professional plan required', 403);
 */

export const PLAN_LIMITS = {
  /**
   * Free — account created but no active subscription.
   * Extremely restricted; essentially a locked state.
   */
  free: {
    monthlyReservations: 0,
    staffBooking: false,
    premiumReservation: false,
    customizableLandingPage: false,
    eposIntegration: false,
    posAutologin: false,
    analytics: false,
    prioritySupport: false,
    paymentGateway: false,
  },

  /**
   * Starter — £49/month.
   * Core reservation management for small restaurants.
   */
  starter: {
    monthlyReservations: 100,
    staffBooking: true,           // Staff can manage reservations
    premiumReservation: false,    // No VIP/premium table flows
    customizableLandingPage: false,
    eposIntegration: false,       // No API key access
    posAutologin: false,          // No HMAC autologin
    analytics: false,
    prioritySupport: false,
    paymentGateway: false,        // No Stripe Connect
  },

  /**
   * Professional — £79/month.
   * Full platform access for established restaurants.
   */
  professional: {
    monthlyReservations: Infinity, // Unlimited
    staffBooking: true,
    premiumReservation: true,
    customizableLandingPage: true,
    eposIntegration: true,
    posAutologin: true,
    analytics: true,
    prioritySupport: true,
    paymentGateway: true,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;
export type PlanLimits = typeof PLAN_LIMITS[PlanName];

/**
 * Returns the limits for a given plan name.
 * Falls back to 'free' if the plan is unrecognised.
 */
export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  if (!plan) return PLAN_LIMITS.free;
  return PLAN_LIMITS[plan as PlanName] ?? PLAN_LIMITS.free;
}

/**
 * Returns true if the given plan has unlimited reservations.
 */
export function hasUnlimitedReservations(plan: string | null | undefined): boolean {
  return getPlanLimits(plan).monthlyReservations === Infinity;
}

/**
 * Returns the monthly reservation limit for a plan.
 * Returns 0 for free/unknown plans.
 */
export function getMonthlyReservationLimit(plan: string | null | undefined): number {
  const limit = getPlanLimits(plan).monthlyReservations;
  return limit === Infinity ? Infinity : limit;
}
