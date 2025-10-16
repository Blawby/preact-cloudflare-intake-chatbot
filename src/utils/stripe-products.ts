export const PRODUCTS = {
  business: {
    id: 'prod_TE7wTSeH3z57OL',
    name: 'Business Seat',
    description: 'Seat-based business subscription with AI workflows'
  }
};

export const PRICES = {
  price_1SHfgbDJLzJ14cfPBGuTvcG3: {
    id: 'price_1SHfgbDJLzJ14cfPBGuTvcG3',
    product: PRODUCTS.business.id,
    unit_amount: 4000, // $40 in cents
    currency: 'usd',
    recurring: {
      interval: 'month' as const,
      interval_count: 1
    }
  },
  price_1SHfhCDJLzJ14cfPGFGQ77vQ: {
    id: 'price_1SHfhCDJLzJ14cfPGFGQ77vQ',
    product: PRODUCTS.business.id,
    unit_amount: 42000, // $420 in cents
    currency: 'usd',
    recurring: {
      interval: 'year' as const,
      interval_count: 1
    }
  }
};

export type PriceId = keyof typeof PRICES;
export type ProductId = keyof typeof PRODUCTS;

// ----------------------------------------
// UI helpers for tiers and features
// ----------------------------------------
import { ComponentType } from 'preact';
import { 
  BoltIcon,
  DocumentIcon,
  UserGroupIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

export interface TierFeature {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: ComponentType<any>; // heroicons accept className; relax typing for Preact/React interop
  text: string;
}

export const TIER_NAMES = {
  free: 'Free',
  business: 'Business',
} as const;

export const TIER_FEATURES: Record<'free' | 'business', TierFeature[]> = {
  free: [
    { icon: BoltIcon, text: 'Basic AI assistance' },
    { icon: DocumentIcon, text: 'Limited document analysis' },
  ],
  business: [
    { icon: UserGroupIcon, text: 'Organization collaboration & workflows' },
    { icon: LockClosedIcon, text: 'Advanced security' },
    { icon: DocumentIcon, text: 'Personalized intake forms' },
    { icon: BoltIcon, text: 'Unlimited usage with guardrails' },
  ],
};

export function getTierDisplayName(tier: 'free' | 'business' | 'plus' | 'enterprise'): string {
  // Gracefully map unknown paid tiers to Business for display purposes
  if (tier === 'plus' || tier === 'enterprise') return TIER_NAMES.business;
  return TIER_NAMES[tier as 'free' | 'business'] ?? String(tier);
}

export function formatPriceCents(
  amountCents: number, 
  interval: 'month' | 'year',
  locale: string = 'en',
  currency: string = 'USD'
): string {
  const dollars = amountCents / 100;
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${formatter.format(dollars)} / ${interval}`;
}

export function getBusinessPrices(locale: string = 'en', currency: string = 'USD'): { monthly: string; annual?: string } {
  const monthly = PRICES.price_1SHfgbDJLzJ14cfPBGuTvcG3
    ? formatPriceCents(PRICES.price_1SHfgbDJLzJ14cfPBGuTvcG3.unit_amount, 'month', locale, currency)
    : '$40 USD / month';
  const annual = PRICES.price_1SHfhCDJLzJ14cfPGFGQ77vQ
    ? formatPriceCents(PRICES.price_1SHfhCDJLzJ14cfPGFGQ77vQ.unit_amount, 'year', locale, currency)
    : undefined;
  return { monthly, annual };
}

export function getBusinessPricesStructured(locale: string = 'en', currency: string = 'USD'): { 
  monthly: { amountFormatted: string; billingLabel: string }; 
  annual?: { amountFormatted: string; billingLabel: string } 
} {
  const monthlyAmount = PRICES.price_1SHfgbDJLzJ14cfPBGuTvcG3?.unit_amount || 4000;
  const annualAmount = PRICES.price_1SHfhCDJLzJ14cfPGFGQ77vQ?.unit_amount;
  
  const monthly = {
    amountFormatted: formatPriceCents(monthlyAmount, 'month', locale, currency),
    billingLabel: 'month'
  };
  
  const annual = annualAmount ? {
    amountFormatted: formatPriceCents(annualAmount, 'year', locale, currency),
    billingLabel: 'year'
  } : undefined;
  
  return { monthly, annual };
}
