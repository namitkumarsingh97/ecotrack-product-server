import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import ESGScore from '../models/ESGScore';
import Company from '../models/Company';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculateESGScore } from '../services/esgScoring';
import { generatePDFReport, generateExcelReport } from '../services/reportGenerator';

const router = express.Router();

// Calculate ESG Score
router.post(
  '/calculate/:companyId',
  authenticate,
  [body('period').notEmpty()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { companyId } = req.params;
      const { period } = req.body;

      // Verify company ownership
      const company = await Company.findOne({
        _id: companyId,
        userId: req.userId
      });

      if (!company) {
        return res.status(404).json({ error: 'Company not found or unauthorized' });
      }

      // Calculate scores
      const scores = await calculateESGScore(companyId, period);

      // Save or update ESG score
      let esgScore = await ESGScore.findOne({ companyId, period });

      if (esgScore) {
        esgScore.environmentalScore = scores.environmentalScore;
        esgScore.socialScore = scores.socialScore;
        esgScore.governanceScore = scores.governanceScore;
        esgScore.overallScore = scores.overallScore;
        esgScore.calculatedAt = new Date();
        await esgScore.save();
      } else {
        esgScore = new ESGScore({
          companyId,
          period,
          ...scores
        });
        await esgScore.save();
      }

      res.json({
        message: 'ESG score calculated successfully',
        score: esgScore
      });
    } catch (error: any) {
      console.error('Calculate ESG score error:', error);
      res.status(500).json({ error: error.message || 'Server error' });
    }
  }
);

// Get ESG Score
router.get('/score/:companyId', authenticate, async (req: AuthRequest, res: Response) => {
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

    const scores = await ESGScore.find({ companyId }).sort({ period: -1 });

    res.json({ scores });
  } catch (error) {
    console.error('Get ESG score error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate Report
router.get('/report/:companyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.params;
    const { format = 'json', period } = req.query;

    // Verify company ownership
    const company = await Company.findOne({
      _id: companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    if (format === 'pdf') {
      const buffer = await generatePDFReport(companyId, period as string);
      res.contentType('application/pdf');
      res.send(buffer);
    } else if (format === 'excel') {
      const buffer = await generateExcelReport(companyId, period as string);
      res.contentType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } else {
      // Return JSON report
      const esgScore = await ESGScore.findOne({ 
        companyId, 
        period: period || { $exists: true } 
      }).sort({ period: -1 });

      res.json({
        company,
        esgScore
      });
    }
  } catch (error: any) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

export default router;

