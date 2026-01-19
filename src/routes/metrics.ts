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

      const metrics = new SocialMetrics(req.body);
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

    Object.assign(metrics, req.body);
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

