import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import { emailService } from '../services/emailService';

const router = express.Router();

// Register - DISABLED: Only admins can create users via /admin/users endpoint
// Public registration is disabled for B2B SaaS model
router.post(
  '/register',
  async (req: Request, res: Response) => {
    res.status(403).json({ 
      error: 'Public registration is disabled. Please contact your administrator or request access.',
      contactEmail: process.env.SUPPORT_EMAIL || 'support@ecotrack.in'
    });
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          role: user.role || 'USER'
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get current user (protected route)
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        role: user.role || 'USER',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
router.post('/logout', authenticate, (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

// Forgot Password - Request password reset
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;

      // Find user
      const user = await User.findOne({ email });
      
      // Always return success (security: don't reveal if email exists)
      // But only send email if user exists
      if (user) {
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date();
        resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour expiry

        // Save reset token to user
        user.resetToken = resetToken;
        user.resetTokenExpiry = resetTokenExpiry;
        await user.save();

        // Send password reset email
        try {
          await emailService.sendPasswordResetEmail(email, resetToken);
        } catch (emailError) {
          console.error('Failed to send password reset email:', emailError);
          // Don't fail the request if email fails (user can try again)
          // In production, you might want to log this and alert
        }
      }

      // Always return success message (security best practice)
      res.json({
        message: 'If an account with that email exists, we have sent a password reset link.'
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Reset Password - Reset password with token
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token, password } = req.body;

      // Find user with valid reset token
      const user = await User.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: new Date() } // Token not expired
      });

      if (!user) {
        return res.status(400).json({ 
          error: 'Invalid or expired reset token. Please request a new password reset.' 
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user password and clear reset token
      user.password = hashedPassword;
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      await user.save();

      res.json({
        message: 'Password reset successfully. You can now login with your new password.'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update Profile (authenticated users)
router.put(
  '/profile',
  authenticate,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name } = req.body;
      const user = await User.findById(req.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update name if provided
      if (name) {
        user.name = name;
        await user.save();
      }

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          role: user.role || 'USER',
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Change Password (authenticated users)
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();

      res.json({
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;

