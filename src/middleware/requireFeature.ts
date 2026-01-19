import { Request, Response, NextFunction } from 'express';
import { hasFeatureAccess } from '../config/features';
import User from '../models/User';
import Company from '../models/Company';

/**
 * Middleware to check if user's plan has access to a feature
 * Also checks for company-level custom features
 */
export function requireFeature(featureId: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get user with plan
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check plan-based feature access
      const hasPlanAccess = hasFeatureAccess(user.plan, featureId);
      
      // Check company-level custom features
      const company = await Company.findOne({ userId: user._id });
      const customFeatures = company?.customFeatures || [];
      const hasCustomFeature = customFeatures.includes(featureId);

      if (!hasPlanAccess && !hasCustomFeature) {
        return res.status(403).json({
          error: `Feature '${featureId}' is not available for your plan`,
          requiredPlan: 'upgrade',
        });
      }

      // Attach feature info to request
      (req as any).hasFeature = true;
      next();
    } catch (error) {
      console.error('Feature check error:', error);
      res.status(500).json({ error: 'Failed to check feature access' });
    }
  };
}

