import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import Company from '../models/Company';
import { startTrial, convertTrialToPaid, getTrialEligibility, handleTrialExpiration, getTrialDaysRemaining } from '../services/trialService';

const router = express.Router();

/**
 * Get trial status for company
 * GET /api/trials/status/:companyId
 */
router.get('/status/:companyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check if user has access to this company
    if (company.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const daysRemaining = getTrialDaysRemaining(company);
    const isExpired = company.isTrial && company.trialEndDate && new Date() >= new Date(company.trialEndDate);

    res.json({
      isTrial: company.isTrial || false,
      daysRemaining,
      trialStartDate: company.trialStartDate,
      trialEndDate: company.trialEndDate,
      isExpired,
      subscriptionStatus: company.subscriptionStatus
    });
  } catch (error: any) {
    console.error('Get trial status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Start trial for Pro plan
 * POST /api/trials/start/:companyId
 */
router.post('/start/:companyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check if user has access to this company
    if (company.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await startTrial(req.params.companyId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      message: result.message,
      trialEndDate: result.trialEndDate
    });
  } catch (error: any) {
    console.error('Start trial error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Convert trial to paid subscription
 * POST /api/trials/convert/:companyId
 */
router.post('/convert/:companyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check if user has access to this company
    if (company.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await convertTrialToPaid(req.params.companyId);

    res.json({
      message: 'Trial converted to paid subscription successfully'
    });
  } catch (error: any) {
    console.error('Convert trial error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get trial eligibility for plans
 * GET /api/trials/eligibility
 */
router.get('/eligibility', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const eligibility = {
      starter: getTrialEligibility('starter'),
      pro: getTrialEligibility('pro'),
      enterprise: getTrialEligibility('enterprise')
    };

    res.json({ eligibility });
  } catch (error: any) {
    console.error('Get trial eligibility error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

