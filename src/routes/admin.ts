import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import Company from '../models/Company';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';
import { emailService } from '../services/emailService';
import { canAddUser } from '../services/userLimitService';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * Create a new user (Admin only)
 * POST /api/admin/users
 */
router.post(
  '/users',
  [
    body('email').isEmail().normalizeEmail(),
    body('name').trim().notEmpty(),
    body('companyId').optional().isMongoId().withMessage('Invalid company ID'),
    body('plan').optional().isIn(['starter', 'pro', 'enterprise']),
    body('role').optional().isIn(['USER', 'ADMIN', 'AUDITOR']),
    body('sendInvitation').optional().isBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, name, companyId, plan = 'starter', role = 'USER', sendInvitation = true } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // If companyId is provided, check user limit
      if (companyId) {
        const limitCheck = await canAddUser(companyId);
        if (!limitCheck.canAdd) {
          return res.status(403).json({
            error: limitCheck.message || 'User limit reached for this company',
            currentCount: limitCheck.currentCount,
            maxUsers: limitCheck.maxUsers
          });
        }
      }

      // Generate temporary password
      const tempPassword = crypto.randomBytes(12).toString('base64').slice(0, 12);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Create user
      const user = new User({
        email,
        password: hashedPassword,
        name,
        companyId: companyId || null,
        plan,
        role
      });

      await user.save();

      // Send invitation email if requested
      if (sendInvitation) {
        try {
          await emailService.sendUserInvitation(email, name, tempPassword);
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError);
          // Don't fail the request if email fails
        }
      }

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          role: user.role
        },
        // Only return password if email sending failed
        ...(sendInvitation ? {} : { temporaryPassword: tempPassword })
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

/**
 * Get all users (Admin only)
 * GET /api/admin/users
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password -resetToken -resetTokenExpiry').sort({ createdAt: -1 });
    
    res.json({
      users: users.map(user => ({
        id: user._id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get user by ID (Admin only)
 * GET /api/admin/users/:id
 */
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-password -resetToken -resetTokenExpiry');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Update user (Admin only)
 * PUT /api/admin/users/:id
 */
router.put(
  '/users/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('plan').optional().isIn(['starter', 'pro', 'enterprise']),
    body('role').optional().isIn(['USER', 'ADMIN', 'AUDITOR'])
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, plan, role } = req.body;
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update fields
      if (name) user.name = name;
      if (plan) user.plan = plan;
      if (role) user.role = role;

      await user.save();

      res.json({
        message: 'User updated successfully',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

/**
 * Reset user password (Admin only)
 * POST /api/admin/users/:id/reset-password
 */
router.post(
  '/users/:id/reset-password',
  [
    body('sendEmail').optional().isBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const { sendEmail = true } = req.body;
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate new temporary password
      const tempPassword = crypto.randomBytes(12).toString('base64').slice(0, 12);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      user.password = hashedPassword;
      await user.save();

      // Send password reset email if requested
      if (sendEmail) {
        try {
          await emailService.sendPasswordResetByAdmin(user.email, user.name, tempPassword);
        } catch (emailError) {
          console.error('Failed to send password reset email:', emailError);
        }
      }

      res.json({
        message: 'Password reset successfully',
        // Only return password if email sending failed
        ...(sendEmail ? {} : { temporaryPassword: tempPassword })
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

/**
 * Delete user (Admin only)
 * DELETE /api/admin/users/:id
 */
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting yourself
    if (user._id.toString() === (req as AuthRequest).userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await user.deleteOne();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Create new client (Company + User) (Admin only)
 * POST /api/admin/clients
 * Creates both company and user account in one transaction
 */
router.post(
  '/clients',
  [
    // Company fields
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('industry').isIn(['Manufacturing', 'IT/Software', 'Textiles', 'Pharmaceuticals', 'Food Processing', 'Automotive', 'Chemicals', 'Others']).withMessage('Invalid industry'),
    body('employeeCount').isInt({ min: 10, max: 500 }).withMessage('Employee count must be between 10 and 500'),
    body('annualRevenue').isNumeric().withMessage('Annual revenue must be a number'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('reportingYear').optional().isInt({ min: 2020, max: 2030 }).withMessage('Reporting year must be between 2020 and 2030'),
    // User fields
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('name').trim().notEmpty().withMessage('User name is required'),
    body('plan').isIn(['starter', 'pro', 'enterprise']).withMessage('Plan must be starter, pro, or enterprise'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('sendInvitation').optional().isBoolean()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        // Company data
        companyName,
        industry,
        employeeCount,
        annualRevenue,
        location,
        reportingYear = new Date().getFullYear(),
        // User data
        email,
        name,
        plan,
        password,
        sendInvitation = true
      } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Check if company with same name exists
      const existingCompany = await Company.findOne({ name: companyName });
      if (existingCompany) {
        return res.status(400).json({ error: 'Company with this name already exists' });
      }

      // Generate password if not provided
      const tempPassword = password || crypto.randomBytes(12).toString('base64').slice(0, 12);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Create user first
      const user = new User({
        email,
        password: hashedPassword,
        name,
        plan,
        role: 'USER' // New clients are always regular users
      });

      // Create company (client) first
      const company = new Company({
        userId: user._id,
        name: companyName,
        industry,
        employeeCount: parseInt(employeeCount),
        annualRevenue: parseFloat(annualRevenue),
        location,
        reportingYear: parseInt(reportingYear),
        plan: plan || 'starter' // Plan is company-specific
      });

      // Set subscription status based on plan
      if (plan === 'pro') {
        // Pro plan gets 14-day trial
        company.subscriptionStatus = 'trial';
        company.isTrial = true;
        const now = new Date();
        company.trialStartDate = now;
        const trialEndDate = new Date(now);
        trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 days
        company.trialEndDate = trialEndDate;
      } else {
        // Starter and Enterprise start as active (no trial)
        company.subscriptionStatus = 'active';
        company.isTrial = false;
      }

      await company.save();

      // Link user to company
      user.companyId = company._id;
      await user.save();

      // Send invitation email if requested
      if (sendInvitation) {
        try {
          await emailService.sendUserInvitation(email, name, tempPassword, companyName);
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError);
          // Don't fail the request if email fails
        }
      }

      res.status(201).json({
        message: 'Client created successfully',
        client: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            plan: user.plan,
            role: user.role
          },
          company: {
            id: company._id,
            name: company.name,
            industry: company.industry,
            location: company.location
          }
        },
        // Only return password if email sending failed or not requested
        ...(sendInvitation ? {} : { temporaryPassword: tempPassword })
      });
    } catch (error: any) {
      console.error('Create client error:', error);
      
      // If user was created but company creation failed, clean up
      if (error.name === 'ValidationError' && error.message.includes('Company')) {
        try {
          const user = await User.findOne({ email: req.body.email });
          if (user) {
            await user.deleteOne();
          }
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      }
      
      res.status(500).json({ error: error.message || 'Server error' });
    }
  }
);

export default router;

