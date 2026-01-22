import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import ESGScore from '../models/ESGScore';
import Company from '../models/Company';
import EnvironmentalMetrics from '../models/EnvironmentalMetrics';
import SocialMetrics from '../models/SocialMetrics';
import GovernanceMetrics from '../models/GovernanceMetrics';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculateESGScore } from '../services/esgScoring';
import { generatePDFReport, generateExcelReport } from '../services/reportGenerator';
import {
  getRiskLevel,
  getEnvironmentalCompleteness,
  getSocialCompleteness,
  getGovernanceCompleteness,
  getOverallCompleteness,
  getImpactExplanation
} from '../services/dataCompleteness';

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

      // Check if all required metrics exist before calculating
      const [envMetrics, socialMetrics, govMetrics] = await Promise.all([
        EnvironmentalMetrics.findOne({ companyId, period }).sort({ createdAt: -1 }),
        SocialMetrics.findOne({ companyId, period }).sort({ createdAt: -1 }),
        GovernanceMetrics.findOne({ companyId, period }).sort({ createdAt: -1 })
      ]);

      const missingMetrics: string[] = [];
      if (!envMetrics) missingMetrics.push('Environmental');
      if (!socialMetrics) missingMetrics.push('Social');
      if (!govMetrics) missingMetrics.push('Governance');

      if (missingMetrics.length > 0) {
        return res.status(400).json({
          error: `Cannot calculate ESG score: Missing ${missingMetrics.join(', ')} metrics for period ${period}`,
          missingMetrics,
          period,
          suggestion: 'Please create all three metric types (Environmental, Social, and Governance) for the same period before calculating scores.'
        });
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

    // Get stored scores
    let scores = await ESGScore.find({ companyId }).sort({ period: -1 });

    // If no stored scores, try to calculate from existing metrics
    if (scores.length === 0) {
      try {
        // Get all periods that have metrics
        const [envPeriods, socialPeriods, govPeriods] = await Promise.all([
          EnvironmentalMetrics.distinct('period', { companyId }),
          SocialMetrics.distinct('period', { companyId }),
          GovernanceMetrics.distinct('period', { companyId })
        ]);

        // Find periods that have all three metric types
        const allPeriods = [...new Set([...envPeriods, ...socialPeriods, ...govPeriods])];
        const completePeriods = allPeriods.filter(period => 
          envPeriods.includes(period) && 
          socialPeriods.includes(period) && 
          govPeriods.includes(period)
        );

        // Calculate scores for complete periods (sorted newest first)
        const sortedPeriods = completePeriods.sort().reverse(); // Newest first
        const calculatedScores = [];
        for (const period of sortedPeriods.slice(0, 12)) { // Limit to 12 periods, newest first
          try {
            const scoreData = await calculateESGScore(companyId, period);
            
            // Validate scores are not NaN before saving
            if (isNaN(scoreData.environmentalScore) || isNaN(scoreData.socialScore) || 
                isNaN(scoreData.governanceScore) || isNaN(scoreData.overallScore)) {
              console.warn(`Skipping period ${period} - calculated scores contain NaN values`);
              continue;
            }
            
            // Save the calculated score
            let esgScore = await ESGScore.findOne({ companyId, period });
            if (esgScore) {
              esgScore.environmentalScore = scoreData.environmentalScore;
              esgScore.socialScore = scoreData.socialScore;
              esgScore.governanceScore = scoreData.governanceScore;
              esgScore.overallScore = scoreData.overallScore;
              esgScore.calculatedAt = new Date();
              await esgScore.save();
            } else {
              esgScore = new ESGScore({
                companyId,
                period,
                ...scoreData
              });
              await esgScore.save();
            }
            calculatedScores.push(esgScore);
          } catch (error: any) {
            // Skip periods with incomplete data or calculation errors
            console.warn(`Skipping period ${period} due to: ${error.message || 'incomplete metrics'}`);
          }
        }

        // Return calculated scores
        scores = calculatedScores.sort((a, b) => 
          b.period.localeCompare(a.period)
        );
      } catch (error) {
        console.error('Error auto-calculating scores:', error);
        // Return empty array if calculation fails
      }
    }

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

    // Get all periods that have metrics (real-time data)
    const [envMetrics, socialMetrics, govMetrics] = await Promise.all([
      EnvironmentalMetrics.find({ companyId }).sort({ period: -1 }),
      SocialMetrics.find({ companyId }).sort({ period: -1 }),
      GovernanceMetrics.find({ companyId }).sort({ period: -1 })
    ]);

    // Get unique periods from all metrics
    const allPeriods = Array.from(new Set([
      ...envMetrics.map(m => m.period),
      ...socialMetrics.map(m => m.period),
      ...govMetrics.map(m => m.period)
    ])).sort().reverse();

    if (allPeriods.length === 0) {
      return res.json({
        scorecard: null,
        trends: [],
        periods: [],
        message: 'No ESG metrics found. Please add metrics to calculate scores.'
      });
    }

    // Calculate score grade helper
    const getScoreGrade = (score: number): { grade: string; color: string; label: string } => {
      if (score >= 90) return { grade: 'A+', color: '#10b981', label: 'Excellent' };
      if (score >= 80) return { grade: 'A', color: '#22c55e', label: 'Very Good' };
      if (score >= 70) return { grade: 'B', color: '#84cc16', label: 'Good' };
      if (score >= 60) return { grade: 'C', color: '#eab308', label: 'Fair' };
      if (score >= 50) return { grade: 'D', color: '#f59e0b', label: 'Needs Improvement' };
      return { grade: 'F', color: '#ef4444', label: 'Poor' };
    };

    // Calculate scores for all periods (real-time)
    const calculatedScores: Array<{
      period: string;
      overallScore: number;
      environmentalScore: number;
      socialScore: number;
      governanceScore: number;
      calculatedAt: Date;
    }> = [];

    for (const p of allPeriods.slice(0, 12)) { // Limit to last 12 periods for performance
      try {
        const scores = await calculateESGScore(companyId, p);
        calculatedScores.push({
          period: p,
          overallScore: scores.overallScore,
          environmentalScore: scores.environmentalScore,
          socialScore: scores.socialScore,
          governanceScore: scores.governanceScore,
          calculatedAt: new Date()
        });
      } catch (error) {
        // Skip periods with incomplete data
        console.warn(`Skipping period ${p} due to incomplete metrics`);
      }
    }

    if (calculatedScores.length === 0) {
      return res.json({
        scorecard: null,
        trends: [],
        periods: allPeriods,
        message: 'No complete ESG metrics found. Please ensure all metrics (Environmental, Social, Governance) are filled for at least one period.'
      });
    }

    // Determine which period to show
    const targetPeriod = period || calculatedScores[0].period;
    const currentScore = calculatedScores.find(s => s.period === targetPeriod) || calculatedScores[0];
    
    // Find previous period (chronologically earlier - array is sorted newest first)
    const currentIndex = calculatedScores.findIndex(s => s.period === currentScore.period);
    const previousScore = currentIndex >= 0 && currentIndex < calculatedScores.length - 1 
      ? calculatedScores[currentIndex + 1] 
      : null;

    // Get metrics for the target period to calculate completeness
    const [envMetric, socialMetric, govMetric] = await Promise.all([
      EnvironmentalMetrics.findOne({ companyId, period: targetPeriod }).sort({ createdAt: -1 }),
      SocialMetrics.findOne({ companyId, period: targetPeriod }).sort({ createdAt: -1 }),
      GovernanceMetrics.findOne({ companyId, period: targetPeriod }).sort({ createdAt: -1 })
    ]);

    // Calculate data completeness
    const envCompleteness = envMetric ? getEnvironmentalCompleteness(envMetric.toObject()) : { completeness: 0, completed: [], missing: [], missingCritical: [] };
    const socialCompleteness = socialMetric ? getSocialCompleteness(socialMetric.toObject()) : { completeness: 0, completed: [], missing: [], missingCritical: [] };
    const govCompleteness = govMetric ? getGovernanceCompleteness(govMetric.toObject()) : { completeness: 0, completed: [], missing: [], missingCritical: [] };
    const overallCompleteness = getOverallCompleteness(envCompleteness.completeness, socialCompleteness.completeness, govCompleteness.completeness);

    // Calculate risk levels
    const overallRisk = getRiskLevel(currentScore.overallScore);
    const envRisk = getRiskLevel(currentScore.environmentalScore);
    const socialRisk = getRiskLevel(currentScore.socialScore);
    const govRisk = getRiskLevel(currentScore.governanceScore);

    // Build scorecard
    const scorecard = {
      period: currentScore.period,
      overallScore: currentScore.overallScore,
      overallGrade: getScoreGrade(currentScore.overallScore),
      overallRisk: overallRisk.level,
      overallRiskColor: overallRisk.color,
      dataCompleteness: overallCompleteness,
      environmentalScore: currentScore.environmentalScore,
      environmentalGrade: getScoreGrade(currentScore.environmentalScore),
      environmentalRisk: envRisk.level,
      environmentalRiskColor: envRisk.color,
      environmentalCompleteness: envCompleteness.completeness,
      environmentalCompleted: envCompleteness.completed,
      environmentalMissing: envCompleteness.missing,
      environmentalMissingCritical: envCompleteness.missingCritical,
      environmentalImpact: getImpactExplanation('Environmental', currentScore.environmentalScore, envCompleteness.missingCritical),
      socialScore: currentScore.socialScore,
      socialGrade: getScoreGrade(currentScore.socialScore),
      socialRisk: socialRisk.level,
      socialRiskColor: socialRisk.color,
      socialCompleteness: socialCompleteness.completeness,
      socialCompleted: socialCompleteness.completed,
      socialMissing: socialCompleteness.missing,
      socialMissingCritical: socialCompleteness.missingCritical,
      socialImpact: getImpactExplanation('Social', currentScore.socialScore, socialCompleteness.missingCritical),
      governanceScore: currentScore.governanceScore,
      governanceGrade: getScoreGrade(currentScore.governanceScore),
      governanceRisk: govRisk.level,
      governanceRiskColor: govRisk.color,
      governanceCompleteness: govCompleteness.completeness,
      governanceCompleted: govCompleteness.completed,
      governanceMissing: govCompleteness.missing,
      governanceMissingCritical: govCompleteness.missingCritical,
      governanceImpact: getImpactExplanation('Governance', currentScore.governanceScore, govCompleteness.missingCritical),
      calculatedAt: currentScore.calculatedAt.toISOString(),
      previousPeriod: previousScore ? {
        period: previousScore.period,
        overallScore: previousScore.overallScore,
        change: currentScore.overallScore - previousScore.overallScore,
        environmentalChange: currentScore.environmentalScore - previousScore.environmentalScore,
        socialChange: currentScore.socialScore - previousScore.socialScore,
        governanceChange: currentScore.governanceScore - previousScore.governanceScore,
      } : null
    };

    // Build trends (last 6 periods, reversed for chronological order)
    const trendScores = calculatedScores.slice(0, 6).reverse();
    const trends = trendScores.map((score, index) => {
      const previousTrendScore = index > 0 ? trendScores[index - 1] : null;
      return {
        period: score.period,
        overallScore: score.overallScore,
        environmentalScore: score.environmentalScore,
        socialScore: score.socialScore,
        governanceScore: score.governanceScore,
        calculatedAt: score.calculatedAt.toISOString(),
        change: previousTrendScore ? {
          overall: score.overallScore - previousTrendScore.overallScore,
          environmental: score.environmentalScore - previousTrendScore.environmentalScore,
          social: score.socialScore - previousTrendScore.socialScore,
          governance: score.governanceScore - previousTrendScore.governanceScore,
        } : null
      };
    });

    res.json({
      scorecard,
      trends,
      periods: allPeriods,
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

