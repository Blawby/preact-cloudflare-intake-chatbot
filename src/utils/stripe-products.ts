export const PRODUCTS = {
  business: {
    id: 'prod_business',
    name: 'Business Plan',
    description: 'Full featured business subscription'
  }
};

export const PRICES = {
  price_monthly: {
    id: 'price_monthly',
    product: 'prod_business',
    unit_amount: 3000, // $30 in cents
    currency: 'usd',
    recurring: {
      interval: 'month' as const,
      interval_count: 1
    }
  },
  price_annual: {
    id: 'price_annual',
    product: 'prod_business',
    unit_amount: 30000, // $300 in cents ($25/mo effective)
    currency: 'usd',
    recurring: {
      interval: 'year' as const,
      interval_count: 1
    }
  }
};

export type PriceId = keyof typeof PRICES;
export type ProductId = keyof typeof PRODUCTS;
