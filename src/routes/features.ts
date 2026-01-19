import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';
import { getAllFeatures, getPlanFeatures, getFeature, hasFeatureAccess } from '../config/features';
import User from '../models/User';
import Company from '../models/Company';

const router = express.Router();

/**
 * Get all features available for current user's plan
 * GET /api/features
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get plan-based features
    const planFeatures = getPlanFeatures(user.plan);

    // Get company custom features
    const company = await Company.findOne({ userId: user._id });
    const customFeatures = company?.customFeatures || [];
    const featureOverrides = company?.featureOverrides || {};

    // Add custom features that aren't in plan
    const allFeatures = planFeatures.map(f => ({
      ...f,
      enabled: featureOverrides[f.id] !== undefined ? featureOverrides[f.id] : true,
      source: 'plan' as const,
    }));

    // Add custom features
    customFeatures.forEach(featureId => {
      const feature = getFeature(featureId);
      if (feature && !allFeatures.find(f => f.id === featureId)) {
        allFeatures.push({
          ...feature,
          enabled: featureOverrides[featureId] !== undefined ? featureOverrides[featureId] : true,
          source: 'custom' as const,
        });
      }
    });

    res.json({
      plan: user.plan,
      features: allFeatures,
      customFeatures,
    });
  } catch (error: any) {
    console.error('Get features error:', error);
    res.status(500).json({ error: 'Failed to get features' });
  }
});

/**
 * Get all available features (Admin only)
 * GET /api/features/all
 */
router.get('/all', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const features = getAllFeatures();
    res.json({ features });
  } catch (error: any) {
    console.error('Get all features error:', error);
    res.status(500).json({ error: 'Failed to get all features' });
  }
});

/**
 * Check if user has access to a specific feature
 * GET /api/features/check/:featureId
 */
router.get('/check/:featureId', authenticate, async (req: Request, res: Response) => {
  try {
    const { featureId } = req.params;
    const userId = (req as any).user?.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check plan access
    const hasPlanAccess = hasFeatureAccess(user.plan, featureId);

    // Check custom features
    const company = await Company.findOne({ userId: user._id });
    const customFeatures = company?.customFeatures || [];
    const hasCustomFeature = customFeatures.includes(featureId);

    // Check feature overrides
    const featureOverrides = company?.featureOverrides || {};
    const isOverridden = featureOverrides[featureId] !== undefined;
    const overrideValue = isOverridden ? featureOverrides[featureId] : null;

    const hasAccess = overrideValue !== null ? overrideValue : (hasPlanAccess || hasCustomFeature);

    res.json({
      featureId,
      hasAccess,
      source: hasCustomFeature ? 'custom' : hasPlanAccess ? 'plan' : 'none',
      overridden: isOverridden,
    });
  } catch (error: any) {
    console.error('Check feature error:', error);
    res.status(500).json({ error: 'Failed to check feature' });
  }
});

/**
 * Add custom features to a company (Admin only)
 * POST /api/features/company/:companyId
 */
router.post(
  '/company/:companyId',
  authenticate,
  requireAdmin,
  [
    body('features').isArray().withMessage('Features must be an array'),
    body('features.*').isString().withMessage('Each feature must be a string'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { companyId } = req.params;
      const { features } = req.body;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Validate features exist
      const { getAllFeatures } = await import('../config/features');
      const allFeatures = getAllFeatures();
      const validFeatureIds = allFeatures.map(f => f.id);
      
      const invalidFeatures = features.filter((f: string) => !validFeatureIds.includes(f));
      if (invalidFeatures.length > 0) {
        return res.status(400).json({
          error: 'Invalid features',
          invalidFeatures,
        });
      }

      // Add custom features (avoid duplicates)
      const existingFeatures = company.customFeatures || [];
      const newFeatures = [...new Set([...existingFeatures, ...features])];
      
      company.customFeatures = newFeatures;
      await company.save();

      res.json({
        message: 'Custom features added successfully',
        company: {
          id: company._id,
          name: company.name,
          customFeatures: company.customFeatures,
        },
      });
    } catch (error: any) {
      console.error('Add custom features error:', error);
      res.status(500).json({ error: 'Failed to add custom features' });
    }
  }
);

/**
 * Remove custom features from a company (Admin only)
 * DELETE /api/features/company/:companyId
 */
router.delete(
  '/company/:companyId',
  authenticate,
  requireAdmin,
  [
    body('features').isArray().withMessage('Features must be an array'),
    body('features.*').isString().withMessage('Each feature must be a string'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { companyId } = req.params;
      const { features } = req.body;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const existingFeatures = company.customFeatures || [];
      company.customFeatures = existingFeatures.filter(f => !features.includes(f));
      await company.save();

      res.json({
        message: 'Custom features removed successfully',
        company: {
          id: company._id,
          name: company.name,
          customFeatures: company.customFeatures,
        },
      });
    } catch (error: any) {
      console.error('Remove custom features error:', error);
      res.status(500).json({ error: 'Failed to remove custom features' });
    }
  }
);

/**
 * Override feature for a company (Admin only)
 * POST /api/features/company/:companyId/override
 */
router.post(
  '/company/:companyId/override',
  authenticate,
  requireAdmin,
  [
    body('featureId').isString().notEmpty().withMessage('Feature ID is required'),
    body('enabled').isBoolean().withMessage('Enabled must be a boolean'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { companyId } = req.params;
      const { featureId, enabled } = req.body;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      if (!company.featureOverrides) {
        company.featureOverrides = {};
      }

      if (enabled) {
        // Remove override to use default
        delete company.featureOverrides[featureId];
      } else {
        // Disable feature
        company.featureOverrides[featureId] = false;
      }

      await company.save();

      res.json({
        message: 'Feature override updated successfully',
        company: {
          id: company._id,
          name: company.name,
          featureOverrides: company.featureOverrides,
        },
      });
    } catch (error: any) {
      console.error('Override feature error:', error);
      res.status(500).json({ error: 'Failed to override feature' });
    }
  }
);

export default router;

