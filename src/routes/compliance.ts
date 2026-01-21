import express, { Response } from 'express';
import Company from '../models/Company';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculateBRSRReadiness } from '../services/complianceService';

const router = express.Router();

// Get Compliance Dashboard
router.get('/dashboard/:companyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.params;
    const { period } = req.query;

    // Verify company ownership
    const company = await Company.findOne({
      _id: companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    // Get current period or latest
    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.floor((new Date().getMonth() + 3) / 3);
    const targetPeriod = (period as string) || `${currentYear}-Q${currentQuarter}`;

    // Calculate BRSR readiness
    const readiness = await calculateBRSRReadiness(companyId, targetPeriod);

    // Generate friendly message based on readiness
    let message = '';
    if (readiness.overallReadiness >= 80) {
      message = 'You are very close to enterprise-level ESG compliance.';
    } else if (readiness.overallReadiness >= 60) {
      message = 'You are close to enterprise-level ESG compliance.';
    } else if (readiness.overallReadiness >= 40) {
      message = 'You need to do more work to achieve enterprise-level ESG compliance.';
    } else {
      message = 'You need significant work to achieve enterprise-level ESG compliance.';
    }

    res.json({
      readiness: readiness.overallReadiness,
      message,
      breakdown: readiness.breakdown,
      nextSteps: readiness.nextSteps,
      period: targetPeriod
    });
  } catch (error: any) {
    console.error('Get compliance dashboard error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

export default router;

