import mongoose, { Schema, Document } from 'mongoose';

export interface ISocialMetrics extends Document {
  companyId: mongoose.Types.ObjectId;
  period: string;
  
  // Tab 1: Workforce Demographics
  totalEmployeesPermanent?: number;
  totalEmployeesContractual?: number;
  femalePercentWorkforce?: number;
  womenInManagementPercent?: number;
  vulnerableGroupsRepresentation?: string;
  
  // Tab 2: Employee Safety & Welfare
  accidentIncidents?: number;
  nearMissIncidents?: number;
  totalTrainingHoursPerEmployee?: number;
  safetyDrillsConducted?: number;
  healthSafetyPolicies?: string;
  awarenessSessions?: string;
  
  // Tab 3: Labor Practices & Compensation
  fairWagePolicyExists?: boolean;
  fairWagePolicyDetails?: string;
  medianRemuneration?: number;
  payRatio?: number;
  grievanceRedressalMechanism?: string;
  
  // Tab 4: Human Rights & Inclusivity
  humanRightsTraining?: string;
  accessibilityMeasures?: boolean;
  accessibilityMeasuresDetails?: string;
  antiHarassmentProcessExists?: boolean;
  antiHarassmentProcessDetails?: string;
  
  // Tab 5: Community & CSR
  csrSpend?: number;
  csrSpendPercent?: number;
  csrActivities?: string;
  communityEngagementPrograms?: string;
  impactAssessments?: string;
  
  // Tab 6: Stakeholder Engagement
  keyStakeholderGroups?: string;
  engagementFrequency?: string;
  engagementType?: string;
  communicationOutcomes?: string;
  
  // Legacy fields (for backward compatibility)
  totalEmployees?: number;
  femaleEmployees?: number;
  avgTrainingHours?: number;
  workplaceIncidents?: number;
  employeeTurnoverPercent?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const SocialMetricsSchema: Schema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  period: {
    type: String,
    required: true
  },
  
  // Tab 1: Workforce Demographics
  totalEmployeesPermanent: { type: Number, min: 0 },
  totalEmployeesContractual: { type: Number, min: 0 },
  femalePercentWorkforce: { type: Number, min: 0, max: 100 },
  womenInManagementPercent: { type: Number, min: 0, max: 100 },
  vulnerableGroupsRepresentation: { type: String },
  
  // Tab 2: Employee Safety & Welfare
  accidentIncidents: { type: Number, min: 0 },
  nearMissIncidents: { type: Number, min: 0 },
  totalTrainingHoursPerEmployee: { type: Number, min: 0 },
  safetyDrillsConducted: { type: Number, min: 0 },
  healthSafetyPolicies: { type: String },
  awarenessSessions: { type: String },
  
  // Tab 3: Labor Practices & Compensation
  fairWagePolicyExists: { type: Boolean, default: false },
  fairWagePolicyDetails: { type: String },
  medianRemuneration: { type: Number, min: 0 },
  payRatio: { type: Number, min: 0 },
  grievanceRedressalMechanism: { type: String },
  
  // Tab 4: Human Rights & Inclusivity
  humanRightsTraining: { type: String },
  accessibilityMeasures: { type: Boolean, default: false },
  accessibilityMeasuresDetails: { type: String },
  antiHarassmentProcessExists: { type: Boolean, default: false },
  antiHarassmentProcessDetails: { type: String },
  
  // Tab 5: Community & CSR
  csrSpend: { type: Number, min: 0 },
  csrSpendPercent: { type: Number, min: 0, max: 100 },
  csrActivities: { type: String },
  communityEngagementPrograms: { type: String },
  impactAssessments: { type: String },
  
  // Tab 6: Stakeholder Engagement
  keyStakeholderGroups: { type: String },
  engagementFrequency: { type: String },
  engagementType: { type: String },
  communicationOutcomes: { type: String },
  
  // Legacy fields (for backward compatibility)
  totalEmployees: { type: Number, min: 0 },
  femaleEmployees: { type: Number, min: 0 },
  avgTrainingHours: { type: Number, min: 0 },
  workplaceIncidents: { type: Number, min: 0 },
  employeeTurnoverPercent: { type: Number, min: 0, max: 100 }
}, {
  timestamps: true
});

export default mongoose.model<ISocialMetrics>('SocialMetrics', SocialMetricsSchema);

