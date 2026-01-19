/**
 * Feature Management System
 * Defines features available for each plan and custom company features
 */

export type PlanType = 'starter' | 'pro' | 'enterprise';

export interface Feature {
  id: string;
  name: string;
  description: string;
  plans: PlanType[]; // Which plans have this feature
  enabled: boolean; // Global feature flag
}

/**
 * Core features available in the system
 * Based on actual website pricing: https://ecotrack-india.vercel.app/
 */
export const FEATURES: Record<string, Feature> = {
  // Core Dashboard Features
  ESG_TRACKING_DASHBOARD: {
    id: 'esg_tracking_dashboard',
    name: 'ESG Tracking Dashboard',
    description: 'Full ESG tracking dashboard with all metrics',
    plans: ['starter', 'pro', 'enterprise'],
    enabled: true,
  },
  
  // Reporting Features
  REPORT_EXPORTS_PDF: {
    id: 'report_exports_pdf',
    name: 'PDF Export',
    description: 'Export reports as PDF',
    plans: ['starter', 'pro', 'enterprise'],
    enabled: true,
  },
  REPORT_EXPORTS_EXCEL: {
    id: 'report_exports_excel',
    name: 'Excel Export',
    description: 'Export reports as Excel',
    plans: ['starter', 'pro', 'enterprise'],
    enabled: true,
  },
  YEAR_ON_YEAR_COMPARISON: {
    id: 'year_on_year_comparison',
    name: 'Year-on-Year Comparison',
    description: 'Compare ESG metrics across multiple years',
    plans: ['starter', 'pro', 'enterprise'],
    enabled: true,
  },
  BRSR_TEMPLATES: {
    id: 'brsr_templates',
    name: 'BRSR-Compliant Templates',
    description: 'Pre-built BRSR compliance report templates',
    plans: ['starter', 'pro', 'enterprise'],
    enabled: true,
  },
  CUSTOM_REPORT_BRANDING: {
    id: 'custom_report_branding',
    name: 'Custom Report Branding',
    description: 'Add your company branding to reports',
    plans: ['pro', 'enterprise'],
    enabled: true,
  },
  INDUSTRY_SPECIFIC_TEMPLATES: {
    id: 'industry_specific_templates',
    name: 'Industry-Specific Templates',
    description: 'Templates tailored to your industry',
    plans: ['pro', 'enterprise'],
    enabled: true,
  },
  CUSTOM_COMPLIANCE_FRAMEWORKS: {
    id: 'custom_compliance_frameworks',
    name: 'Custom Compliance Frameworks',
    description: 'Create custom compliance frameworks',
    plans: ['enterprise'],
    enabled: true,
  },

  // Scoring & Analytics
  BASIC_ESG_SCORING: {
    id: 'basic_esg_scoring',
    name: 'Basic ESG Scoring',
    description: 'Calculate and track ESG scores',
    plans: ['starter', 'pro', 'enterprise'],
    enabled: true,
  },
  ADVANCED_ANALYTICS: {
    id: 'advanced_analytics',
    name: 'Advanced Analytics & Benchmarking',
    description: 'Advanced analytics, charts, and industry benchmarking',
    plans: ['pro', 'enterprise'],
    enabled: true,
  },
  MULTI_YEAR_TREND_ANALYSIS: {
    id: 'multi_year_trend_analysis',
    name: 'Multi-Year Trend Analysis',
    description: 'Analyze trends across multiple years',
    plans: ['pro', 'enterprise'],
    enabled: true,
  },
  COMPLIANCE_DEADLINE_ALERTS: {
    id: 'compliance_deadline_alerts',
    name: 'Compliance Deadline Alerts',
    description: 'Get alerts for upcoming compliance deadlines',
    plans: ['starter', 'pro', 'enterprise'],
    enabled: true,
  },

  // User Management
  MULTIPLE_USERS_5: {
    id: 'multiple_users_5',
    name: 'Up to 5 Users',
    description: 'Add up to 5 users to your account',
    plans: ['starter'],
    enabled: true,
  },
  MULTIPLE_USERS_20: {
    id: 'multiple_users_20',
    name: 'Up to 20 Users',
    description: 'Add up to 20 users to your account',
    plans: ['pro'],
    enabled: true,
  },
  UNLIMITED_USERS: {
    id: 'unlimited_users',
    name: 'Unlimited Users',
    description: 'Add unlimited users to your account',
    plans: ['enterprise'],
    enabled: true,
  },

  // API & Integrations
  API_ACCESS: {
    id: 'api_access',
    name: 'API Access',
    description: 'Access to REST API for integrations',
    plans: ['pro', 'enterprise'],
    enabled: true,
  },
  CUSTOM_INTEGRATIONS: {
    id: 'custom_integrations',
    name: 'Custom Integrations',
    description: 'Custom third-party integrations',
    plans: ['enterprise'],
    enabled: true,
  },
  ON_PREMISE_DEPLOYMENT: {
    id: 'on_premise_deployment',
    name: 'On-Premise Deployment',
    description: 'Deploy on your own infrastructure',
    plans: ['enterprise'],
    enabled: true,
  },

  // Support
  EMAIL_SUPPORT: {
    id: 'email_support',
    name: 'Email Support',
    description: 'Standard email support',
    plans: ['starter', 'pro', 'enterprise'],
    enabled: true,
  },
  PRIORITY_EMAIL_SUPPORT: {
    id: 'priority_email_support',
    name: 'Priority Email Support',
    description: 'Priority email support with faster response times',
    plans: ['pro', 'enterprise'],
    enabled: true,
  },
  DEDICATED_ACCOUNT_MANAGER: {
    id: 'dedicated_account_manager',
    name: 'Dedicated Account Manager',
    description: 'Personal account manager for your business',
    plans: ['pro', 'enterprise'],
    enabled: true,
  },
  TRAINING_ONBOARDING: {
    id: 'training_onboarding',
    name: 'Training & Onboarding Support',
    description: 'Comprehensive training and onboarding assistance',
    plans: ['pro', 'enterprise'],
    enabled: true,
  },
  PRIORITY_SUPPORT_24_7: {
    id: 'priority_support_24_7',
    name: '24/7 Priority Support',
    description: 'Round-the-clock priority support',
    plans: ['enterprise'],
    enabled: true,
  },
  DEDICATED_SUCCESS_MANAGER: {
    id: 'dedicated_success_manager',
    name: 'Dedicated Success Manager',
    description: 'Dedicated success manager for enterprise clients',
    plans: ['enterprise'],
    enabled: true,
  },
  CUSTOM_SLA: {
    id: 'custom_sla',
    name: 'Custom SLA Guarantees',
    description: 'Custom Service Level Agreement guarantees',
    plans: ['enterprise'],
    enabled: true,
  },

  // Enterprise Custom Features
  WHITE_LABEL_OPTIONS: {
    id: 'white_label_options',
    name: 'White-Label Options',
    description: 'Fully white-label the platform with your branding',
    plans: ['enterprise'],
    enabled: true,
  },
  ADVANCED_SECURITY_SSO: {
    id: 'advanced_security_sso',
    name: 'Advanced Security & SSO',
    description: 'Advanced security features and Single Sign-On',
    plans: ['enterprise'],
    enabled: true,
  },
};

/**
 * Check if a feature is available for a plan
 */
export function hasFeatureAccess(plan: PlanType, featureId: string): boolean {
  const feature = FEATURES[featureId];
  if (!feature || !feature.enabled) {
    return false;
  }
  return feature.plans.includes(plan);
}

/**
 * Get all features available for a plan
 */
export function getPlanFeatures(plan: PlanType): Feature[] {
  return Object.values(FEATURES).filter(
    (feature) => feature.enabled && feature.plans.includes(plan)
  );
}

/**
 * Get feature by ID
 */
export function getFeature(featureId: string): Feature | undefined {
  return FEATURES[featureId];
}

/**
 * Get all available features
 */
export function getAllFeatures(): Feature[] {
  return Object.values(FEATURES);
}

