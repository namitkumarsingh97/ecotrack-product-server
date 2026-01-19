"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateESGScore = void 0;
const EnvironmentalMetrics_1 = __importDefault(require("../models/EnvironmentalMetrics"));
const SocialMetrics_1 = __importDefault(require("../models/SocialMetrics"));
const GovernanceMetrics_1 = __importDefault(require("../models/GovernanceMetrics"));
const Company_1 = __importDefault(require("../models/Company"));
/**
 * Calculate Environmental Score (0-100)
 * Factors: Energy efficiency, waste management, renewable energy adoption
 */
const calculateEnvironmentalScore = (metrics, company) => {
    let score = 100;
    // Per-employee metrics (better efficiency)
    const energyPerEmployee = metrics.electricityUsageKwh / company.employeeCount;
    const wastePerEmployee = metrics.wasteGeneratedKg / company.employeeCount;
    const waterPerEmployee = metrics.waterUsageKL / company.employeeCount;
    // Energy efficiency (0-30 points)
    // Penalize high energy usage (>500 kWh per employee/month is poor)
    if (energyPerEmployee > 500)
        score -= 15;
    else if (energyPerEmployee > 300)
        score -= 8;
    else if (energyPerEmployee < 150)
        score += 5; // Bonus for efficiency
    // Waste management (0-25 points)
    // Less than 50kg per employee is good
    if (wastePerEmployee > 100)
        score -= 15;
    else if (wastePerEmployee > 50)
        score -= 8;
    else
        score += 5;
    // Water conservation (0-15 points)
    if (waterPerEmployee > 5)
        score -= 10;
    else if (waterPerEmployee < 2)
        score += 5;
    // Renewable energy adoption (0-30 points) - Major factor
    score += (metrics.renewableEnergyPercent * 0.3);
    // Carbon emissions (penalty)
    const carbonPerEmployee = metrics.carbonEmissionsTons / company.employeeCount;
    if (carbonPerEmployee > 5)
        score -= 10;
    else if (carbonPerEmployee < 2)
        score += 5;
    return Math.max(0, Math.min(100, score));
};
/**
 * Calculate Social Score (0-100)
 * Factors: Gender diversity, training, safety, retention
 */
const calculateSocialScore = (metrics) => {
    let score = 50; // Base score
    // Gender diversity (0-25 points)
    const femalePercentage = (metrics.femaleEmployees / metrics.totalEmployees) * 100;
    if (femalePercentage >= 40)
        score += 25;
    else if (femalePercentage >= 30)
        score += 18;
    else if (femalePercentage >= 20)
        score += 12;
    else if (femalePercentage >= 10)
        score += 6;
    // Training & development (0-25 points)
    if (metrics.avgTrainingHours >= 40)
        score += 25;
    else if (metrics.avgTrainingHours >= 24)
        score += 18;
    else if (metrics.avgTrainingHours >= 12)
        score += 12;
    else if (metrics.avgTrainingHours >= 6)
        score += 6;
    // Workplace safety (0-25 points)
    const incidentRate = (metrics.workplaceIncidents / metrics.totalEmployees) * 100;
    if (incidentRate === 0)
        score += 25;
    else if (incidentRate < 1)
        score += 18;
    else if (incidentRate < 3)
        score += 10;
    else
        score -= 10;
    // Employee retention (0-25 points)
    if (metrics.employeeTurnoverPercent < 5)
        score += 25;
    else if (metrics.employeeTurnoverPercent < 10)
        score += 18;
    else if (metrics.employeeTurnoverPercent < 15)
        score += 12;
    else if (metrics.employeeTurnoverPercent < 25)
        score += 6;
    else
        score -= 5;
    return Math.max(0, Math.min(100, score));
};
/**
 * Calculate Governance Score (0-100)
 * Factors: Board composition, policies, compliance
 */
const calculateGovernanceScore = (metrics) => {
    let score = 50; // Base score
    // Board independence (0-30 points)
    const independenceRatio = metrics.independentDirectors / metrics.boardMembers;
    if (independenceRatio >= 0.5)
        score += 30;
    else if (independenceRatio >= 0.33)
        score += 20;
    else if (independenceRatio >= 0.25)
        score += 10;
    // Policy framework (0-40 points)
    if (metrics.antiCorruptionPolicy)
        score += 20;
    if (metrics.dataPrivacyPolicy)
        score += 20;
    // Compliance record (0-30 points)
    if (metrics.complianceViolations === 0)
        score += 30;
    else if (metrics.complianceViolations === 1)
        score += 15;
    else if (metrics.complianceViolations === 2)
        score += 5;
    else
        score -= 20; // Major penalty for violations
    return Math.max(0, Math.min(100, score));
};
/**
 * Calculate overall ESG score with weighted average
 * Environmental: 40%, Social: 30%, Governance: 30%
 */
const calculateESGScore = async (companyId, period) => {
    // Fetch latest metrics for the period
    const [envMetrics, socialMetrics, govMetrics, company] = await Promise.all([
        EnvironmentalMetrics_1.default.findOne({ companyId, period }).sort({ createdAt: -1 }),
        SocialMetrics_1.default.findOne({ companyId, period }).sort({ createdAt: -1 }),
        GovernanceMetrics_1.default.findOne({ companyId, period }).sort({ createdAt: -1 }),
        Company_1.default.findById(companyId)
    ]);
    if (!envMetrics || !socialMetrics || !govMetrics || !company) {
        throw new Error('Incomplete metrics data for ESG calculation');
    }
    const environmentalScore = calculateEnvironmentalScore(envMetrics, company);
    const socialScore = calculateSocialScore(socialMetrics);
    const governanceScore = calculateGovernanceScore(govMetrics);
    // Weighted average: E(40%) + S(30%) + G(30%)
    const overallScore = (environmentalScore * 0.4) +
        (socialScore * 0.3) +
        (governanceScore * 0.3);
    return {
        environmentalScore: Math.round(environmentalScore * 10) / 10,
        socialScore: Math.round(socialScore * 10) / 10,
        governanceScore: Math.round(governanceScore * 10) / 10,
        overallScore: Math.round(overallScore * 10) / 10
    };
};
exports.calculateESGScore = calculateESGScore;
