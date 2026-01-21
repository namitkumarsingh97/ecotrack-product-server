import EnvironmentalMetrics from '../models/EnvironmentalMetrics';
import SocialMetrics from '../models/SocialMetrics';
import GovernanceMetrics from '../models/GovernanceMetrics';
import Evidence from '../models/Evidence';

/**
 * BRSR (Business Responsibility and Sustainability Reporting) Requirements
 * Based on SEBI guidelines for ESG reporting
 */

interface BRSRRequirement {
  id: string;
  area: 'Environmental' | 'Social' | 'Governance';
  requirement: string;
  mandatory: boolean;
  category: 'mandatory' | 'client-driven' | 'future-ready';
}

// Define BRSR requirements
const BRSR_REQUIREMENTS: BRSRRequirement[] = [
  // Environmental Requirements
  { id: 'E1', area: 'Environmental', requirement: 'Energy consumption data', mandatory: true, category: 'mandatory' },
  { id: 'E2', area: 'Environmental', requirement: 'Water consumption data', mandatory: true, category: 'mandatory' },
  { id: 'E3', area: 'Environmental', requirement: 'Waste management data', mandatory: true, category: 'mandatory' },
  { id: 'E4', area: 'Environmental', requirement: 'Air emissions data', mandatory: true, category: 'mandatory' },
  { id: 'E5', area: 'Environmental', requirement: 'Renewable energy usage', mandatory: false, category: 'client-driven' },
  { id: 'E6', area: 'Environmental', requirement: 'Environmental policy document', mandatory: false, category: 'client-driven' },
  { id: 'E7', area: 'Environmental', requirement: 'Waste disposal proof', mandatory: false, category: 'client-driven' },
  { id: 'E8', area: 'Environmental', requirement: 'Carbon footprint calculation', mandatory: false, category: 'future-ready' },
  
  // Social Requirements
  { id: 'S1', area: 'Social', requirement: 'Total employee count', mandatory: true, category: 'mandatory' },
  { id: 'S2', area: 'Social', requirement: 'Gender diversity data', mandatory: true, category: 'mandatory' },
  { id: 'S3', area: 'Social', requirement: 'Training hours data', mandatory: true, category: 'mandatory' },
  { id: 'S4', area: 'Social', requirement: 'Safety incident data', mandatory: true, category: 'mandatory' },
  { id: 'S5', area: 'Social', requirement: 'CSR spend data', mandatory: false, category: 'client-driven' },
  { id: 'S6', area: 'Social', requirement: 'Employee welfare policies', mandatory: false, category: 'client-driven' },
  
  // Governance Requirements
  { id: 'G1', area: 'Governance', requirement: 'Board composition data', mandatory: true, category: 'mandatory' },
  { id: 'G2', area: 'Governance', requirement: 'Independent directors data', mandatory: true, category: 'mandatory' },
  { id: 'G3', area: 'Governance', requirement: 'Compliance violations data', mandatory: true, category: 'mandatory' },
  { id: 'G4', area: 'Governance', requirement: 'Anti-corruption policy', mandatory: false, category: 'client-driven' },
  { id: 'G5', area: 'Governance', requirement: 'POSH policy', mandatory: false, category: 'client-driven' },
  { id: 'G6', area: 'Governance', requirement: 'Code of conduct', mandatory: false, category: 'client-driven' },
  { id: 'G7', area: 'Governance', requirement: 'ESG committee structure', mandatory: false, category: 'future-ready' },
];

/**
 * Check if a requirement is covered based on metrics and evidence
 */
const isRequirementCovered = async (
  requirement: BRSRRequirement,
  companyId: string,
  period: string,
  envMetrics: any,
  socialMetrics: any,
  govMetrics: any,
  evidence: any[]
): Promise<boolean> => {
  switch (requirement.id) {
    // Environmental
    case 'E1': return !!(envMetrics?.electricityKwh || envMetrics?.electricityUsageKwh || envMetrics?.totalEnergyConsumption);
    case 'E2': return !!(envMetrics?.waterUsageKL);
    case 'E3': return !!(envMetrics?.totalWasteTonnes || envMetrics?.wasteGeneratedKg);
    case 'E4': return !!(envMetrics?.scope1Emissions || envMetrics?.carbonEmissionsTons);
    case 'E5': return !!(envMetrics?.renewableEnergyPercent && envMetrics.renewableEnergyPercent > 0);
    case 'E6': return !!(envMetrics?.environmentalPolicyExists);
    case 'E7': return evidence.some(e => e.evidenceType?.toLowerCase().includes('waste') || e.evidenceType?.toLowerCase().includes('disposal'));
    case 'E8': return !!(envMetrics?.scope1Emissions && envMetrics?.scope2Emissions);
    
    // Social
    case 'S1': return !!(socialMetrics?.totalEmployeesPermanent || socialMetrics?.totalEmployees || socialMetrics?.totalEmployeesContractual);
    case 'S2': return !!(socialMetrics?.femalePercentWorkforce || socialMetrics?.femaleEmployees);
    case 'S3': return !!(socialMetrics?.totalTrainingHoursPerEmployee || socialMetrics?.avgTrainingHours);
    case 'S4': return !!(socialMetrics?.accidentIncidents !== undefined);
    case 'S5': return !!(socialMetrics?.csrSpend);
    case 'S6': return !!(socialMetrics?.healthSafetyPolicies);
    
    // Governance
    case 'G1': return !!(govMetrics?.boardMembers);
    case 'G2': return !!(govMetrics?.independentDirectors);
    case 'G3': return !!(govMetrics?.complianceViolations !== undefined);
    case 'G4': return !!(govMetrics?.antiCorruptionPolicy);
    case 'G5': return !!(govMetrics?.whistleblowerPolicyExists || evidence.some(e => e.evidenceType?.toLowerCase().includes('posh')));
    case 'G6': return !!(govMetrics?.codeOfConductExists);
    case 'G7': return !!(govMetrics?.esgCommitteeExists);
    
    default: return false;
  }
};

/**
 * Calculate BRSR Readiness
 */
export const calculateBRSRReadiness = async (
  companyId: string,
  period: string
): Promise<{
  overallReadiness: number;
  breakdown: {
    area: 'Environmental' | 'Social' | 'Governance';
    covered: number;
    total: number;
    missing: number;
    status: 'complete' | 'warning' | 'critical';
    requirements: Array<{
      id: string;
      requirement: string;
      covered: boolean;
      mandatory: boolean;
      category: string;
    }>;
  }[];
  nextSteps: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    area: 'Environmental' | 'Social' | 'Governance';
    requirement: string;
  }>;
}> => {
  // Get latest metrics for the period
  const [envMetrics, socialMetrics, govMetrics, evidence] = await Promise.all([
    EnvironmentalMetrics.findOne({ companyId, period }).sort({ createdAt: -1 }),
    SocialMetrics.findOne({ companyId, period }).sort({ createdAt: -1 }),
    GovernanceMetrics.findOne({ companyId, period }).sort({ createdAt: -1 }),
    Evidence.find({ companyId })
  ]);

  const envMetricsObj = envMetrics?.toObject() || {};
  const socialMetricsObj = socialMetrics?.toObject() || {};
  const govMetricsObj = govMetrics?.toObject() || {};

  // Check each requirement
  const requirementChecks = await Promise.all(
    BRSR_REQUIREMENTS.map(async (req) => ({
      ...req,
      covered: await isRequirementCovered(req, companyId, period, envMetricsObj, socialMetricsObj, govMetricsObj, evidence)
    }))
  );

  // Group by area
  const breakdown = ['Environmental', 'Social', 'Governance'].map(area => {
    const areaReqs = requirementChecks.filter(r => r.area === area);
    const covered = areaReqs.filter(r => r.covered).length;
    const total = areaReqs.length;
    const missing = total - covered;
    
    let status: 'complete' | 'warning' | 'critical' = 'complete';
    if (covered === total) status = 'complete';
    else if (covered >= total * 0.7) status = 'warning';
    else status = 'critical';

    return {
      area: area as 'Environmental' | 'Social' | 'Governance',
      covered,
      total,
      missing,
      status,
      requirements: areaReqs.map(r => ({
        id: r.id,
        requirement: r.requirement,
        covered: r.covered,
        mandatory: r.mandatory,
        category: r.category
      }))
    };
  });

  // Calculate overall readiness
  const totalRequirements = requirementChecks.length;
  const coveredRequirements = requirementChecks.filter(r => r.covered).length;
  const overallReadiness = Math.round((coveredRequirements / totalRequirements) * 100);

  // Generate next steps (prioritize mandatory and missing)
  const missingReqs = requirementChecks.filter(r => !r.covered);
  const nextSteps = missingReqs
    .sort((a, b) => {
      // Prioritize mandatory first
      if (a.mandatory && !b.mandatory) return -1;
      if (!a.mandatory && b.mandatory) return 1;
      // Then by category priority
      const categoryPriority = { 'mandatory': 0, 'client-driven': 1, 'future-ready': 2 };
      return categoryPriority[a.category] - categoryPriority[b.category];
    })
    .slice(0, 5) // Top 5 next steps
    .map(req => ({
      priority: req.mandatory ? 'high' as const : req.category === 'client-driven' ? 'medium' as const : 'low' as const,
      action: getActionForRequirement(req),
      area: req.area,
      requirement: req.requirement
    }));

  return {
    overallReadiness,
    breakdown,
    nextSteps
  };
};

/**
 * Get actionable text for a requirement
 */
const getActionForRequirement = (req: BRSRRequirement): string => {
  const actionMap: Record<string, string> = {
    'E1': 'Add electricity consumption data',
    'E2': 'Add water consumption data',
    'E3': 'Add waste management data',
    'E4': 'Add air emissions data',
    'E5': 'Add renewable energy usage percentage',
    'E6': 'Upload environmental policy document',
    'E7': 'Upload waste disposal proof',
    'E8': 'Calculate and add carbon footprint',
    'S1': 'Add total employee count',
    'S2': 'Add gender diversity data',
    'S3': 'Add training hours data',
    'S4': 'Add safety incident data',
    'S5': 'Add CSR spend data',
    'S6': 'Add employee welfare policies',
    'G1': 'Add board composition details',
    'G2': 'Add independent directors count',
    'G3': 'Add compliance violations data',
    'G4': 'Upload anti-corruption policy',
    'G5': 'Upload POSH policy',
    'G6': 'Upload code of conduct',
    'G7': 'Add ESG committee structure',
  };
  
  return actionMap[req.id] || `Complete ${req.requirement}`;
};

