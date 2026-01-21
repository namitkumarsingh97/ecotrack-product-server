import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getAllPlans, getPlanByType } from '../services/planService';
import User from '../models/User';
import Company from '../models/Company';

const router = express.Router();

// Get all plans
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const plans = await getAllPlans();
    res.json({ plans });
  } catch (error: any) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Get current company's plan
router.get('/current', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get company plan (plan is now company-specific)
    const company = await Company.findOne({ userId: req.userId });
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const plan = await getPlanByType(company.plan || 'starter');
    res.json({ 
      plan: company.plan || 'starter',
      planDetails: plan
    });
  } catch (error: any) {
    console.error('Get current plan error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Update company's plan (for admin testing or actual subscription)
router.put(
  '/update',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { plan, companyId } = req.body;

      if (!['starter', 'pro', 'enterprise'].includes(plan)) {
        return res.status(400).json({ error: 'Invalid plan type' });
      }

      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get company - use companyId if provided (for admin), otherwise user's company
      let company;
      if (companyId && user.role === 'ADMIN') {
        // Admin can update any company's plan
        company = await Company.findById(companyId);
      } else {
        // Regular users update their own company's plan
        company = await Company.findOne({ userId: req.userId });
      }

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // In production, you'd want to verify payment/subscription here
      company.plan = plan;
      await company.save();

      const planDetails = await getPlanByType(plan);

      res.json({
        message: 'Company plan updated successfully',
        plan: company.plan,
        planDetails
      });
    } catch (error: any) {
      console.error('Update plan error:', error);
      res.status(500).json({ error: error.message || 'Server error' });
    }
  }
);

export default router;

