import mongoose, { Schema, Document } from "mongoose";

export interface IEnvironmentalMetrics extends Document {
  companyId: mongoose.Types.ObjectId;
  period: string;

  // Tab 1: Energy & Emissions
  totalEnergyConsumption?: number;
  electricityKwh?: number;
  fuelLitres?: number;
  renewableEnergyPercent?: number;
  nonRenewableEnergyPercent?: number;
  scope1Emissions?: number;
  scope2Emissions?: number;
  scope3Emissions?: number;
  emissionsIntensity?: number;

  // Tab 2: Water & Waste
  waterUsageKL?: number;
  waterSourceSurface?: number;
  waterSourceGroundwater?: number;
  waterSourceMunicipal?: number;
  waterSourceOther?: number;
  totalWasteTonnes?: number;
  hazardousWasteTonnes?: number;
  nonHazardousWasteTonnes?: number;
  recycledWasteTonnes?: number;
  divertedFromDisposalTonnes?: number;
  wastewaterTreatmentMetrics?: string;
  waterReuseRecyclingPractices?: string;

  // Tab 3: Resource Efficiency
  recyclingInitiatives?: string;
  materialsReuse?: string;
  energySavingsPrograms?: string;
  waterEfficiencyImprovements?: string;

  // Tab 4: Policies & Compliance
  environmentalPolicyExists?: boolean;
  environmentalPolicyDocument?: string;
  complianceWithLocalLaws?: boolean;
  environmentalRiskAssessments?: boolean;
  riskAssessmentDetails?: string;

  // Legacy fields (for backward compatibility)
  electricityUsageKwh?: number;
  fuelConsumptionLitres?: number;
  wasteGeneratedKg?: number;
  carbonEmissionsTons?: number;

  createdAt: Date;
  updatedAt: Date;
}

const EnvironmentalMetricsSchema: Schema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    period: {
      type: String,
      required: true,
    },

    // Tab 1: Energy & Emissions
    totalEnergyConsumption: { type: Number, min: 0 },
    electricityKwh: { type: Number, min: 0 },
    fuelLitres: { type: Number, min: 0 },
    renewableEnergyPercent: { type: Number, min: 0, max: 100 },
    nonRenewableEnergyPercent: { type: Number, min: 0, max: 100 },
    scope1Emissions: { type: Number, min: 0 },
    scope2Emissions: { type: Number, min: 0 },
    scope3Emissions: { type: Number, min: 0 },
    emissionsIntensity: { type: Number, min: 0 },

    // Tab 2: Water & Waste
    waterUsageKL: { type: Number, min: 0 },
    waterSourceSurface: { type: Number, min: 0 },
    waterSourceGroundwater: { type: Number, min: 0 },
    waterSourceMunicipal: { type: Number, min: 0 },
    waterSourceOther: { type: Number, min: 0 },
    totalWasteTonnes: { type: Number, min: 0 },
    hazardousWasteTonnes: { type: Number, min: 0 },
    nonHazardousWasteTonnes: { type: Number, min: 0 },
    recycledWasteTonnes: { type: Number, min: 0 },
    divertedFromDisposalTonnes: { type: Number, min: 0 },
    wastewaterTreatmentMetrics: { type: String },
    waterReuseRecyclingPractices: { type: String },

    // Tab 3: Resource Efficiency
    recyclingInitiatives: { type: String },
    materialsReuse: { type: String },
    energySavingsPrograms: { type: String },
    waterEfficiencyImprovements: { type: String },

    // Tab 4: Policies & Compliance
    environmentalPolicyExists: { type: Boolean, default: false },
    environmentalPolicyDocument: { type: String },
    complianceWithLocalLaws: { type: Boolean, default: false },
    environmentalRiskAssessments: { type: Boolean, default: false },
    riskAssessmentDetails: { type: String },

    // Legacy fields (for backward compatibility)
    electricityUsageKwh: { type: Number, min: 0 },
    fuelConsumptionLitres: { type: Number, min: 0 },
    wasteGeneratedKg: { type: Number, min: 0 },
    carbonEmissionsTons: { type: Number, min: 0 },
    // renewableEnergyPercent: { type: Number, min: 0, max: 100 },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IEnvironmentalMetrics>(
  "EnvironmentalMetrics",
  EnvironmentalMetricsSchema,
);
