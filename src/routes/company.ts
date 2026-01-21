import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import Company from '../models/Company';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Create company
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty(),
    body('industry').notEmpty(),
    body('employeeCount').isInt({ min: 10, max: 500 }),
    body('annualRevenue').isNumeric(),
    body('location').trim().notEmpty(),
    body('reportingYear').isInt({ min: 2020, max: 2030 })
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const company = new Company({
        userId: req.userId,
        ...req.body
      });

      await company.save();

      res.status(201).json({
        message: 'Company created successfully',
        company
      });
    } catch (error) {
      console.error('Create company error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get all companies for user (must come before /:id route)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const companies = await Company.find({ userId: req.userId });
    res.json({ companies });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get company by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const company = await Company.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({ company });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update company
router.put(
  '/:id',
  authenticate,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('industry').optional().notEmpty().withMessage('Industry cannot be empty'),
    body('employeeCount').optional().isInt({ min: 10, max: 500 }).withMessage('Employee count must be between 10 and 500'),
    body('annualRevenue').optional().isNumeric().withMessage('Annual revenue must be a number'),
    body('location').optional().trim().notEmpty().withMessage('Location cannot be empty'),
    body('reportingYear').optional().isInt({ min: 2020, max: 2030 }).withMessage('Reporting year must be between 2020 and 2030'),
    body('plan').optional().isIn(['starter', 'pro', 'enterprise']).withMessage('Plan must be starter, pro, or enterprise')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.userId;

      console.log('PUT /company/:id - Request received:', { id, userId, body: req.body });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      // Validate MongoDB ObjectId format
      if (!id || id.length !== 24) {
        console.log('Invalid ID format:', id);
        return res.status(400).json({ error: 'Invalid company ID format' });
      }

      // Check if company exists and belongs to user
      const existingCompany = await Company.findOne({
        _id: id,
        userId: userId
      });

      if (!existingCompany) {
        return res.status(404).json({ error: 'Company not found or you do not have permission to update it' });
      }

      // Update company
      const company = await Company.findOneAndUpdate(
        { _id: id, userId: userId },
        req.body,
        { new: true, runValidators: true }
      );

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      res.json({
        message: 'Company updated successfully',
        company
      });
    } catch (error: any) {
      console.error('Update company error:', error);
      
      // Handle MongoDB validation errors
      if (error.name === 'ValidationError') {
        return res.status(400).json({ error: error.message });
      }
      
      // Handle cast errors (invalid ObjectId)
      if (error.name === 'CastError') {
        return res.status(400).json({ error: 'Invalid company ID format' });
      }
      
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete company
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const company = await Company.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({
      message: 'Company deleted successfully'
    });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

