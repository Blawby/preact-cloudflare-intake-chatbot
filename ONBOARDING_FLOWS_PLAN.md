# Onboarding Flows Implementation Plan

## Overview
This document outlines the implementation plan for new user sign-up and pricing/checkout onboarding flows, inspired by modern UX patterns from ChatGPT and similar applications.

## 1. New User Sign-Up Flow (2 Steps)

### Step 1: Personal Information Collection
**Design Reference**: ChatGPT's "Tell us about you" modal
**Location**: After successful account creation in `AuthPage.tsx`

#### Components Needed:
- `OnboardingModal.tsx` - Main modal wrapper
- `PersonalInfoStep.tsx` - First step component
- `UseCaseStep.tsx` - Second step component

#### Step 1 Fields:
- **Full Name** (required)
- **Birthday** (optional, for age verification/legal compliance)
- **Terms & Privacy Agreement** (required checkbox)

#### Implementation Details:
```typescript
interface PersonalInfoData {
  fullName: string;
  birthday?: string;
  agreedToTerms: boolean;
}
```

#### UI Components to Use:
- Existing `Button` component from `src/components/ui/Button.tsx`
- Custom input fields (similar to `ContactForm.tsx` patterns)
- Existing light/dark mode color patterns
- Modal wrapper (extend existing `Modal.tsx`)

### Step 2: Use Case Selection
**Design Reference**: ChatGPT's "What do you want to use ChatGPT for?" modal

#### Options:
- **Personal Legal Issues** (icon: scale/justice)
- **Business Legal Needs** (icon: briefcase)
- **Legal Research** (icon: magnifying glass)
- **Document Review** (icon: document)
- **Other** (icon: ellipsis)

#### Implementation Details:
```typescript
interface UseCaseData {
  primaryUseCase: 'personal' | 'business' | 'research' | 'documents' | 'other';
  additionalInfo?: string; // for "other" option
}
```

#### UI Components to Use:
- Selection cards with icons (similar to existing pricing plan cards)
- Existing `Button` component
- Skip option for users who want to proceed without selection

### Post-Onboarding: Welcome Modal
**Design Reference**: ChatGPT's "Tips for getting started" modal

#### Content:
- **"Ask away"** - Explain AI capabilities
- **"Don't share sensitive info"** - Privacy warning
- **"Check your facts"** - Accuracy disclaimer
- **"Okay, let's go"** button

## 2. Pricing/Checkout Flow

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

## 3. Component Architecture

### Shared Components:
- `OnboardingStep.tsx` - Base step component with navigation
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

## 4. Implementation Phases

### Phase 1: Onboarding Modal System
1. Create `OnboardingModal.tsx` wrapper
2. Implement `PersonalInfoStep.tsx`
3. Implement `UseCaseStep.tsx`
4. Integrate with `AuthPage.tsx`
5. Add mock data persistence

### Phase 2: Pricing Cart System
1. Create routing structure (`/pricing/cart`)
2. Implement `PricingCartPage.tsx`
3. Create `PlanSelector.tsx` and `UserCountSelector.tsx`
4. Implement `OrderSummary.tsx`
5. Add real-time pricing calculations

### Phase 3: Checkout System
1. Create routing structure (`/pricing/checkout`)
2. Implement `CheckoutPage.tsx`
3. Create form components for contact, payment, billing
4. Integrate with mock payment service
5. Add form validation and error handling

### Phase 4: Integration & Testing
1. Connect all flows end-to-end
2. Test with different user scenarios
3. Add loading states and error handling
4. Implement proper navigation between steps
5. Add analytics tracking points

## 5. Technical Requirements

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

## 6. Mock Data Enhancements

### User Onboarding Data:
```typescript
interface OnboardingData {
  personalInfo: PersonalInfoData;
  useCase: UseCaseData;
  completedAt: string;
  skippedSteps: string[];
}
```

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

## 7. Success Metrics

### Onboarding Completion:
- Step 1 completion rate
- Step 2 completion rate
- Overall onboarding completion rate
- Time to complete onboarding

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

## 8. Future Enhancements

### Advanced Features:
- A/B testing for different onboarding flows
- Personalized recommendations based on use case
- Progressive disclosure of features
- Onboarding analytics dashboard

### Integration Opportunities:
- Real payment processing (Stripe)
- Email marketing integration
- User segmentation based on onboarding data
- Automated follow-up sequences

---

## Next Steps

1. **Start with Phase 1**: Implement the onboarding modal system
2. **Create component library**: Build reusable components for forms and selections
3. **Integrate with existing systems**: Connect with mock data services
4. **Test thoroughly**: Ensure all flows work end-to-end
5. **Iterate based on feedback**: Refine based on user testing

This plan provides a comprehensive roadmap for implementing modern, user-friendly onboarding flows that will improve user experience and conversion rates.
