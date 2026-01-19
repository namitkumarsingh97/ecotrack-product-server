import mongoose, { Schema, Document } from 'mongoose';

export interface IGovernanceMetrics extends Document {
  companyId: mongoose.Types.ObjectId;
  period: string;
  
  // Tab 1: Board & Leadership
  boardMembers?: number;
  independentDirectors?: number;
  boardDiversityPercent?: number;
  esgCommitteeExists?: boolean;
  esgCommitteeStructure?: string;
  boardEsgDiscussionFrequency?: string;
  
  // Tab 2: Policies & Ethics
  codeOfConductExists?: boolean;
  codeOfConductDetails?: string;
  antiCorruptionPolicy?: boolean;
  antiCorruptionPolicyDetails?: string;
  whistleblowerPolicyExists?: boolean;
  whistleblowerPolicyDetails?: string;
  
  // Tab 3: Risk Management
  identifiedEsgRisks?: string;
  riskMitigationPlans?: string;
  monitoringEscalationMechanisms?: string;
  complianceViolations?: number;
  auditResults?: string;
  
  // Tab 4: Transparency & Reporting
  materialEsgRisksDisclosed?: boolean;
  materialEsgRisksDetails?: string;
  reportingGovernancePolicies?: string;
  thirdPartyAuditExists?: boolean;
  thirdPartyAuditDetails?: string;
  
  // Tab 5: Supplier & Customer Governance
  supplierEsgGuidelinesExists?: boolean;
  supplierEsgGuidelinesDetails?: string;
  fairBusinessPractices?: string;
  contractualGovernanceClauses?: string;
  
  // Legacy fields (for backward compatibility)
  dataPrivacyPolicy?: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const GovernanceMetricsSchema: Schema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  period: {
    type: String,
    required: true
  },
  
  // Tab 1: Board & Leadership
  boardMembers: { type: Number, min: 1 },
  independentDirectors: { type: Number, min: 0 },
  boardDiversityPercent: { type: Number, min: 0, max: 100 },
  esgCommitteeExists: { type: Boolean, default: false },
  esgCommitteeStructure: { type: String },
  boardEsgDiscussionFrequency: { type: String },
  
  // Tab 2: Policies & Ethics
  codeOfConductExists: { type: Boolean, default: false },
  codeOfConductDetails: { type: String },
  antiCorruptionPolicy: { type: Boolean, default: false },
  antiCorruptionPolicyDetails: { type: String },
  whistleblowerPolicyExists: { type: Boolean, default: false },
  whistleblowerPolicyDetails: { type: String },
  
  // Tab 3: Risk Management
  identifiedEsgRisks: { type: String },
  riskMitigationPlans: { type: String },
  monitoringEscalationMechanisms: { type: String },
  complianceViolations: { type: Number, min: 0, default: 0 },
  auditResults: { type: String },
  
  // Tab 4: Transparency & Reporting
  materialEsgRisksDisclosed: { type: Boolean, default: false },
  materialEsgRisksDetails: { type: String },
  reportingGovernancePolicies: { type: String },
  thirdPartyAuditExists: { type: Boolean, default: false },
  thirdPartyAuditDetails: { type: String },
  
  // Tab 5: Supplier & Customer Governance
  supplierEsgGuidelinesExists: { type: Boolean, default: false },
  supplierEsgGuidelinesDetails: { type: String },
  fairBusinessPractices: { type: String },
  contractualGovernanceClauses: { type: String },
  
  // Legacy fields (for backward compatibility)
  dataPrivacyPolicy: { type: Boolean, default: false }
}, {
  timestamps: true
});

export default mongoose.model<IGovernanceMetrics>('GovernanceMetrics', GovernanceMetricsSchema);

