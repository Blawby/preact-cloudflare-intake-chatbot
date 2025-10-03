# Onboarding Flows Implementation Plan

## Overview
This document outlines the implementation plan for pricing/checkout onboarding flows, inspired by modern UX patterns from ChatGPT and similar applications.

**✅ COMPLETED:**
- New User Sign-Up Flow (Personal Information Collection & Use Case Selection)
- Welcome Modal (Tips for getting started)
- Onboarding Modal System Integration

## 1. Pricing/Checkout Flow

### Route Structure:
```
/pricing → /pricing/cart → /pricing/checkout
```

### Cart Page (`/pricing/cart`)
**Design Reference**: ChatGPT's plan selection with user count

#### Components Needed:
- `PricingCartPage.tsx` - Main cart component
- `PlanSelector.tsx` - Plan selection cards
- `UserCountSelector.tsx` - User count input with +/- buttons
- `OrderSummary.tsx` - Right sidebar with pricing breakdown

#### Features:
- **Plan Selection**: Annual (Save 16%) vs Monthly
- **User Count**: Minimum 2 users, adjustable with +/- buttons
- **Real-time Pricing**: Updates based on plan and user count
- **Continue to Billing** button

#### Implementation Details:
```typescript
interface CartData {
  planType: 'annual' | 'monthly';
  userCount: number;
  planTier: 'plus' | 'business';
  subtotal: number;
  discount: number;
  total: number;
}
```

### Checkout Page (`/pricing/checkout`)
**Design Reference**: ChatGPT's billing information form

#### Components Needed:
- `CheckoutPage.tsx` - Main checkout component
- `ContactInfoForm.tsx` - Contact information section
- `PaymentMethodForm.tsx` - Payment method selection
- `BillingAddressForm.tsx` - Billing address form
- `OrderSummary.tsx` - Order summary sidebar

#### Features:
- **Contact Information**: Email field
- **Payment Method**: Card selection with card icons
- **Card Details**: Number, expiration, CVC
- **Billing Address**: Full name, country, address
- **Terms Agreement**: Checkbox with legal text
- **Subscribe Button**: Final payment submission

#### Implementation Details:
```typescript
interface CheckoutData {
  contactInfo: {
    email: string;
  };
  paymentMethod: {
    type: 'card';
    cardNumber: string;
    expirationDate: string;
    securityCode: string;
  };
  billingAddress: {
    fullName: string;
    country: string;
    addressLine1: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  agreedToTerms: boolean;
}
```

## 2. Component Architecture

### Shared Components:
- `InputField.tsx` - Reusable input component
- `SelectionCard.tsx` - Reusable selection card component
- `ProgressIndicator.tsx` - Step progress indicator

### Existing Components to Leverage:
- `Button` from `src/components/ui/Button.tsx`
- `Modal` from `src/components/Modal.tsx`
- `SettingsDropdown` from `src/components/settings/components/SettingsDropdown.tsx`
- Input patterns from `ContactForm.tsx`

### Mock Data Integration:
- Use `mockUserDataService` for user preferences
- Use `mockPricingDataService` for pricing calculations
- Use `mockPaymentService` for payment processing simulation

## 3. Implementation Phases

### Phase 1: Pricing Cart System
1. Create routing structure (`/pricing/cart`)
2. Implement `PricingCartPage.tsx`
3. Create `PlanSelector.tsx` and `UserCountSelector.tsx`
4. Implement `OrderSummary.tsx`
5. Add real-time pricing calculations

### Phase 2: Checkout System
1. Create routing structure (`/pricing/checkout`)
2. Implement `CheckoutPage.tsx`
3. Create form components for contact, payment, billing
4. Integrate with mock payment service
5. Add form validation and error handling

### Phase 3: Integration & Testing
1. Connect all flows end-to-end
2. Test with different user scenarios
3. Add loading states and error handling
4. Implement proper navigation between steps
5. Add analytics tracking points

## 4. Technical Requirements

### Routing:
- Use existing routing system
- Add new routes for `/pricing/cart` and `/pricing/checkout`
- Implement proper navigation guards

### State Management:
- Use existing mock data services
- Add onboarding state to localStorage
- Implement proper state persistence

### Styling:
- Follow existing light/dark mode patterns
- Use existing color scheme and spacing
- Ensure mobile responsiveness

### Accessibility:
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus management

## 5. Mock Data Enhancements

### Cart/Checkout Data:
```typescript
interface CartSession {
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
```

## 6. Success Metrics

### Pricing Conversion:
- Cart page visits
- Checkout page visits
- Payment completion rate
- Plan selection distribution

### User Experience:
- Time spent on each step
- Drop-off points
- User feedback and satisfaction
- Mobile vs desktop completion rates

## 7. Future Enhancements

### Advanced Features:
- A/B testing for different pricing flows
- Personalized recommendations based on use case
- Progressive disclosure of features
- Pricing analytics dashboard

### Integration Opportunities:
- Real payment processing (Stripe)
- Email marketing integration
- User segmentation based on pricing data
- Automated follow-up sequences

---

## Next Steps

1. **Start with Phase 1**: Implement the pricing cart system
2. **Create component library**: Build reusable components for forms and selections
3. **Integrate with existing systems**: Connect with mock data services
4. **Test thoroughly**: Ensure all flows work end-to-end
5. **Iterate based on feedback**: Refine based on user testing

This plan provides a comprehensive roadmap for implementing modern, user-friendly pricing and checkout flows that will improve user experience and conversion rates.
