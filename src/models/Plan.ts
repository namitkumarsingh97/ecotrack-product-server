import mongoose, { Schema, Document } from 'mongoose';

export type PlanType = 'starter' | 'pro' | 'enterprise';

export interface IPlan extends Document {
  name: string;
  type: PlanType;
  price: number; // in rupees per month, -1 for custom/enterprise
  features: {
    // Dashboard & Tracking
    esgTrackingDashboard: boolean;
    unlimitedReportExports: boolean;
    yearOnYearComparison: boolean;
    multiYearTrendAnalysis: boolean;
    
    // Reports & Templates
    brsrCompliantTemplates: boolean;
    industrySpecificTemplates: boolean;
    customReportBranding: boolean;
    
    // Scoring & Analytics
    basicEsgScoring: boolean;
    advancedAnalytics: boolean;
    benchmarking: boolean;
    
    // Compliance
    complianceDeadlineAlerts: boolean;
    customComplianceFrameworks: boolean;
    
    // Support
    emailSupport: boolean;
    priorityEmailSupport: boolean;
    dedicatedAccountManager: boolean;
    dedicatedSuccessManager: boolean;
    trainingOnboardingSupport: boolean;
    support247: boolean;
    
    // Users & Access
    maxUsers: number; // -1 for unlimited
    apiAccess: boolean;
    
    // Enterprise Features
    whiteLabelOptions: boolean;
    customIntegrations: boolean;
    advancedSecuritySSO: boolean;
    onPremiseDeployment: boolean;
    customSLAGuarantees: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['starter', 'pro', 'enterprise'],
    required: true,
    unique: true
  },
  price: {
    type: Number,
    required: true
  },
  features: {
    esgTrackingDashboard: { type: Boolean, default: true },
    unlimitedReportExports: { type: Boolean, default: false },
    yearOnYearComparison: { type: Boolean, default: false },
    multiYearTrendAnalysis: { type: Boolean, default: false },
    brsrCompliantTemplates: { type: Boolean, default: false },
    industrySpecificTemplates: { type: Boolean, default: false },
    customReportBranding: { type: Boolean, default: false },
    basicEsgScoring: { type: Boolean, default: false },
    advancedAnalytics: { type: Boolean, default: false },
    benchmarking: { type: Boolean, default: false },
    complianceDeadlineAlerts: { type: Boolean, default: false },
    customComplianceFrameworks: { type: Boolean, default: false },
    emailSupport: { type: Boolean, default: false },
    priorityEmailSupport: { type: Boolean, default: false },
    dedicatedAccountManager: { type: Boolean, default: false },
    dedicatedSuccessManager: { type: Boolean, default: false },
    trainingOnboardingSupport: { type: Boolean, default: false },
    support247: { type: Boolean, default: false },
    maxUsers: { type: Number, default: 1 },
    apiAccess: { type: Boolean, default: false },
    whiteLabelOptions: { type: Boolean, default: false },
    customIntegrations: { type: Boolean, default: false },
    advancedSecuritySSO: { type: Boolean, default: false },
    onPremiseDeployment: { type: Boolean, default: false },
    customSLAGuarantees: { type: Boolean, default: false },
  }
}, {
  timestamps: true
});

export default mongoose.model<IPlan>('Plan', PlanSchema);

