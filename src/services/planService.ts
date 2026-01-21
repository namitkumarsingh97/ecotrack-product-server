import Plan, { PlanType } from '../models/Plan';

/**
 * Get plan by type
 */
export const getPlanByType = async (type: PlanType): Promise<any> => {
  let plan = await Plan.findOne({ type });
  
  if (!plan) {
    // Create default plans if they don't exist
    const defaultPlans = [
      {
        name: 'Starter',
        type: 'starter' as PlanType,
        price: 1999,
        features: {
          esgTrackingDashboard: true,
          unlimitedReportExports: true,
          yearOnYearComparison: true,
          multiYearTrendAnalysis: false,
          brsrCompliantTemplates: true,
          industrySpecificTemplates: false,
          customReportBranding: false,
          basicEsgScoring: true,
          advancedAnalytics: false,
          benchmarking: false,
          complianceDeadlineAlerts: true,
          customComplianceFrameworks: false,
          emailSupport: true,
          priorityEmailSupport: false,
          dedicatedAccountManager: false,
          dedicatedSuccessManager: false,
          trainingOnboardingSupport: false,
          support247: false,
          maxUsers: 5,
          apiAccess: false,
          whiteLabelOptions: false,
          customIntegrations: false,
          advancedSecuritySSO: false,
          onPremiseDeployment: false,
          customSLAGuarantees: false,
        }
      },
      {
        name: 'Pro',
        type: 'pro' as PlanType,
        price: 4999,
        features: {
          esgTrackingDashboard: true,
          unlimitedReportExports: true,
          yearOnYearComparison: true,
          multiYearTrendAnalysis: true,
          brsrCompliantTemplates: true,
          industrySpecificTemplates: true,
          customReportBranding: true,
          basicEsgScoring: true,
          advancedAnalytics: true,
          benchmarking: true,
          complianceDeadlineAlerts: true,
          customComplianceFrameworks: false,
          emailSupport: true,
          priorityEmailSupport: true,
          dedicatedAccountManager: true,
          dedicatedSuccessManager: false,
          trainingOnboardingSupport: true,
          support247: false,
          maxUsers: 20,
          apiAccess: true,
          whiteLabelOptions: false,
          customIntegrations: false,
          advancedSecuritySSO: false,
          onPremiseDeployment: false,
          customSLAGuarantees: false,
        }
      },
      {
        name: 'Enterprise',
        type: 'enterprise' as PlanType,
        price: -1, // Custom pricing
        features: {
          esgTrackingDashboard: true,
          unlimitedReportExports: true,
          yearOnYearComparison: true,
          multiYearTrendAnalysis: true,
          brsrCompliantTemplates: true,
          industrySpecificTemplates: true,
          customReportBranding: true,
          basicEsgScoring: true,
          advancedAnalytics: true,
          benchmarking: true,
          complianceDeadlineAlerts: true,
          customComplianceFrameworks: true,
          emailSupport: true,
          priorityEmailSupport: true,
          dedicatedAccountManager: true,
          dedicatedSuccessManager: true,
          trainingOnboardingSupport: true,
          support247: true,
          maxUsers: -1, // Unlimited
          apiAccess: true,
          whiteLabelOptions: true,
          customIntegrations: true,
          advancedSecuritySSO: true,
          onPremiseDeployment: true,
          customSLAGuarantees: true,
        }
      }
    ];

    const planData = defaultPlans.find(p => p.type === type);
    if (planData) {
      plan = await Plan.create(planData);
    }
  }

  return plan;
};

/**
 * Get all plans
 */
export const getAllPlans = async (): Promise<any[]> => {
  const plans = await Plan.find().sort({ price: 1 });
  
  if (plans.length === 0) {
    // Initialize default plans
    await getPlanByType('starter');
    await getPlanByType('pro');
    await getPlanByType('enterprise');
    return await Plan.find().sort({ price: 1 });
  }

  return plans;
};

/**
 * Check if user has access to a feature
 */
export const hasFeatureAccess = (userPlan: PlanType | null, feature: string): boolean => {
  // For now, we'll allow all features in development
  // In production, this should check the user's plan
  if (!userPlan) return true; // Default to allowing access
  
  // This will be implemented with actual plan checking
  return true;
};

