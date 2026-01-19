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

// Get all companies for user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const companies = await Company.find({ userId: req.userId });
    res.json({ companies });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update company
router.put(
  '/:id',
  authenticate,
  [
    body('name').optional().trim().notEmpty(),
    body('industry').optional().notEmpty(),
    body('employeeCount').optional().isInt({ min: 10, max: 500 }),
    body('annualRevenue').optional().isNumeric(),
    body('location').optional().trim().notEmpty(),
    body('reportingYear').optional().isInt({ min: 2020, max: 2030 })
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const company = await Company.findOneAndUpdate(
        { _id: req.params.id, userId: req.userId },
        req.body,
        { new: true }
      );

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      res.json({
        message: 'Company updated successfully',
        company
      });
    } catch (error) {
      console.error('Update company error:', error);
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

