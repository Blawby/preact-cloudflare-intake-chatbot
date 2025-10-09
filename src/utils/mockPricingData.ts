// Mock Pricing Data Service
// Centralized pricing plans and features data for reuse throughout the app

import { 
  BoltIcon, 
  DocumentIcon, 
  PhotoIcon, 
  LinkIcon, 
  MagnifyingGlassIcon,
  PlusIcon,
  CpuChipIcon,
  VideoCameraIcon,
  LockClosedIcon,
  EyeSlashIcon,
  UserGroupIcon,
  ShareIcon,
  CurrencyDollarIcon,
  MicrophoneIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { type SubscriptionTier } from './mockUserData';

export interface PricingFeature {
  icon: any;
  text: string;
  description?: string;
}

export interface PricingPlan {
  id: SubscriptionTier;
  name: string;
  price: string;
  priceAmount: number;
  currency: string;
  billingPeriod: 'month' | 'year';
  description: string;
  features: PricingFeature[];
  buttonText: string;
  isRecommended?: boolean;
  isCurrent?: boolean;
  limitations?: string[];
  benefits?: string[];
  popular?: boolean;
}

export interface PricingComparison {
  plans: PricingPlan[];
  features: {
    [key: string]: {
      name: string;
      description: string;
      icon: any;
      tiers: {
        [key in SubscriptionTier]: boolean | string;
      };
    };
  };
}

// Feature definitions for comparison tables with translation keys
const FEATURE_DEFINITIONS = {
  aiAccess: {
    name: 'pricing:features.aiAccess.name',
    description: 'pricing:features.aiAccess.description',
    icon: BoltIcon,
    tiers: {
      free: 'pricing:features.aiAccess.tiers.free',
      plus: 'pricing:features.aiAccess.tiers.plus',
      business: 'pricing:features.aiAccess.tiers.business'
    }
  },
  documentAnalysis: {
    name: 'pricing:features.documentAnalysis.name',
    description: 'pricing:features.documentAnalysis.description',
    icon: DocumentIcon,
    tiers: {
      free: 'pricing:features.documentAnalysis.tiers.free',
      plus: 'pricing:features.documentAnalysis.tiers.plus',
      business: 'pricing:features.documentAnalysis.tiers.business'
    }
  },
  casePreparation: {
    name: 'pricing:features.casePreparation.name',
    description: 'pricing:features.casePreparation.description',
    icon: PhotoIcon,
    tiers: {
      free: 'pricing:features.casePreparation.tiers.free',
      plus: 'pricing:features.casePreparation.tiers.plus',
      business: 'pricing:features.casePreparation.tiers.business'
    }
  },
  memoryContext: {
    name: 'pricing:features.memoryContext.name',
    description: 'pricing:features.memoryContext.description',
    icon: LinkIcon,
    tiers: {
      free: 'pricing:features.memoryContext.tiers.free',
      plus: 'pricing:features.memoryContext.tiers.plus',
      business: 'pricing:features.memoryContext.tiers.business'
    }
  },
  lawyerSearch: {
    name: 'pricing:features.lawyerSearch.name',
    description: 'pricing:features.lawyerSearch.description',
    icon: MagnifyingGlassIcon,
    tiers: {
      free: 'pricing:features.lawyerSearch.tiers.free',
      plus: 'pricing:features.lawyerSearch.tiers.plus',
      business: 'pricing:features.lawyerSearch.tiers.business'
    }
  },
  teamCollaboration: {
    name: 'pricing:features.teamCollaboration.name',
    description: 'pricing:features.teamCollaboration.description',
    icon: UserGroupIcon,
    tiers: {
      free: false,
      plus: false,
      business: true
    }
  },
  security: {
    name: 'pricing:features.security.name',
    description: 'pricing:features.security.description',
    icon: LockClosedIcon,
    tiers: {
      free: false,
      plus: false,
      business: true
    }
  },
  privacy: {
    name: 'pricing:features.privacy.name',
    description: 'pricing:features.privacy.description',
    icon: EyeSlashIcon,
    tiers: {
      free: false,
      plus: false,
      business: true
    }
  },
  integrations: {
    name: 'pricing:features.integrations.name',
    description: 'pricing:features.integrations.description',
    icon: ShareIcon,
    tiers: {
      free: false,
      plus: false,
      business: true
    }
  },
  billing: {
    name: 'pricing:features.billing.name',
    description: 'pricing:features.billing.description',
    icon: CurrencyDollarIcon,
    tiers: {
      free: false,
      plus: false,
      business: true
    }
  },
  transcription: {
    name: 'pricing:features.transcription.name',
    description: 'pricing:features.transcription.description',
    icon: MicrophoneIcon,
    tiers: {
      free: false,
      plus: false,
      business: true
    }
  },
  agents: {
    name: 'pricing:features.agents.name',
    description: 'pricing:features.agents.description',
    icon: Cog6ToothIcon,
    tiers: {
      free: false,
      plus: false,
      business: true
    }
  }
};

// Pricing plans data with translation keys
const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'pricing:plans.free.name',
    price: '$0 USD / month', // Will be formatted dynamically
    priceAmount: 0,
    currency: 'USD',
    billingPeriod: 'month',
    description: 'pricing:plans.free.description',
    features: [
      { icon: BoltIcon, text: 'pricing:features.aiAccess.text.free', description: 'pricing:features.aiAccess.detail.free' },
      { icon: DocumentIcon, text: 'pricing:features.documentAnalysis.text.free', description: 'pricing:features.documentAnalysis.detail.free' },
      { icon: PhotoIcon, text: 'pricing:features.casePreparation.text.free', description: 'pricing:features.casePreparation.detail.free' },
      { icon: LinkIcon, text: 'pricing:features.memoryContext.text.free', description: 'pricing:features.memoryContext.detail.free' },
      { icon: MagnifyingGlassIcon, text: 'pricing:features.lawyerSearch.text.free', description: 'pricing:features.lawyerSearch.detail.free' }
    ],
    buttonText: 'pricing:plans.free.buttonText',
    limitations: [
      'pricing:limitations.free.messagesPerDay',
      'pricing:limitations.free.documentSupport',
      'pricing:limitations.free.responseTime',
      'pricing:limitations.free.noTeam'
    ],
    benefits: [
      'pricing:benefits.free.personal',
      'pricing:benefits.free.noCard',
      'pricing:benefits.free.fullAccess',
      'pricing:benefits.free.support'
    ]
  },
  {
    id: 'plus',
    name: 'pricing:plans.plus.name',
    price: '$20 USD / month', // Will be formatted dynamically
    priceAmount: 20,
    currency: 'USD',
    billingPeriod: 'month',
    description: 'pricing:plans.plus.description',
    features: [
      { icon: PlusIcon, text: 'pricing:features.plusIncludes.text', description: 'pricing:features.plusIncludes.detail' },
      { icon: CpuChipIcon, text: 'pricing:features.aiAccess.text.plus', description: 'pricing:features.aiAccess.detail.plus' },
      { icon: VideoCameraIcon, text: 'pricing:features.documentAnalysis.text.plus', description: 'pricing:features.documentAnalysis.detail.plus' },
      { icon: LinkIcon, text: 'pricing:features.memoryContext.text.plus', description: 'pricing:features.memoryContext.detail.plus' },
      { icon: MagnifyingGlassIcon, text: 'pricing:features.lawyerSearch.text.plus', description: 'pricing:features.lawyerSearch.detail.plus' }
    ],
    buttonText: 'pricing:plans.plus.buttonText',
    popular: true,
    isRecommended: true,
    limitations: [
      'pricing:limitations.plus.messagesPerDay',
      'pricing:limitations.plus.noTeam',
      'pricing:limitations.plus.standardSupport'
    ],
    benefits: [
      'pricing:benefits.plus.higherLimits',
      'pricing:benefits.plus.priorityAccess',
      'pricing:benefits.plus.enhanced',
      'pricing:benefits.plus.support'
    ]
  },
  {
    id: 'business',
    name: 'pricing:plans.business.name',
    price: '$25 USD / month', // Will be formatted dynamically
    priceAmount: 25,
    currency: 'USD',
    billingPeriod: 'month',
    description: 'pricing:plans.business.description',
    features: [
      { icon: PlusIcon, text: 'pricing:features.businessIncludes.text', description: 'pricing:features.businessIncludes.detail' },
      { icon: CpuChipIcon, text: 'pricing:features.aiAccess.text.business', description: 'pricing:features.aiAccess.detail.business' },
      { icon: VideoCameraIcon, text: 'pricing:features.documentAnalysis.text.business', description: 'pricing:features.documentAnalysis.detail.business' },
      { icon: LockClosedIcon, text: 'pricing:features.security.text', description: 'pricing:features.security.detail' },
      { icon: EyeSlashIcon, text: 'pricing:features.privacy.text', description: 'pricing:features.privacy.detail' },
      { icon: UserGroupIcon, text: 'pricing:features.teamCollaboration.text', description: 'pricing:features.teamCollaboration.detail' },
      { icon: ShareIcon, text: 'pricing:features.integrations.text', description: 'pricing:features.integrations.detail' },
      { icon: CurrencyDollarIcon, text: 'pricing:features.billing.text', description: 'pricing:features.billing.detail' },
      { icon: MicrophoneIcon, text: 'pricing:features.transcription.text', description: 'pricing:features.transcription.detail' },
      { icon: Cog6ToothIcon, text: 'pricing:features.agents.text', description: 'pricing:features.agents.detail' }
    ],
    buttonText: 'pricing:plans.business.buttonText',
    isRecommended: true,
    limitations: [
      'pricing:limitations.business.minUsers',
      'pricing:limitations.business.annualBilling'
    ],
    benefits: [
      'pricing:benefits.business.unlimited',
      'pricing:benefits.business.team',
      'pricing:benefits.business.security',
      'pricing:benefits.business.prioritySupport',
      'pricing:benefits.business.customIntegrations'
    ]
  }
];

class MockPricingDataService {
  // Get all pricing plans
  getPricingPlans(): PricingPlan[] {
    return PRICING_PLANS;
  }

  // Get a specific pricing plan
  getPricingPlan(tier: SubscriptionTier): PricingPlan | undefined {
    return PRICING_PLANS.find(plan => plan.id === tier);
  }

  // Get pricing comparison data
  getPricingComparison(): PricingComparison {
    return {
      plans: PRICING_PLANS,
      features: FEATURE_DEFINITIONS
    };
  }

  // Get features for a specific tier
  getFeaturesForTier(tier: SubscriptionTier): PricingFeature[] {
    const plan = this.getPricingPlan(tier);
    return plan?.features || [];
  }

  // Get recommended plan (usually Business)
  getRecommendedPlan(): PricingPlan | undefined {
    return PRICING_PLANS.find(plan => plan.isRecommended);
  }

  // Get popular plan (usually Plus)
  getPopularPlan(): PricingPlan | undefined {
    return PRICING_PLANS.find(plan => plan.popular);
  }

  // Get free plan
  getFreePlan(): PricingPlan | undefined {
    return this.getPricingPlan('free');
  }

  // Get business plan
  getBusinessPlan(): PricingPlan | undefined {
    return this.getPricingPlan('business');
  }

  // Get plus plan
  getPlusPlan(): PricingPlan | undefined {
    return this.getPricingPlan('plus');
  }

  // Calculate annual pricing
  getAnnualPricing(tier: SubscriptionTier): { monthly: number; annual: number; savings: number } | undefined {
    const plan = this.getPricingPlan(tier);
    if (!plan) return undefined;

    const monthly = plan.priceAmount;
    const fullYear = monthly * 12;
    const savings = Math.round(fullYear * 0.20); // 20% discount for annual
    const annual = fullYear - savings;

    return { monthly, annual, savings };
  }

  // Get feature comparison for all tiers
  getFeatureComparison(): Array<{
    feature: string;
    name: string;
    description: string;
    icon: any;
    tiers: { [key in SubscriptionTier]: boolean | string };
  }> {
    return Object.entries(FEATURE_DEFINITIONS).map(([key, feature]) => ({
      feature: key,
      name: feature.name,
      description: feature.description,
      icon: feature.icon,
      tiers: feature.tiers
    }));
  }

  // Get upgrade path from current tier
  getUpgradePath(currentTier: SubscriptionTier): PricingPlan[] {
    const currentIndex = PRICING_PLANS.findIndex(plan => plan.id === currentTier);
    if (currentIndex === -1) return PRICING_PLANS;
    
    return PRICING_PLANS.slice(currentIndex + 1);
  }

  // Get downgrade path from current tier
  getDowngradePath(currentTier: SubscriptionTier): PricingPlan[] {
    const currentIndex = PRICING_PLANS.findIndex(plan => plan.id === currentTier);
    if (currentIndex === -1) return [];
    
    return PRICING_PLANS.slice(0, currentIndex);
  }

  // Check if tier has specific feature
  hasFeature(tier: SubscriptionTier, featureKey: string): boolean | string {
    const feature = FEATURE_DEFINITIONS[featureKey as keyof typeof FEATURE_DEFINITIONS];
    if (!feature) return false;
    
    return feature.tiers[tier];
  }

  // Get all available tiers
  getAvailableTiers(): SubscriptionTier[] {
    return PRICING_PLANS.map(plan => plan.id);
  }

  // Get tier display name
  getTierDisplayName(tier: SubscriptionTier): string {
    const plan = this.getPricingPlan(tier);
    return plan?.name || tier;
  }

  // Get tier description
  getTierDescription(tier: SubscriptionTier): string {
    const plan = this.getPricingPlan(tier);
    return plan?.description || '';
  }
}

// Export singleton instance
export const mockPricingDataService = new MockPricingDataService();

// Development helper - expose to window for easy testing
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).mockPricingDataService = mockPricingDataService;
}
