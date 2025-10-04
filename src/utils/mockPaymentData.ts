// Mock Payment Data Service
// Centralized payment, cart, and checkout data for pricing flows
// Follows existing patterns from mockUserData.ts and mockPricingData.ts

import { type SubscriptionTier } from './mockUserData';
import { mockPricingDataService } from './mockPricingData';

export interface CartSession {
  cartId: string;
  planType: 'annual' | 'monthly';
  userCount: number;
  planTier: 'plus' | 'business';
  pricing: {
    subtotal: number;
    discount: number;
    total: number;
  };
  createdAt: string;
  expiresAt: string;
}

export interface CheckoutSession {
  sessionId: string;
  cartId: string;
  customerInfo: {
    email: string;
    name: string;
    company?: string;
  };
  billingAddress: {
    country: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  paymentMethod: {
    type: 'card' | 'bank_transfer';
    last4?: string;
    brand?: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  invoiceUrl?: string;
  error?: string;
  status?: 'pending' | 'completed' | 'failed';
}

export interface PlanData {
  planTier: 'plus' | 'business';
  planType: 'annual' | 'monthly';
  userCount: number;
}

// Storage keys
const STORAGE_KEYS = {
  CART_SESSION: 'mockCartSession',
  CHECKOUT_SESSION: 'mockCheckoutSession',
  PAYMENT_RESULT: 'mockPaymentResult'
} as const;

class MockPaymentDataService {
  // Safe storage access helper
  private getStorage(): Storage | null {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  }

  // Generate unique IDs
  private generateId(): string {
    return `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Calculate pricing based on plan data
  private calculatePricing(planData: PlanData): { subtotal: number; discount: number; total: number } {
    const { planTier, planType, userCount } = planData;
    
    // Get base pricing from existing service
    const pricingPlan = mockPricingDataService.getPricingPlan(planTier);
    if (!pricingPlan) {
      throw new Error(`Pricing plan not found for tier: ${planTier}`);
    }

    // Calculate base price per user per month
    const basePricePerUser = pricingPlan.priceAmount;
    const subtotal = basePricePerUser * userCount;

    // Apply annual discount (16% off for annual plans)
    const discount = planType === 'annual' ? subtotal * 0.16 : 0;
    const total = subtotal - discount;

    return {
      subtotal,
      discount,
      total: Math.round(total * 100) / 100 // Round to 2 decimal places
    };
  }

  // Cart Session Methods
  createCartSession(planData: PlanData): CartSession {
    const cartId = this.generateId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    const pricing = this.calculatePricing(planData);

    const cartSession: CartSession = {
      cartId,
      planType: planData.planType,
      userCount: planData.userCount,
      planTier: planData.planTier,
      pricing,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    // Store in localStorage
    const storage = this.getStorage();
    if (storage) {
      storage.setItem(STORAGE_KEYS.CART_SESSION, JSON.stringify(cartSession));
    }

    return cartSession;
  }

  getCartSession(cartId: string): CartSession | null {
    const storage = this.getStorage();
    if (!storage) return null;

    try {
      const stored = storage.getItem(STORAGE_KEYS.CART_SESSION);
      if (stored) {
        const cartSession = JSON.parse(stored) as CartSession;
        // Check if this is the requested cart and not expired
        if (cartSession.cartId === cartId && new Date(cartSession.expiresAt) > new Date()) {
          return cartSession;
        }
      }
    } catch (error) {
      console.error('Failed to parse cart session:', error);
    }

    return null;
  }

  updateCartSession(cartId: string, updates: Partial<PlanData>): CartSession | null {
    const existingCart = this.getCartSession(cartId);
    if (!existingCart) {
      throw new Error('Cart session not found or expired');
    }

    // Create new plan data with updates
    const updatedPlanData: PlanData = {
      planTier: updates.planTier ?? existingCart.planTier,
      planType: updates.planType ?? existingCart.planType,
      userCount: updates.userCount ?? existingCart.userCount
    };

    // Recalculate pricing
    const pricing = this.calculatePricing(updatedPlanData);

    const updatedCart: CartSession = {
      ...existingCart,
      ...updatedPlanData,
      pricing,
      createdAt: existingCart.createdAt // Keep original creation time
    };

    // Store updated cart
    const storage = this.getStorage();
    if (storage) {
      storage.setItem(STORAGE_KEYS.CART_SESSION, JSON.stringify(updatedCart));
    }

    return updatedCart;
  }

  // Checkout Session Methods
  createCheckoutSession(cartId: string, customerInfo: CheckoutSession['customerInfo']): CheckoutSession {
    const cartSession = this.getCartSession(cartId);
    if (!cartSession) {
      throw new Error('Cart session not found or expired');
    }

    const sessionId = this.generateId();
    const now = new Date();

    const checkoutSession: CheckoutSession = {
      sessionId,
      cartId,
      customerInfo,
      billingAddress: {
        country: 'US',
        addressLine1: '',
        city: '',
        state: '',
        zipCode: ''
      },
      paymentMethod: {
        type: 'card'
      },
      status: 'pending',
      createdAt: now.toISOString()
    };

    // Store in localStorage
    const storage = this.getStorage();
    if (storage) {
      storage.setItem(STORAGE_KEYS.CHECKOUT_SESSION, JSON.stringify(checkoutSession));
    }

    return checkoutSession;
  }

  getCheckoutSession(sessionId: string): CheckoutSession | null {
    const storage = this.getStorage();
    if (!storage) return null;

    try {
      const stored = storage.getItem(STORAGE_KEYS.CHECKOUT_SESSION);
      if (stored) {
        const checkoutSession = JSON.parse(stored) as CheckoutSession;
        if (checkoutSession.sessionId === sessionId) {
          return checkoutSession;
        }
      }
    } catch (error) {
      console.error('Failed to parse checkout session:', error);
    }

    return null;
  }

  // Payment Processing Methods
  processPayment(sessionId: string, paymentData: { cardNumber: string; expiryDate: string; cvv: string }): Promise<PaymentResult> {
    return new Promise((resolve) => {
      // Simulate API delay
      setTimeout(() => {
        const checkoutSession = this.getCheckoutSession(sessionId);
        if (!checkoutSession) {
          resolve({
            success: false,
            error: 'Checkout session not found'
          });
          return;
        }

        // Simulate different payment scenarios
        const random = Math.random();
        let result: PaymentResult;

        if (random < 0.1) {
          // 10% chance of failure
          result = {
            success: false,
            error: 'Payment declined by bank',
            status: 'failed'
          };
        } else if (random < 0.2) {
          // 10% chance of pending
          result = {
            success: true,
            paymentId: this.generateId(),
            status: 'pending'
          };
        } else {
          // 80% chance of success
          result = {
            success: true,
            paymentId: this.generateId(),
            invoiceUrl: `https://example.com/invoice/${this.generateId()}`,
            status: 'completed'
          };
        }

        // Update checkout session status
        const updatedSession: CheckoutSession = {
          ...checkoutSession,
          status: result.status === 'completed' ? 'completed' : 
                  result.status === 'pending' ? 'processing' : 'failed',
          paymentMethod: {
            type: 'card',
            last4: paymentData.cardNumber.slice(-4),
            brand: 'visa' // Simplified for mock
          }
        };

        // Store updated session
        const storage = this.getStorage();
        if (storage) {
          storage.setItem(STORAGE_KEYS.CHECKOUT_SESSION, JSON.stringify(updatedSession));
          storage.setItem(STORAGE_KEYS.PAYMENT_RESULT, JSON.stringify(result));
        }

        resolve(result);
      }, 2000); // 2 second delay to simulate real payment processing
    });
  }

  getPaymentStatus(paymentId: string): PaymentResult | null {
    const storage = this.getStorage();
    if (!storage) return null;

    try {
      const stored = storage.getItem(STORAGE_KEYS.PAYMENT_RESULT);
      if (stored) {
        const result = JSON.parse(stored) as PaymentResult;
        if (result.paymentId === paymentId) {
          return result;
        }
      }
    } catch (error) {
      console.error('Failed to parse payment result:', error);
    }

    return null;
  }

  // Utility Methods
  clearAllSessions(): void {
    const storage = this.getStorage();
    if (!storage) return;

    storage.removeItem(STORAGE_KEYS.CART_SESSION);
    storage.removeItem(STORAGE_KEYS.CHECKOUT_SESSION);
    storage.removeItem(STORAGE_KEYS.PAYMENT_RESULT);
  }

  // Get current active cart (for UI state management)
  getCurrentCart(): CartSession | null {
    const storage = this.getStorage();
    if (!storage) return null;

    try {
      const stored = storage.getItem(STORAGE_KEYS.CART_SESSION);
      if (stored) {
        const cartSession = JSON.parse(stored) as CartSession;
        // Check if cart is not expired
        if (new Date(cartSession.expiresAt) > new Date()) {
          return cartSession;
        }
      }
    } catch (error) {
      console.error('Failed to parse current cart:', error);
    }

    return null;
  }

  // Validate cart session exists and is not expired
  validateCartSession(cartId: string): boolean {
    const cart = this.getCartSession(cartId);
    return cart !== null;
  }
}

// Export singleton instance
export const mockPaymentDataService = new MockPaymentDataService();

// Development helper - expose to window for easy testing
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).mockPaymentDataService = mockPaymentDataService;
  
  // Helper functions for testing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).createTestCart = (planTier: 'plus' | 'business' = 'plus', planType: 'annual' | 'monthly' = 'monthly', userCount: number = 2) => {
    const cart = mockPaymentDataService.createCartSession({ planTier, planType, userCount });
    console.log('Created test cart:', cart);
    return cart;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).clearPaymentData = () => {
    mockPaymentDataService.clearAllSessions();
    console.log('Cleared all payment data');
  };
}
