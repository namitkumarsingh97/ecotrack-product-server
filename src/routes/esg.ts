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

// Get ESG Scorecard (detailed view with trends and breakdown)
router.get('/scorecard/:companyId', authenticate, async (req: AuthRequest, res: Response) => {
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

    // Get all scores for trends
    const allScores = await ESGScore.find({ companyId }).sort({ period: -1 }).limit(12);
    
    // Get latest score or specific period
    const latestScore = period 
      ? await ESGScore.findOne({ companyId, period }).sort({ calculatedAt: -1 })
      : allScores[0];

    if (!latestScore && allScores.length === 0) {
      return res.json({
        scorecard: null,
        trends: [],
        periods: [],
        message: 'No ESG scores calculated yet'
      });
    }

    // Calculate trends (last 6 periods, reversed for chronological order)
    const trendScores = allScores.slice(0, 6).reverse();
    const trends = trendScores.map((score, index) => {
      const previousScore = index > 0 ? trendScores[index - 1] : null;
      return {
        period: score.period,
        overallScore: score.overallScore,
        environmentalScore: score.environmentalScore,
        socialScore: score.socialScore,
        governanceScore: score.governanceScore,
        calculatedAt: score.calculatedAt || score.createdAt,
        change: previousScore ? {
          overall: score.overallScore - previousScore.overallScore,
          environmental: score.environmentalScore - previousScore.environmentalScore,
          social: score.socialScore - previousScore.socialScore,
          governance: score.governanceScore - previousScore.governanceScore,
        } : null
      };
    });

    // Get unique periods
    const periods = Array.from(new Set(allScores.map(s => s.period))).sort().reverse();

    // Calculate score grade
    const getScoreGrade = (score: number): { grade: string; color: string; label: string } => {
      if (score >= 90) return { grade: 'A+', color: '#10b981', label: 'Excellent' };
      if (score >= 80) return { grade: 'A', color: '#22c55e', label: 'Very Good' };
      if (score >= 70) return { grade: 'B', color: '#84cc16', label: 'Good' };
      if (score >= 60) return { grade: 'C', color: '#eab308', label: 'Fair' };
      if (score >= 50) return { grade: 'D', color: '#f59e0b', label: 'Needs Improvement' };
      return { grade: 'F', color: '#ef4444', label: 'Poor' };
    };

    const scorecard = latestScore ? {
      period: latestScore.period,
      overallScore: latestScore.overallScore,
      overallGrade: getScoreGrade(latestScore.overallScore),
      environmentalScore: latestScore.environmentalScore,
      environmentalGrade: getScoreGrade(latestScore.environmentalScore),
      socialScore: latestScore.socialScore,
      socialGrade: getScoreGrade(latestScore.socialScore),
      governanceScore: latestScore.governanceScore,
      governanceGrade: getScoreGrade(latestScore.governanceScore),
      calculatedAt: latestScore.calculatedAt || latestScore.createdAt,
      // Compare with previous period
      previousPeriod: allScores.length > 1 ? {
        period: allScores[1]?.period,
        overallScore: allScores[1]?.overallScore,
        change: latestScore.overallScore - (allScores[1]?.overallScore || 0),
        environmentalChange: latestScore.environmentalScore - (allScores[1]?.environmentalScore || 0),
        socialChange: latestScore.socialScore - (allScores[1]?.socialScore || 0),
        governanceChange: latestScore.governanceScore - (allScores[1]?.governanceScore || 0),
      } : null
    } : null;

    res.json({
      scorecard,
      trends,
      periods,
      company: {
        name: company.name,
        industry: company.industry
      }
    });
  } catch (error: any) {
    console.error('Get ESG scorecard error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
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

