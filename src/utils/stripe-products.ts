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
