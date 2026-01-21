import EnvironmentalMetrics from '../models/EnvironmentalMetrics';
import SocialMetrics from '../models/SocialMetrics';
import GovernanceMetrics from '../models/GovernanceMetrics';

/**
 * Calculate risk level based on ESG score
 */
export const getRiskLevel = (score: number): { level: 'Low' | 'Medium' | 'High'; color: string } => {
  if (score >= 70) return { level: 'Low', color: '#10b981' };
  if (score >= 50) return { level: 'Medium', color: '#f59e0b' };
  return { level: 'High', color: '#ef4444' };
};

/**
 * Check if a value is missing or empty
 */
const isMissing = (value: any): boolean => {
  return value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value));
};

/**
 * Calculate data completeness for Environmental metrics
 */
export const getEnvironmentalCompleteness = (metrics: any): {
  completeness: number;
  completed: string[];
  missing: string[];
  missingCritical: string[];
} => {
  const requiredFields = [
    { key: 'electricityKwh', label: 'Electricity (kWh)', critical: true },
    { key: 'fuelLitres', label: 'Fuel (L)', critical: true },
    { key: 'scope1Emissions', label: 'Scope 1 Emissions', critical: true },
    { key: 'scope2Emissions', label: 'Scope 2 Emissions', critical: true },
    { key: 'waterUsageKL', label: 'Water Usage (KL)', critical: true },
    { key: 'totalWasteTonnes', label: 'Total Waste (tonnes)', critical: true },
    { key: 'renewableEnergyPercent', label: 'Renewable Energy %', critical: false },
    { key: 'totalEnergyConsumption', label: 'Total Energy Consumption', critical: false },
  ];

  const completed: string[] = [];
  const missing: string[] = [];
  const missingCritical: string[] = [];

  requiredFields.forEach(field => {
    const value = metrics[field.key] ?? metrics[field.key.replace('Kwh', 'UsageKwh')] ?? metrics[field.key.replace('Litres', 'ConsumptionLitres')];
    if (!isMissing(value)) {
      completed.push(field.label);
    } else {
      missing.push(field.label);
      if (field.critical) {
        missingCritical.push(field.label);
      }
    }
  });

  const totalFields = requiredFields.length;
  const completedCount = completed.length;
  const completeness = Math.round((completedCount / totalFields) * 100);

  return { completeness, completed, missing, missingCritical };
};

/**
 * Calculate data completeness for Social metrics
 */
export const getSocialCompleteness = (metrics: any): {
  completeness: number;
  completed: string[];
  missing: string[];
  missingCritical: string[];
} => {
  const requiredFields = [
    { key: 'totalEmployeesPermanent', label: 'Permanent Employees', critical: true },
    { key: 'totalEmployeesContractual', label: 'Contractual Employees', critical: true },
    { key: 'femalePercentWorkforce', label: 'Female % of Workforce', critical: true },
    { key: 'accidentIncidents', label: 'Accident Incidents', critical: true },
    { key: 'totalTrainingHoursPerEmployee', label: 'Training Hours/Employee', critical: true },
    { key: 'csrSpend', label: 'CSR Spend', critical: false },
    { key: 'totalEmployees', label: 'Total Employees (Legacy)', critical: false },
    { key: 'femaleEmployees', label: 'Female Employees (Legacy)', critical: false },
  ];

  const completed: string[] = [];
  const missing: string[] = [];
  const missingCritical: string[] = [];

  requiredFields.forEach(field => {
    const value = metrics[field.key];
    if (!isMissing(value)) {
      completed.push(field.label);
    } else {
      missing.push(field.label);
      if (field.critical) {
        missingCritical.push(field.label);
      }
    }
  });

  const totalFields = requiredFields.length;
  const completedCount = completed.length;
  const completeness = Math.round((completedCount / totalFields) * 100);

  return { completeness, completed, missing, missingCritical };
};

/**
 * Calculate data completeness for Governance metrics
 */
export const getGovernanceCompleteness = (metrics: any): {
  completeness: number;
  completed: string[];
  missing: string[];
  missingCritical: string[];
} => {
  const requiredFields = [
    { key: 'boardMembers', label: 'Board Members', critical: true },
    { key: 'independentDirectors', label: 'Independent Directors', critical: true },
    { key: 'complianceViolations', label: 'Compliance Violations', critical: true },
    { key: 'antiCorruptionPolicy', label: 'Anti-Corruption Policy', critical: false },
    { key: 'esgCommitteeExists', label: 'ESG Committee', critical: false },
    { key: 'boardDiversityPercent', label: 'Board Diversity %', critical: false },
  ];

  const completed: string[] = [];
  const missing: string[] = [];
  const missingCritical: string[] = [];

  requiredFields.forEach(field => {
    const value = metrics[field.key];
    if (!isMissing(value)) {
      completed.push(field.label);
    } else {
      missing.push(field.label);
      if (field.critical) {
        missingCritical.push(field.label);
      }
    }
  });

  const totalFields = requiredFields.length;
  const completedCount = completed.length;
  const completeness = Math.round((completedCount / totalFields) * 100);

  return { completeness, completed, missing, missingCritical };
};

/**
 * Get overall data completeness
 */
export const getOverallCompleteness = (
  envCompleteness: number,
  socialCompleteness: number,
  govCompleteness: number
): number => {
  return Math.round((envCompleteness + socialCompleteness + govCompleteness) / 3);
};

/**
 * Get impact explanation for missing data
 */
export const getImpactExplanation = (
  pillar: 'Environmental' | 'Social' | 'Governance',
  score: number,
  missingCritical: string[]
): string => {
  const pillarName = pillar === 'Environmental' ? 'Environment' : pillar;
  
  if (missingCritical.length === 0) {
    return `Your ${pillarName} score is ${score.toFixed(1)}. All critical data fields are completed.`;
  }

  const missingList = missingCritical.slice(0, 3).join(', ');
  const moreText = missingCritical.length > 3 ? ` and ${missingCritical.length - 3} more` : '';
  
  return `Your ${pillarName} score is ${score.toFixed(1)}. It's low because ${missingList}${moreText} data is missing. Please fill these fields to improve your score.`;
};

