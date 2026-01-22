import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import EnvironmentalMetrics from '../models/EnvironmentalMetrics';
import SocialMetrics from '../models/SocialMetrics';
import GovernanceMetrics from '../models/GovernanceMetrics';
import Company from '../models/Company';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Middleware to verify company ownership
const verifyCompanyOwnership = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const company = await Company.findOne({
      _id: req.body.companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET Available Periods
router.get('/periods', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
    
    // Generate periods: last 2 years + current year + next 2 years (all quarters)
    const periods: string[] = [];
    
    // Last 2 years
    for (let year = currentYear - 2; year < currentYear; year++) {
      for (let quarter = 1; quarter <= 4; quarter++) {
        periods.push(`${year}-Q${quarter}`);
      }
    }
    
    // Current year (up to current quarter)
    for (let quarter = 1; quarter <= currentQuarter; quarter++) {
      periods.push(`${currentYear}-Q${quarter}`);
    }
    
    // Next 2 years (all quarters)
    for (let year = currentYear + 1; year <= currentYear + 2; year++) {
      for (let quarter = 1; quarter <= 4; quarter++) {
        periods.push(`${year}-Q${quarter}`);
      }
    }
    
    // Also add annual periods (optional - if needed)
    // for (let year = currentYear - 2; year <= currentYear + 2; year++) {
    //   periods.push(`${year}-Annual`);
    // }
    
    res.json({ periods });
  } catch (error) {
    console.error('Get periods error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST Environmental Metrics
router.post(
  '/environment',
  authenticate,
  verifyCompanyOwnership,
  [
    body('companyId').notEmpty(),
    body('period').notEmpty(),
    // All other fields are optional - validation happens at model level
    body('electricityKwh').optional().isNumeric(),
    body('fuelLitres').optional().isNumeric(),
    body('scope1Emissions').optional().isNumeric(),
    body('scope2Emissions').optional().isNumeric(),
    body('scope3Emissions').optional().isNumeric(),
    body('waterUsageKL').optional().isNumeric(),
    body('totalWasteTonnes').optional().isNumeric(),
    // Legacy fields for backward compatibility
    body('electricityUsageKwh').optional().isNumeric(),
    body('fuelConsumptionLitres').optional().isNumeric(),
    body('wasteGeneratedKg').optional().isNumeric(),
    body('carbonEmissionsTons').optional().isNumeric(),
    body('renewableEnergyPercent').optional().isFloat({ min: 0, max: 100 }),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const metrics = new EnvironmentalMetrics(req.body);
      await metrics.save();

      res.status(201).json({
        message: 'Environmental metrics saved successfully',
        metrics
      });
    } catch (error) {
      console.error('Save environmental metrics error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST Social Metrics
router.post(
  '/social',
  authenticate,
  verifyCompanyOwnership,
  [
    body('companyId').notEmpty(),
    body('period').notEmpty()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Validate and normalize percentage fields (0-100)
      const body = { ...req.body };
      
      // Ensure percentage fields are within valid range
      if (body.femalePercentWorkforce !== undefined && body.femalePercentWorkforce !== null) {
        const value = Number(body.femalePercentWorkforce);
        if (value > 100) {
          // If value > 100, it might be a count instead of percentage
          // Calculate percentage if totalEmployees is available
          if (body.totalEmployeesPermanent || body.totalEmployees || body.femaleEmployees) {
            const total = Number(body.totalEmployeesPermanent || body.totalEmployees || 0);
            if (total > 0) {
              body.femalePercentWorkforce = Math.min(100, Math.round((value / total) * 100 * 100) / 100);
            } else {
              body.femalePercentWorkforce = Math.min(100, value);
            }
          } else {
            // Cap at 100 if it's clearly a percentage error
            body.femalePercentWorkforce = Math.min(100, value);
          }
        } else if (value < 0) {
          body.femalePercentWorkforce = 0;
        }
      }
      
      if (body.womenInManagementPercent !== undefined && body.womenInManagementPercent !== null) {
        const value = Number(body.womenInManagementPercent);
        body.womenInManagementPercent = Math.max(0, Math.min(100, value));
      }
      
      if (body.csrSpendPercent !== undefined && body.csrSpendPercent !== null) {
        const value = Number(body.csrSpendPercent);
        body.csrSpendPercent = Math.max(0, Math.min(100, value));
      }
      
      if (body.employeeTurnoverPercent !== undefined && body.employeeTurnoverPercent !== null) {
        const value = Number(body.employeeTurnoverPercent);
        body.employeeTurnoverPercent = Math.max(0, Math.min(100, value));
      }

      const metrics = new SocialMetrics(body);
      await metrics.save();

      res.status(201).json({
        message: 'Social metrics saved successfully',
        metrics
      });
    } catch (error) {
      console.error('Save social metrics error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST Governance Metrics
router.post(
  '/governance',
  authenticate,
  verifyCompanyOwnership,
  [
    body('companyId').notEmpty(),
    body('period').notEmpty()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const metrics = new GovernanceMetrics(req.body);
      await metrics.save();

      res.status(201).json({
        message: 'Governance metrics saved successfully',
        metrics
      });
    } catch (error) {
      console.error('Save governance metrics error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET single environmental metric by ID
router.get('/environment/id/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const metric = await EnvironmentalMetrics.findById(req.params.id);
    if (!metric) {
      return res.status(404).json({ error: 'Metric not found' });
    }

    const company = await Company.findOne({
      _id: metric.companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    res.json({ metric });
  } catch (error) {
    console.error('Get environmental metric error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all environmental metrics for a company
router.get('/environment/:companyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const company = await Company.findOne({
      _id: req.params.companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    const metrics = await EnvironmentalMetrics.find({ companyId: req.params.companyId }).sort({ period: -1 });
    res.json({ metrics });
  } catch (error) {
    console.error('Get environmental metrics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET social metric by ID (must come before /social/:companyId to avoid route conflicts)
router.get('/social/id/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const metric = await SocialMetrics.findById(req.params.id);
    if (!metric) {
      return res.status(404).json({ error: 'Metric not found' });
    }

    const company = await Company.findOne({
      _id: metric.companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    res.json({ metric });
  } catch (error) {
    console.error('Get social metric by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all social metrics for a company
router.get('/social/:companyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const company = await Company.findOne({
      _id: req.params.companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    const metrics = await SocialMetrics.find({ companyId: req.params.companyId }).sort({ period: -1 });
    res.json({ metrics });
  } catch (error) {
    console.error('Get social metrics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET governance metric by ID (must come before /governance/:companyId to avoid route conflicts)
router.get('/governance/id/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const metric = await GovernanceMetrics.findById(req.params.id);
    if (!metric) {
      return res.status(404).json({ error: 'Metric not found' });
    }

    const company = await Company.findOne({
      _id: metric.companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    res.json({ metric });
  } catch (error) {
    console.error('Get governance metric by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all governance metrics for a company
router.get('/governance/:companyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const company = await Company.findOne({
      _id: req.params.companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    const metrics = await GovernanceMetrics.find({ companyId: req.params.companyId }).sort({ period: -1 });
    res.json({ metrics });
  } catch (error) {
    console.error('Get governance metrics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update environmental metrics
router.put(
  '/environment/:id',
  authenticate,
  [
    // All fields are optional for updates
    body('electricityKwh').optional().isNumeric(),
    body('fuelLitres').optional().isNumeric(),
    body('scope1Emissions').optional().isNumeric(),
    body('scope2Emissions').optional().isNumeric(),
    body('scope3Emissions').optional().isNumeric(),
    body('waterUsageKL').optional().isNumeric(),
    body('totalWasteTonnes').optional().isNumeric(),
    // Legacy fields for backward compatibility
    body('electricityUsageKwh').optional().isNumeric(),
    body('fuelConsumptionLitres').optional().isNumeric(),
    body('wasteGeneratedKg').optional().isNumeric(),
    body('carbonEmissionsTons').optional().isNumeric(),
    body('renewableEnergyPercent').optional().isFloat({ min: 0, max: 100 }),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const metrics = await EnvironmentalMetrics.findById(req.params.id);
      if (!metrics) {
        return res.status(404).json({ error: 'Metrics not found' });
      }

      const company = await Company.findOne({
        _id: metrics.companyId,
        userId: req.userId
      });

      if (!company) {
        return res.status(404).json({ error: 'Company not found or unauthorized' });
      }

      Object.assign(metrics, req.body);
      await metrics.save();

      res.json({ message: 'Environmental metrics updated successfully', metrics });
    } catch (error) {
      console.error('Update environmental metrics error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// PUT update social metrics
router.put('/social/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const metrics = await SocialMetrics.findById(req.params.id);
    if (!metrics) {
      return res.status(404).json({ error: 'Metrics not found' });
    }

    const company = await Company.findOne({
      _id: metrics.companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    // Validate and normalize percentage fields (0-100)
    const body = { ...req.body };
    
    // Ensure percentage fields are within valid range
    if (body.femalePercentWorkforce !== undefined && body.femalePercentWorkforce !== null) {
      const value = Number(body.femalePercentWorkforce);
      if (value > 100) {
        // If value > 100, it might be a count instead of percentage
        // Calculate percentage if totalEmployees is available
        if (body.totalEmployeesPermanent || body.totalEmployees || body.femaleEmployees) {
          const total = Number(body.totalEmployeesPermanent || body.totalEmployees || 0);
          if (total > 0) {
            body.femalePercentWorkforce = Math.min(100, Math.round((value / total) * 100 * 100) / 100);
          } else {
            body.femalePercentWorkforce = Math.min(100, value);
          }
        } else {
          // Cap at 100 if it's clearly a percentage error
          body.femalePercentWorkforce = Math.min(100, value);
        }
      } else if (value < 0) {
        body.femalePercentWorkforce = 0;
      }
    }
    
    if (body.womenInManagementPercent !== undefined && body.womenInManagementPercent !== null) {
      const value = Number(body.womenInManagementPercent);
      body.womenInManagementPercent = Math.max(0, Math.min(100, value));
    }
    
    if (body.csrSpendPercent !== undefined && body.csrSpendPercent !== null) {
      const value = Number(body.csrSpendPercent);
      body.csrSpendPercent = Math.max(0, Math.min(100, value));
    }
    
    if (body.employeeTurnoverPercent !== undefined && body.employeeTurnoverPercent !== null) {
      const value = Number(body.employeeTurnoverPercent);
      body.employeeTurnoverPercent = Math.max(0, Math.min(100, value));
    }

    Object.assign(metrics, body);
    await metrics.save();

    res.json({ message: 'Social metrics updated successfully', metrics });
  } catch (error) {
    console.error('Update social metrics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update governance metrics
router.put('/governance/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const metrics = await GovernanceMetrics.findById(req.params.id);
    if (!metrics) {
      return res.status(404).json({ error: 'Metrics not found' });
    }

    const company = await Company.findOne({
      _id: metrics.companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    Object.assign(metrics, req.body);
    await metrics.save();

    res.json({ message: 'Governance metrics updated successfully', metrics });
  } catch (error) {
    console.error('Update governance metrics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE environmental metrics
router.delete('/environment/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const metrics = await EnvironmentalMetrics.findById(req.params.id);
    if (!metrics) {
      return res.status(404).json({ error: 'Metrics not found' });
    }

    const company = await Company.findOne({
      _id: metrics.companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    await EnvironmentalMetrics.findByIdAndDelete(req.params.id);
    res.json({ message: 'Environmental metrics deleted successfully' });
  } catch (error) {
    console.error('Delete environmental metrics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE social metrics
router.delete('/social/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const metrics = await SocialMetrics.findById(req.params.id);
    if (!metrics) {
      return res.status(404).json({ error: 'Metrics not found' });
    }

    const company = await Company.findOne({
      _id: metrics.companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    await SocialMetrics.findByIdAndDelete(req.params.id);
    res.json({ message: 'Social metrics deleted successfully' });
  } catch (error) {
    console.error('Delete social metrics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE governance metrics
router.delete('/governance/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const metrics = await GovernanceMetrics.findById(req.params.id);
    if (!metrics) {
      return res.status(404).json({ error: 'Metrics not found' });
    }

    const company = await Company.findOne({
      _id: metrics.companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    await GovernanceMetrics.findByIdAndDelete(req.params.id);
    res.json({ message: 'Governance metrics deleted successfully' });
  } catch (error) {
    console.error('Delete governance metrics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET Data Collection Hub Status
router.get('/collection-hub/:companyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.params;

    // Verify company ownership
    const company = await Company.findOne({
      _id: companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    // Get all metrics for the company
    const [environmental, social, governance] = await Promise.all([
      EnvironmentalMetrics.find({ companyId }).sort({ period: -1 }),
      SocialMetrics.find({ companyId }).sort({ period: -1 }),
      GovernanceMetrics.find({ companyId }).sort({ period: -1 })
    ]);

    // Get all unique periods
    const allPeriods = Array.from(new Set([
      ...environmental.map(m => m.period),
      ...social.map(m => m.period),
      ...governance.map(m => m.period)
    ])).sort().reverse();

    // Calculate collection status for each period
    const collectionStatus = allPeriods.map(period => {
      const envMetric = environmental.find(m => m.period === period);
      const socialMetric = social.find(m => m.period === period);
      const govMetric = governance.find(m => m.period === period);

      const modulesCompleted = [
        envMetric ? 'environment' : null,
        socialMetric ? 'social' : null,
        govMetric ? 'governance' : null
      ].filter(Boolean);

      const completionPercentage = (modulesCompleted.length / 3) * 100;
      const isComplete = modulesCompleted.length === 3;

      return {
        period,
        isComplete,
        completionPercentage: Math.round(completionPercentage),
        modules: {
          environment: {
            exists: !!envMetric,
            metricId: envMetric?._id,
            lastUpdated: envMetric?.updatedAt || envMetric?.createdAt
          },
          social: {
            exists: !!socialMetric,
            metricId: socialMetric?._id,
            lastUpdated: socialMetric?.updatedAt || socialMetric?.createdAt
          },
          governance: {
            exists: !!govMetric,
            metricId: govMetric?._id,
            lastUpdated: govMetric?.updatedAt || govMetric?.createdAt
          }
        },
        lastUpdated: [
          envMetric?.updatedAt || envMetric?.createdAt,
          socialMetric?.updatedAt || socialMetric?.createdAt,
          govMetric?.updatedAt || govMetric?.createdAt
        ].filter(Boolean).sort().reverse()[0] || null
      };
    });

    // Calculate overall statistics
    const totalPeriods = allPeriods.length;
    const completePeriods = collectionStatus.filter(s => s.isComplete).length;
    const incompletePeriods = totalPeriods - completePeriods;
    const overallCompletion = totalPeriods > 0 ? Math.round((completePeriods / totalPeriods) * 100) : 0;

    // Module-wise statistics
    const envCount = environmental.length;
    const socialCount = social.length;
    const govCount = governance.length;
    const totalMetrics = envCount + socialCount + govCount;

    res.json({
      company: {
        name: company.name,
        industry: company.industry
      },
      statistics: {
        totalPeriods,
        completePeriods,
        incompletePeriods,
        overallCompletion,
        totalMetrics,
        moduleCounts: {
          environment: envCount,
          social: socialCount,
          governance: govCount
        }
      },
      collectionStatus,
      periods: allPeriods
    });
  } catch (error: any) {
    console.error('Get data collection hub error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// GET all metrics for a company
router.get('/:companyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Verify company ownership
    const company = await Company.findOne({
      _id: req.params.companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    const [environmental, social, governance] = await Promise.all([
      EnvironmentalMetrics.find({ companyId: req.params.companyId }).sort({ period: -1 }),
      SocialMetrics.find({ companyId: req.params.companyId }).sort({ period: -1 }),
      GovernanceMetrics.find({ companyId: req.params.companyId }).sort({ period: -1 })
    ]);

    res.json({
      environmental,
      social,
      governance
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

