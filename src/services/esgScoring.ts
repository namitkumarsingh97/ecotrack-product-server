import EnvironmentalMetrics from '../models/EnvironmentalMetrics';
import SocialMetrics from '../models/SocialMetrics';
import GovernanceMetrics from '../models/GovernanceMetrics';
import Company from '../models/Company';

interface ESGScores {
  environmentalScore: number;
  socialScore: number;
  governanceScore: number;
  overallScore: number;
}

/**
 * Calculate Environmental Score (0-100) based on actual performance
 * Factors: Renewable energy %, waste recycled %, energy/water/waste efficiency, emissions
 */
const calculateEnvironmentalScore = (metrics: any, company: any): number => {
  let score = 0;
  let factors = 0;

  // Validate company has employeeCount
  const employeeCount = Number(company?.employeeCount || 0);
  if (isNaN(employeeCount) || employeeCount <= 0) {
    console.warn('Company employeeCount is invalid, defaulting to 100 for calculation');
    company.employeeCount = 100;
  }

  // Get metrics - support both old and new field names
  const electricityUsage = Number(metrics.electricityUsageKwh || metrics.electricityKwh || 0);
  const wasteGenerated = Number(metrics.wasteGeneratedKg || metrics.totalWasteTonnes * 1000 || 0);
  const waterUsage = Number(metrics.waterUsageKL || 0);
  const carbonEmissions = Number(metrics.carbonEmissionsTons || 0);
  const renewableEnergyPercent = Number(metrics.renewableEnergyPercent || 0);
  const wasteRecycledPercent = Number(metrics.wasteRecycledPercent || 0);

  // Renewable Energy % (Higher is better, 0-100%) - Direct score
  if (!isNaN(renewableEnergyPercent) && renewableEnergyPercent >= 0 && renewableEnergyPercent <= 100) {
    score += renewableEnergyPercent; // 50% renewable = 50 points
    factors++;
  }

  // Waste Recycled % (Higher is better, 0-100%) - Direct score
  if (!isNaN(wasteRecycledPercent) && wasteRecycledPercent >= 0 && wasteRecycledPercent <= 100) {
    score += wasteRecycledPercent; // 80% recycled = 80 points
    factors++;
  }

  // Energy Consumption (Lower is better - normalized against benchmark)
  if (!isNaN(electricityUsage) && electricityUsage > 0 && employeeCount > 0) {
    // Benchmark: 500 kWh per employee per year for medium business
    const benchmark = 500 * employeeCount;
    const efficiency = Math.max(0, 100 - (electricityUsage / benchmark) * 50); // Max 50 points
    score += efficiency;
    factors++;
  }

  // Water Consumption (Lower is better)
  if (!isNaN(waterUsage) && waterUsage > 0 && employeeCount > 0) {
    // Benchmark: 100 KL per employee per year
    const benchmark = 100 * employeeCount;
    const efficiency = Math.max(0, 100 - (waterUsage / benchmark) * 50); // Max 50 points
    score += efficiency;
    factors++;
  }

  // Waste Generated (Lower is better)
  if (!isNaN(wasteGenerated) && wasteGenerated > 0 && employeeCount > 0) {
    // Benchmark: 50 kg per employee per year
    const benchmark = 50 * employeeCount;
    const efficiency = Math.max(0, 100 - (wasteGenerated / benchmark) * 50); // Max 50 points
    score += efficiency;
    factors++;
  }

  // Carbon Emissions (Lower is better)
  if (!isNaN(carbonEmissions) && carbonEmissions >= 0 && employeeCount > 0) {
    // Benchmark: 2 tons per employee per year
    const benchmark = 2 * employeeCount;
    const efficiency = Math.max(0, 100 - (carbonEmissions / benchmark) * 50); // Max 50 points
    score += efficiency;
    factors++;
  }

  // Average the score
  return factors > 0 ? Math.max(0, Math.min(100, score / factors)) : 0;
};

/**
 * Calculate Social Score (0-100) based on actual performance
 * Factors: Gender diversity, training, safety, retention, community investment
 */
const calculateSocialScore = (metrics: any): number => {
  let score = 0;
  let factors = 0;

  // Gender diversity (30-50% is ideal)
  let femalePercentage = 0;
  if (metrics.femalePercentWorkforce !== undefined && metrics.femalePercentWorkforce !== null) {
    femalePercentage = Number(metrics.femalePercentWorkforce);
  } else if (metrics.femaleEmployees && metrics.totalEmployees) {
    femalePercentage = (Number(metrics.femaleEmployees) / Number(metrics.totalEmployees)) * 100;
  } else if (metrics.totalEmployeesPermanent) {
    const totalEmployees = Number(metrics.totalEmployeesPermanent) + Number(metrics.totalEmployeesContractual || 0);
    if (metrics.femaleEmployees && totalEmployees > 0) {
      femalePercentage = (Number(metrics.femaleEmployees) / totalEmployees) * 100;
    }
  }

  if (!isNaN(femalePercentage) && femalePercentage >= 0 && femalePercentage <= 100) {
    let diversityScore = 0;
    if (femalePercentage >= 30 && femalePercentage <= 50) {
      diversityScore = 100; // Ideal range
    } else if (femalePercentage >= 20 && femalePercentage < 30) {
      diversityScore = 70 + ((femalePercentage - 20) / 10) * 30; // 20-30%: 70-100
    } else if (femalePercentage > 50 && femalePercentage <= 60) {
      diversityScore = 100 - ((femalePercentage - 50) / 10) * 20; // 50-60%: 100-80
    } else if (femalePercentage >= 10 && femalePercentage < 20) {
      diversityScore = 40 + ((femalePercentage - 10) / 10) * 30; // 10-20%: 40-70
    } else {
      diversityScore = (femalePercentage / 10) * 40; // <10%: 0-40
    }
    score += diversityScore;
    factors++;
  }

  // Training & development (Higher is better, 20+ hours is good)
  const trainingHours = Number(metrics.totalTrainingHoursPerEmployee || metrics.avgTrainingHours || 0);
  if (!isNaN(trainingHours) && trainingHours >= 0) {
    let trainingScore = 0;
    if (trainingHours >= 40) {
      trainingScore = 100; // Excellent
    } else if (trainingHours >= 20) {
      trainingScore = 70 + ((trainingHours - 20) / 20) * 30; // 20-40: 70-100
    } else if (trainingHours >= 10) {
      trainingScore = 40 + ((trainingHours - 10) / 10) * 30; // 10-20: 40-70
    } else {
      trainingScore = (trainingHours / 10) * 40; // 0-10: 0-40
    }
    score += trainingScore;
    factors++;
  }

  // Workplace safety (Lower is better, 0 is perfect)
  const incidents = Number(metrics.accidentIncidents || metrics.workplaceIncidents || 0);
  const totalEmployees = Number(metrics.totalEmployeesPermanent || metrics.totalEmployees || 0);
  if (!isNaN(incidents) && !isNaN(totalEmployees) && totalEmployees > 0) {
    let safetyScore = 0;
    if (incidents === 0) {
      safetyScore = 100; // Perfect
    } else if (incidents <= 2) {
      safetyScore = 100 - (incidents * 15); // 1-2: 85-70
    } else if (incidents <= 5) {
      safetyScore = 70 - ((incidents - 2) * 10); // 3-5: 60-40
    } else {
      safetyScore = Math.max(0, 40 - ((incidents - 5) * 8)); // >5: decreasing
    }
    score += safetyScore;
    factors++;
  }

  // Employee retention (Lower turnover is better, 0-10% is excellent)
  const turnoverPercent = Number(metrics.employeeTurnoverPercent || 0);
  if (!isNaN(turnoverPercent) && turnoverPercent >= 0 && turnoverPercent <= 100) {
    let retentionScore = 0;
    if (turnoverPercent <= 5) {
      retentionScore = 100; // Excellent
    } else if (turnoverPercent <= 10) {
      retentionScore = 100 - ((turnoverPercent - 5) / 5) * 20; // 5-10%: 100-80
    } else if (turnoverPercent <= 15) {
      retentionScore = 80 - ((turnoverPercent - 10) / 5) * 30; // 10-15%: 80-50
    } else if (turnoverPercent <= 20) {
      retentionScore = 50 - ((turnoverPercent - 15) / 5) * 30; // 15-20%: 50-20
    } else {
      retentionScore = Math.max(0, 20 - ((turnoverPercent - 20) / 10) * 20); // >20%: 20-0
    }
    score += retentionScore;
    factors++;
  }

  // Community investment (Higher is better, relative to company size)
  const communityInvestment = Number(metrics.communityInvestment || 0);
  if (!isNaN(communityInvestment) && communityInvestment >= 0) {
    // Benchmark: ₹500,000/year for medium business
    const benchmark = 500000;
    const investmentScore = Math.min(100, (communityInvestment / benchmark) * 100);
    score += investmentScore;
    factors++;
  }

  // Average the score
  return factors > 0 ? Math.max(0, Math.min(100, score / factors)) : 0;
};

/**
 * Calculate Governance Score (0-100) based on actual performance
 * Factors: Board composition, policies, compliance, meetings
 */
const calculateGovernanceScore = (metrics: any): number => {
  let score = 0;
  let factors = 0;

  // Board independence (30-50% is ideal)
  const independentDirectors = Number(metrics.independentDirectors || 0);
  const boardMembers = Number(metrics.boardMembers || 0);
  if (!isNaN(independentDirectors) && !isNaN(boardMembers) && boardMembers > 0) {
    const independenceRatio = (independentDirectors / boardMembers) * 100;
    let independenceScore = 0;
    if (independenceRatio >= 30 && independenceRatio <= 50) {
      independenceScore = 100; // Ideal
    } else if (independenceRatio >= 20 && independenceRatio < 30) {
      independenceScore = 70 + ((independenceRatio - 20) / 10) * 30; // 20-30%: 70-100
    } else if (independenceRatio > 50 && independenceRatio <= 60) {
      independenceScore = 100 - ((independenceRatio - 50) / 10) * 20; // 50-60%: 100-80
    } else if (independenceRatio >= 10 && independenceRatio < 20) {
      independenceScore = 40 + ((independenceRatio - 10) / 10) * 30; // 10-20%: 40-70
    } else {
      independenceScore = (independenceRatio / 10) * 40; // <10%: 0-40
    }
    score += independenceScore;
    factors++;
  }

  // Board meetings (4-12 per year is good)
  const boardMeetings = Number(metrics.boardMeetings || 0);
  if (!isNaN(boardMeetings) && boardMeetings > 0) {
    let meetingsScore = 0;
    if (boardMeetings >= 4 && boardMeetings <= 12) {
      meetingsScore = 100; // Ideal range
    } else if (boardMeetings < 4) {
      meetingsScore = (boardMeetings / 4) * 100; // Less than 4: proportional
    } else {
      meetingsScore = Math.max(70, 100 - ((boardMeetings - 12) / 4) * 10); // >12: slight decrease
    }
    score += meetingsScore;
    factors++;
  }

  // Audit committee meetings (4+ per year is good)
  const auditMeetings = Number(metrics.auditCommitteeMeetings || 0);
  if (!isNaN(auditMeetings) && auditMeetings > 0) {
    let auditScore = 0;
    if (auditMeetings >= 4) {
      auditScore = 100; // Good
    } else {
      auditScore = (auditMeetings / 4) * 100; // Less than 4: proportional
    }
    score += auditScore;
    factors++;
  }

  // Policy framework (Yes = 100, No = 0)
  const policyFields = [
    { value: metrics.antiCorruptionPolicy, name: 'Anti-Corruption Policy' },
    { value: metrics.dataPrivacyPolicy, name: 'Data Privacy Policy' },
    { value: metrics.codeOfConductExists, name: 'Code of Conduct' },
    { value: metrics.whistleblowerPolicyExists, name: 'Whistleblower Policy' },
  ];

  policyFields.forEach((field) => {
    if (field.value !== undefined && field.value !== null) {
      score += field.value === true ? 100 : 0;
      factors++;
    }
  });

  // Compliance record (0 violations = 100, more violations = lower score)
  const complianceViolations = Number(metrics.complianceViolations || 0);
  if (!isNaN(complianceViolations) && complianceViolations >= 0) {
    let complianceScore = 0;
    if (complianceViolations === 0) {
      complianceScore = 100; // Perfect
    } else if (complianceViolations === 1) {
      complianceScore = 70; // Good
    } else if (complianceViolations === 2) {
      complianceScore = 40; // Moderate
    } else {
      complianceScore = Math.max(0, 40 - ((complianceViolations - 2) * 20)); // >2: decreasing
    }
    score += complianceScore;
    factors++;
  }

  // Average the score
  return factors > 0 ? Math.max(0, Math.min(100, score / factors)) : 0;
};

/**
 * Calculate overall ESG score with weighted average
 * Environmental: 40%, Social: 30%, Governance: 30%
 */
export const calculateESGScore = async (companyId: string, period: string): Promise<ESGScores> => {
  // Fetch latest metrics for the period
  const [envMetrics, socialMetrics, govMetrics, company] = await Promise.all([
    EnvironmentalMetrics.findOne({ companyId, period }).sort({ createdAt: -1 }),
    SocialMetrics.findOne({ companyId, period }).sort({ createdAt: -1 }),
    GovernanceMetrics.findOne({ companyId, period }).sort({ createdAt: -1 }),
    Company.findById(companyId)
  ]);

  // Provide detailed error message about what's missing
  if (!company) {
    throw new Error('Company not found');
  }

  const missingMetrics: string[] = [];
  if (!envMetrics) missingMetrics.push('Environmental');
  if (!socialMetrics) missingMetrics.push('Social');
  if (!govMetrics) missingMetrics.push('Governance');

  if (missingMetrics.length > 0) {
    throw new Error(
      `Missing metrics for period ${period}: ${missingMetrics.join(', ')}. ` +
      `Please ensure all three metric types (Environmental, Social, and Governance) are created for the same period.`
    );
  }

  const environmentalScore = calculateEnvironmentalScore(envMetrics, company);
  const socialScore = calculateSocialScore(socialMetrics);
  const governanceScore = calculateGovernanceScore(govMetrics);

  // Validate scores are valid numbers
  if (isNaN(environmentalScore) || isNaN(socialScore) || isNaN(governanceScore)) {
    throw new Error(
      `Invalid score calculation result. ` +
      `Environmental: ${environmentalScore}, Social: ${socialScore}, Governance: ${governanceScore}. ` +
      `Please check that all required metric fields are filled with valid numbers.`
    );
  }

  // Weighted average: E(40%) + S(30%) + G(30%)
  const overallScore = 
    (environmentalScore * 0.4) + 
    (socialScore * 0.3) + 
    (governanceScore * 0.3);

  // Final validation
  if (isNaN(overallScore)) {
    throw new Error('Overall score calculation resulted in NaN');
  }

  return {
    environmentalScore: Math.round(environmentalScore * 10) / 10,
    socialScore: Math.round(socialScore * 10) / 10,
    governanceScore: Math.round(governanceScore * 10) / 10,
    overallScore: Math.round(overallScore * 10) / 10
  };
};
