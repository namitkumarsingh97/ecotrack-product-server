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
 * Calculate Environmental Score (0-100)
 * Factors: Energy efficiency, waste management, renewable energy adoption
 */
const calculateEnvironmentalScore = (metrics: any, company: any): number => {
  let score = 100;

  // Validate company has employeeCount
  const employeeCount = Number(company?.employeeCount || 0);
  if (isNaN(employeeCount) || employeeCount <= 0) {
    console.warn('Company employeeCount is invalid, defaulting to 100 for calculation');
    company.employeeCount = 100;
  }

  // Per-employee metrics (better efficiency)
  const electricityUsage = Number(metrics.electricityUsageKwh || 0);
  const wasteGenerated = Number(metrics.wasteGeneratedKg || 0);
  const waterUsage = Number(metrics.waterUsageKL || 0);
  const carbonEmissions = Number(metrics.carbonEmissionsTons || 0);
  const renewableEnergyPercent = Number(metrics.renewableEnergyPercent || 0);

  if (!isNaN(electricityUsage) && electricityUsage > 0 && company.employeeCount > 0) {
    const energyPerEmployee = electricityUsage / company.employeeCount;
    // Energy efficiency (0-30 points)
    // Penalize high energy usage (>500 kWh per employee/month is poor)
    if (energyPerEmployee > 500) score -= 15;
    else if (energyPerEmployee > 300) score -= 8;
    else if (energyPerEmployee < 150) score += 5; // Bonus for efficiency
  }

  if (!isNaN(wasteGenerated) && wasteGenerated > 0 && company.employeeCount > 0) {
    const wastePerEmployee = wasteGenerated / company.employeeCount;
    // Waste management (0-25 points)
    // Less than 50kg per employee is good
    if (wastePerEmployee > 100) score -= 15;
    else if (wastePerEmployee > 50) score -= 8;
    else score += 5;
  }

  if (!isNaN(waterUsage) && waterUsage > 0 && company.employeeCount > 0) {
    const waterPerEmployee = waterUsage / company.employeeCount;
    // Water conservation (0-15 points)
    if (waterPerEmployee > 5) score -= 10;
    else if (waterPerEmployee < 2) score += 5;
  }

  // Renewable energy adoption (0-30 points) - Major factor
  if (!isNaN(renewableEnergyPercent) && renewableEnergyPercent >= 0 && renewableEnergyPercent <= 100) {
    score += (renewableEnergyPercent * 0.3);
  }

  // Carbon emissions (penalty)
  if (!isNaN(carbonEmissions) && carbonEmissions > 0 && company.employeeCount > 0) {
    const carbonPerEmployee = carbonEmissions / company.employeeCount;
    if (carbonPerEmployee > 5) score -= 10;
    else if (carbonPerEmployee < 2) score += 5;
  }

  return Math.max(0, Math.min(100, score));
};

/**
 * Calculate Social Score (0-100)
 * Factors: Gender diversity, training, safety, retention
 */
const calculateSocialScore = (metrics: any): number => {
  let score = 50; // Base score

  // Gender diversity (0-25 points)
  // Support both new field (femalePercentWorkforce) and legacy field (femaleEmployees/totalEmployees)
  let femalePercentage = 0;
  if (metrics.femalePercentWorkforce !== undefined && metrics.femalePercentWorkforce !== null) {
    femalePercentage = Number(metrics.femalePercentWorkforce);
  } else if (metrics.femaleEmployees && metrics.totalEmployees) {
    femalePercentage = (Number(metrics.femaleEmployees) / Number(metrics.totalEmployees)) * 100;
  } else if (metrics.totalEmployeesPermanent) {
    // Try to use permanent employees if available
    const totalEmployees = Number(metrics.totalEmployeesPermanent) + Number(metrics.totalEmployeesContractual || 0);
    if (metrics.femaleEmployees && totalEmployees > 0) {
      femalePercentage = (Number(metrics.femaleEmployees) / totalEmployees) * 100;
    }
  }

  if (!isNaN(femalePercentage) && femalePercentage > 0) {
    if (femalePercentage >= 40) score += 25;
    else if (femalePercentage >= 30) score += 18;
    else if (femalePercentage >= 20) score += 12;
    else if (femalePercentage >= 10) score += 6;
  }

  // Training & development (0-25 points)
  // Support both new field (totalTrainingHoursPerEmployee) and legacy field (avgTrainingHours)
  const trainingHours = Number(metrics.totalTrainingHoursPerEmployee || metrics.avgTrainingHours || 0);
  if (!isNaN(trainingHours) && trainingHours > 0) {
    if (trainingHours >= 40) score += 25;
    else if (trainingHours >= 24) score += 18;
    else if (trainingHours >= 12) score += 12;
    else if (trainingHours >= 6) score += 6;
  }

  // Workplace safety (0-25 points)
  // Support both new fields (accidentIncidents) and legacy field (workplaceIncidents)
  const incidents = Number(metrics.accidentIncidents || metrics.workplaceIncidents || 0);
  const totalEmployees = Number(metrics.totalEmployeesPermanent || metrics.totalEmployees || 0);
  if (!isNaN(incidents) && !isNaN(totalEmployees) && totalEmployees > 0) {
    const incidentRate = (incidents / totalEmployees) * 100;
    if (incidentRate === 0) score += 25;
    else if (incidentRate < 1) score += 18;
    else if (incidentRate < 3) score += 10;
    else score -= 10;
  }

  // Employee retention (0-25 points)
  const turnoverPercent = Number(metrics.employeeTurnoverPercent || 0);
  if (!isNaN(turnoverPercent) && turnoverPercent >= 0) {
    if (turnoverPercent < 5) score += 25;
    else if (turnoverPercent < 10) score += 18;
    else if (turnoverPercent < 15) score += 12;
    else if (turnoverPercent < 25) score += 6;
    else score -= 5;
  }

  return Math.max(0, Math.min(100, score));
};

/**
 * Calculate Governance Score (0-100)
 * Factors: Board composition, policies, compliance
 */
const calculateGovernanceScore = (metrics: any): number => {
  let score = 50; // Base score

  // Board independence (0-30 points)
  const independentDirectors = Number(metrics.independentDirectors || 0);
  const boardMembers = Number(metrics.boardMembers || 0);
  if (!isNaN(independentDirectors) && !isNaN(boardMembers) && boardMembers > 0) {
    const independenceRatio = independentDirectors / boardMembers;
    if (independenceRatio >= 0.5) score += 30;
    else if (independenceRatio >= 0.33) score += 20;
    else if (independenceRatio >= 0.25) score += 10;
  }

  // Policy framework (0-40 points)
  if (metrics.antiCorruptionPolicy === true) score += 20;
  if (metrics.dataPrivacyPolicy === true) score += 20;

  // Compliance record (0-30 points)
  const complianceViolations = Number(metrics.complianceViolations || 0);
  if (!isNaN(complianceViolations)) {
    if (complianceViolations === 0) score += 30;
    else if (complianceViolations === 1) score += 15;
    else if (complianceViolations === 2) score += 5;
    else score -= 20; // Major penalty for violations
  }

  return Math.max(0, Math.min(100, score));
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

