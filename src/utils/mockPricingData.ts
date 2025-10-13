// Mock Pricing Data Service
// Centralized pricing plans and features data for reuse throughout the app

import { ComponentType } from 'preact';
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
  icon: ComponentType;
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
  productId?: string;
  priceId?: string;
}

export interface PricingComparison {
  plans: PricingPlan[];
  features: {
    [key: string]: {
      name: string;
      description: string;
      icon: ComponentType;
      tiers: {
        [key in SubscriptionTier]: boolean | string;
      };
    };
  };
}

// Feature definitions for comparison tables
const FEATURE_DEFINITIONS = {
  aiAccess: {
    name: 'AI Access',
    description: 'Access to our legal AI models',
    icon: BoltIcon,
    tiers: {
      free: 'Blawby AI-1 (Limited)',
      plus: 'Blawby AI-1 (Enhanced)',
      business: 'Blawby AI-1 (Unlimited)'
    }
  },
  documentAnalysis: {
    name: 'Document Analysis',
    description: 'Upload and analyze legal documents',
    icon: DocumentIcon,
    tiers: {
      free: 'Limited',
      plus: 'Enhanced',
      business: 'Unlimited'
    }
  },
  casePreparation: {
    name: 'Case PDF Preparation',
    description: 'AI-powered case document preparation',
    icon: PhotoIcon,
    tiers: {
      free: 'Limited',
      plus: 'Enhanced',
      business: 'Unlimited'
    }
  },
  memoryContext: {
    name: 'Memory & Context',
    description: 'Conversation memory and context',
    icon: LinkIcon,
    tiers: {
      free: 'Limited',
      plus: 'Enhanced',
      business: 'Unlimited'
    }
  },
  lawyerSearch: {
    name: 'Lawyer Search',
    description: 'Find and connect with qualified lawyers',
    icon: MagnifyingGlassIcon,
    tiers: {
      free: 'Limited',
      plus: 'Enhanced',
      business: 'Unlimited'
    }
  },
  organizationCollaboration: {
    name: 'Organization Collaboration',
    description: 'Shared projects and organization features',
    icon: UserGroupIcon,
    tiers: {
      free: false,
      plus: false,
      business: true
    }
  },
  security: {
    name: 'Advanced Security',
    description: 'SSO, MFA, and enterprise security',
    icon: LockClosedIcon,
    tiers: {
      free: false,
      plus: false,
      business: true
    }
  },
  privacy: {
    name: 'Privacy Protection',
    description: 'Data never used for training',
    icon: EyeSlashIcon,
    tiers: {
      free: false,
      plus: false,
      business: true
    }
  },
  integrations: {
    name: 'Integrations',
    description: 'SharePoint and other tools',
    icon: ShareIcon,
    tiers: {
      free: false,
      plus: false,
      business: true
    }
  },
  billing: {
    name: 'Simplified Billing',
    description: 'User management and billing',
    icon: CurrencyDollarIcon,
    tiers: {
      free: false,
      plus: false,
      business: true
    }
  },
  transcription: {
    name: 'Voice Transcription',
    description: 'Meeting and voice transcription',
    icon: MicrophoneIcon,
    tiers: {
      free: false,
      plus: false,
      business: true
    }
  },
  agents: {
    name: 'AI Agents',
    description: 'Coding and research agents',
    icon: Cog6ToothIcon,
    tiers: {
      free: false,
      plus: false,
      business: true
    }
  }
};

// Pricing plans data
const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0 USD / month',
    priceAmount: 0,
    currency: 'USD',
    billingPeriod: 'month',
    description: 'Legal AI assistance for everyday needs',
    features: [
      { icon: BoltIcon, text: 'Access to Blawby AI-1', description: 'Limited access to our legal AI model' },
      { icon: DocumentIcon, text: 'Limited document analysis', description: 'Upload and analyze basic legal documents' },
      { icon: PhotoIcon, text: 'Limited case PDF preparation', description: 'Basic case document preparation' },
      { icon: LinkIcon, text: 'Limited memory and context', description: 'Basic conversation memory' },
      { icon: MagnifyingGlassIcon, text: 'Limited lawyer search', description: 'Basic lawyer search capabilities' }
    ],
    buttonText: 'Your current plan',
    limitations: [
      'Limited to 20 messages per day',
      'Basic document analysis support',
      'Standard response times',
      'No organization collaboration features'
    ],
    benefits: [
      'Perfect for personal legal needs',
      'No credit card required',
      'Full access to core legal AI features',
      'Community support'
    ]
  },
  {
    id: 'plus',
    name: 'Plus',
    price: '$20 USD / month',
    priceAmount: 20,
    currency: 'USD',
    billingPeriod: 'month',
    description: 'Enhanced legal AI capabilities for professionals',
    features: [
      { icon: PlusIcon, text: 'Everything in Free, with higher limits', description: 'All free features with increased usage' },
      { icon: CpuChipIcon, text: 'Enhanced access to Blawby AI-1', description: 'Priority access to our legal AI model' },
      { icon: VideoCameraIcon, text: 'Enhanced document analysis', description: 'Faster and more accurate legal document processing' },
      { icon: LinkIcon, text: 'Extended memory and context', description: 'Longer conversation memory' },
      { icon: MagnifyingGlassIcon, text: 'Enhanced lawyer search', description: 'Advanced lawyer matching capabilities' }
    ],
    buttonText: 'Get Plus',
    popular: true,
    isRecommended: true,
    limitations: [
      'Limited to 200 messages per day',
      'No organization collaboration features',
      'Standard support response times'
    ],
    benefits: [
      '5x higher usage limits',
      'Priority AI model access',
      'Enhanced legal features',
      'Email support'
    ]
  },
  {
    id: 'business',
    name: 'Business',
    price: '$25 USD / month',
    priceAmount: 25,
    currency: 'USD',
    billingPeriod: 'month',
    description: 'Secure, collaborative workspace for organizations',
    productId: 'prod_business',
    priceId: 'price_monthly',
    features: [
      { icon: PlusIcon, text: 'Everything in Plus, with even higher limits', description: 'All Plus features with unlimited usage' },
      { icon: CpuChipIcon, text: 'Unlimited access to our best model for work', description: 'Unlimited access to advanced AI models' },
      { icon: VideoCameraIcon, text: 'Advanced document analysis & case preparation', description: 'Full legal document processing capabilities' },
      { icon: LockClosedIcon, text: 'Advanced security with SSO, MFA, & more', description: 'Enterprise-grade security features' },
      { icon: EyeSlashIcon, text: 'Privacy built in; data never used for training', description: 'Complete data privacy protection' },
      { icon: UserGroupIcon, text: 'Tools for organizations like shared projects & workflows', description: 'Organization collaboration and project management' },
      { icon: ShareIcon, text: 'Integration with Quickbooks & other tools', description: 'Connect with your existing workflow' },
      { icon: CurrencyDollarIcon, text: 'Simplified billing and user management', description: 'Easy organization and billing management' },
      { icon: MicrophoneIcon, text: 'Voice transcription and analysis', description: 'Voice transcription and legal analysis' },
      { icon: Cog6ToothIcon, text: 'Legal research and lawyer search agents', description: 'Specialized AI agents for legal research and lawyer matching' }
    ],
    buttonText: 'Get Business',
    isRecommended: true,
    limitations: [
      'Requires 2+ users',
      'Annual billing recommended'
    ],
    benefits: [
      'Unlimited usage',
      'Organization collaboration',
      'Enterprise security',
      'Priority support',
      'Custom integrations'
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
    icon: ComponentType;
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
   
  (window as { mockPricingDataService?: MockPricingDataService }).mockPricingDataService = mockPricingDataService;
}
