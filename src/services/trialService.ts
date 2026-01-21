import Company from '../models/Company';

/**
 * Trial Strategy:
 * - Starter: No trial (low price, no friction)
 * - Pro: 14 day free trial
 * - Enterprise: Demo only (no self-serve trial)
 */

const TRIAL_DURATION_DAYS = 14; // Pro plan trial duration

/**
 * Start trial for a company (only for Pro plan)
 */
export const startTrial = async (companyId: string): Promise<{ success: boolean; message: string; trialEndDate?: Date }> => {
  const company = await Company.findById(companyId);
  if (!company) {
    return { success: false, message: 'Company not found' };
  }

  // Only Pro plan gets trial
  if (company.plan !== 'pro') {
    return { success: false, message: 'Trial only available for Pro plan' };
  }

  // Check if already on trial or has active subscription
  if (company.isTrial && company.trialEndDate && new Date() < company.trialEndDate) {
    return { success: false, message: 'Company is already on trial' };
  }

  if (company.subscriptionStatus === 'active' && !company.isTrial) {
    return { success: false, message: 'Company already has active subscription' };
  }

  // Start trial
  const now = new Date();
  const trialEndDate = new Date(now);
  trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DURATION_DAYS);

  company.isTrial = true;
  company.subscriptionStatus = 'trial';
  company.trialStartDate = now;
  company.trialEndDate = trialEndDate;

  await company.save();

  return {
    success: true,
    message: `14-day free trial started. Trial ends on ${trialEndDate.toLocaleDateString()}`,
    trialEndDate
  };
};

/**
 * Check if company's trial is active
 */
export const isTrialActive = (company: any): boolean => {
  if (!company.isTrial || !company.trialEndDate) {
    return false;
  }
  return new Date() < new Date(company.trialEndDate);
};

/**
 * Check if company's trial has expired
 */
export const isTrialExpired = (company: any): boolean => {
  if (!company.isTrial || !company.trialEndDate) {
    return false;
  }
  return new Date() >= new Date(company.trialEndDate);
};

/**
 * Get days remaining in trial
 */
export const getTrialDaysRemaining = (company: any): number | null => {
  if (!company.isTrial || !company.trialEndDate) {
    return null;
  }

  const now = new Date();
  const endDate = new Date(company.trialEndDate);
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
};

/**
 * Handle trial expiration - downgrade to Starter or mark as expired
 */
export const handleTrialExpiration = async (companyId: string): Promise<void> => {
  const company = await Company.findById(companyId);
  if (!company) return;

  if (isTrialExpired(company) && company.subscriptionStatus === 'trial') {
    // Auto-downgrade to Starter if trial expired and no payment
    company.plan = 'starter';
    company.subscriptionStatus = 'expired';
    company.isTrial = false;
    await company.save();
  }
};

/**
 * Convert trial to paid subscription
 */
export const convertTrialToPaid = async (companyId: string): Promise<void> => {
  const company = await Company.findById(companyId);
  if (!company) return;

  company.isTrial = false;
  company.subscriptionStatus = 'active';
  company.subscriptionStartDate = new Date();
  await company.save();
};

/**
 * Get trial eligibility for a plan
 */
export const getTrialEligibility = (plan: 'starter' | 'pro' | 'enterprise'): { eligible: boolean; duration?: number; type?: string } => {
  switch (plan) {
    case 'starter':
      return { eligible: false }; // No trial for Starter
    case 'pro':
      return { eligible: true, duration: TRIAL_DURATION_DAYS, type: 'free_trial' };
    case 'enterprise':
      return { eligible: false, type: 'demo_only' }; // Demo only, no self-serve trial
    default:
      return { eligible: false };
  }
};

