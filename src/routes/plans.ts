import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getAllPlans, getPlanByType } from '../services/planService';
import User from '../models/User';

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

// Get current user's plan
router.get('/current', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const plan = await getPlanByType(user.plan);
    res.json({ 
      plan: user.plan,
      planDetails: plan
    });
  } catch (error: any) {
    console.error('Get current plan error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Update user's plan (for admin or self)
router.put(
  '/update',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { plan } = req.body;

      if (!['starter', 'pro', 'enterprise'].includes(plan)) {
        return res.status(400).json({ error: 'Invalid plan type' });
      }

      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // In production, you'd want to verify payment/subscription here
      user.plan = plan;
      await user.save();

      const planDetails = await getPlanByType(plan);

      res.json({
        message: 'Plan updated successfully',
        plan: user.plan,
        planDetails
      });
    } catch (error: any) {
      console.error('Update plan error:', error);
      res.status(500).json({ error: error.message || 'Server error' });
    }
  }
);

export default router;

