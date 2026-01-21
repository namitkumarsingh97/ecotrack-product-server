import User from '../models/User';
import Company from '../models/Company';
import { getPlanByType } from './planService';

/**
 * Get current user count for a company
 */
export const getCompanyUserCount = async (companyId: string): Promise<number> => {
  const count = await User.countDocuments({ companyId });
  return count;
};

/**
 * Check if company can add more users based on plan
 */
export const canAddUser = async (companyId: string): Promise<{ canAdd: boolean; currentCount: number; maxUsers: number; message?: string }> => {
  const company = await Company.findById(companyId);
  if (!company) {
    return { canAdd: false, currentCount: 0, maxUsers: 0, message: 'Company not found' };
  }

  const plan = await getPlanByType(company.plan || 'starter');
  if (!plan) {
    return { canAdd: false, currentCount: 0, maxUsers: 0, message: 'Plan not found' };
  }

  const maxUsers = plan.features.maxUsers;
  const currentCount = await getCompanyUserCount(companyId);

  // -1 means unlimited
  if (maxUsers === -1) {
    return { canAdd: true, currentCount, maxUsers: -1 };
  }

  if (currentCount >= maxUsers) {
    return {
      canAdd: false,
      currentCount,
      maxUsers,
      message: `User limit reached. Current plan (${company.plan}) allows ${maxUsers} users. Please upgrade to add more users.`
    };
  }

  return { canAdd: true, currentCount, maxUsers };
};

