"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateExcelReport = exports.generatePDFReport = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const exceljs_1 = __importDefault(require("exceljs"));
const Company_1 = __importDefault(require("../models/Company"));
const ESGScore_1 = __importDefault(require("../models/ESGScore"));
const EnvironmentalMetrics_1 = __importDefault(require("../models/EnvironmentalMetrics"));
const SocialMetrics_1 = __importDefault(require("../models/SocialMetrics"));
const GovernanceMetrics_1 = __importDefault(require("../models/GovernanceMetrics"));
const getRatingLabel = (score) => {
    if (score >= 80)
        return { label: 'Excellent', color: '#10B981' };
    if (score >= 60)
        return { label: 'Good', color: '#3B82F6' };
    if (score >= 40)
        return { label: 'Fair', color: '#F59E0B' };
    return { label: 'Needs Improvement', color: '#EF4444' };
};
const generatePDFReport = async (companyId, period) => {
    const company = await Company_1.default.findById(companyId);
    const esgScore = await ESGScore_1.default.findOne({
        companyId,
        period: period || { $exists: true }
    }).sort({ period: -1 });
    const [envMetrics, socialMetrics, govMetrics] = await Promise.all([
        EnvironmentalMetrics_1.default.findOne({ companyId, period: esgScore?.period }).sort({ createdAt: -1 }),
        SocialMetrics_1.default.findOne({ companyId, period: esgScore?.period }).sort({ createdAt: -1 }),
        GovernanceMetrics_1.default.findOne({ companyId, period: esgScore?.period }).sort({ createdAt: -1 })
    ]);
    if (!company || !esgScore) {
        throw new Error('Company or ESG score not found');
    }
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ margin: 50 });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('ESG Report', { align: 'center' });
        doc.fontSize(12).font('Helvetica').text('EcoTrack India', { align: 'center' });
        doc.moveDown();
        // Company Info
        doc.fontSize(16).font('Helvetica-Bold').text('Company Information');
        doc.fontSize(11).font('Helvetica');
        doc.text(`Name: ${company.name}`);
        doc.text(`Industry: ${company.industry}`);
        doc.text(`Employees: ${company.employeeCount}`);
        doc.text(`Location: ${company.location}`);
        doc.text(`Reporting Period: ${esgScore.period}`);
        doc.moveDown();
        // Overall Score
        doc.fontSize(16).font('Helvetica-Bold').text('Overall ESG Score');
        doc.fontSize(36).fillColor('#3B82F6').text(esgScore.overallScore.toFixed(1), { align: 'center' });
        const rating = getRatingLabel(esgScore.overallScore);
        doc.fontSize(14).fillColor(rating.color).text(rating.label, { align: 'center' });
        doc.fillColor('#000000');
        doc.moveDown();
        // Score Breakdown
        doc.fontSize(16).font('Helvetica-Bold').text('Score Breakdown');
        doc.fontSize(11).font('Helvetica');
        doc.text(`Environmental Score: ${esgScore.environmentalScore.toFixed(1)}/100 (Weight: 40%)`);
        doc.text(`Social Score: ${esgScore.socialScore.toFixed(1)}/100 (Weight: 30%)`);
        doc.text(`Governance Score: ${esgScore.governanceScore.toFixed(1)}/100 (Weight: 30%)`);
        doc.moveDown();
        // Environmental Metrics
        if (envMetrics) {
            doc.addPage();
            doc.fontSize(16).font('Helvetica-Bold').text('Environmental Metrics');
            doc.fontSize(11).font('Helvetica');
            doc.text(`Electricity Usage: ${envMetrics.electricityUsageKwh.toLocaleString()} kWh`);
            doc.text(`Fuel Consumption: ${envMetrics.fuelConsumptionLitres.toLocaleString()} L`);
            doc.text(`Water Usage: ${envMetrics.waterUsageKL.toLocaleString()} KL`);
            doc.text(`Waste Generated: ${envMetrics.wasteGeneratedKg.toLocaleString()} kg`);
            doc.text(`Renewable Energy: ${envMetrics.renewableEnergyPercent}%`);
            doc.text(`Carbon Emissions: ${envMetrics.carbonEmissionsTons.toLocaleString()} tons`);
            doc.moveDown();
        }
        // Social Metrics
        if (socialMetrics) {
            doc.fontSize(16).font('Helvetica-Bold').text('Social Metrics');
            doc.fontSize(11).font('Helvetica');
            doc.text(`Total Employees: ${socialMetrics.totalEmployees}`);
            doc.text(`Female Employees: ${socialMetrics.femaleEmployees} (${((socialMetrics.femaleEmployees / socialMetrics.totalEmployees) * 100).toFixed(1)}%)`);
            doc.text(`Avg Training Hours: ${socialMetrics.avgTrainingHours} hrs/employee`);
            doc.text(`Workplace Incidents: ${socialMetrics.workplaceIncidents}`);
            doc.text(`Employee Turnover: ${socialMetrics.employeeTurnoverPercent}%`);
            doc.moveDown();
        }
        // Governance Metrics
        if (govMetrics) {
            doc.fontSize(16).font('Helvetica-Bold').text('Governance Metrics');
            doc.fontSize(11).font('Helvetica');
            doc.text(`Board Members: ${govMetrics.boardMembers}`);
            doc.text(`Independent Directors: ${govMetrics.independentDirectors}`);
            doc.text(`Anti-Corruption Policy: ${govMetrics.antiCorruptionPolicy ? 'Yes' : 'No'}`);
            doc.text(`Data Privacy Policy: ${govMetrics.dataPrivacyPolicy ? 'Yes' : 'No'}`);
            doc.text(`Compliance Violations: ${govMetrics.complianceViolations}`);
            doc.moveDown();
        }
        // Footer
        doc.fontSize(9).text(`Generated by EcoTrack India on ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });
        doc.end();
    });
};
exports.generatePDFReport = generatePDFReport;
const generateExcelReport = async (companyId, period) => {
    const company = await Company_1.default.findById(companyId);
    const esgScore = await ESGScore_1.default.findOne({
        companyId,
        period: period || { $exists: true }
    }).sort({ period: -1 });
    const [envMetrics, socialMetrics, govMetrics] = await Promise.all([
        EnvironmentalMetrics_1.default.findOne({ companyId, period: esgScore?.period }).sort({ createdAt: -1 }),
        SocialMetrics_1.default.findOne({ companyId, period: esgScore?.period }).sort({ createdAt: -1 }),
        GovernanceMetrics_1.default.findOne({ companyId, period: esgScore?.period }).sort({ createdAt: -1 })
    ]);
    if (!company || !esgScore) {
        throw new Error('Company or ESG score not found');
    }
    const workbook = new exceljs_1.default.Workbook();
    // Summary Sheet
    const summarySheet = workbook.addWorksheet('ESG Summary');
    summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 20 }
    ];
    summarySheet.addRows([
        { metric: 'Company Name', value: company.name },
        { metric: 'Industry', value: company.industry },
        { metric: 'Employees', value: company.employeeCount },
        { metric: 'Reporting Period', value: esgScore.period },
        { metric: '', value: '' },
        { metric: 'Overall ESG Score', value: esgScore.overallScore.toFixed(1) },
        { metric: 'Environmental Score', value: esgScore.environmentalScore.toFixed(1) },
        { metric: 'Social Score', value: esgScore.socialScore.toFixed(1) },
        { metric: 'Governance Score', value: esgScore.governanceScore.toFixed(1) }
    ]);
    // Environmental Sheet
    if (envMetrics) {
        const envSheet = workbook.addWorksheet('Environmental');
        envSheet.columns = [
            { header: 'Metric', key: 'metric', width: 30 },
            { header: 'Value', key: 'value', width: 20 }
        ];
        envSheet.addRows([
            { metric: 'Electricity Usage (kWh)', value: envMetrics.electricityUsageKwh },
            { metric: 'Fuel Consumption (L)', value: envMetrics.fuelConsumptionLitres },
            { metric: 'Water Usage (KL)', value: envMetrics.waterUsageKL },
            { metric: 'Waste Generated (kg)', value: envMetrics.wasteGeneratedKg },
            { metric: 'Renewable Energy (%)', value: envMetrics.renewableEnergyPercent },
            { metric: 'Carbon Emissions (tons)', value: envMetrics.carbonEmissionsTons }
        ]);
    }
    // Social Sheet
    if (socialMetrics) {
        const socialSheet = workbook.addWorksheet('Social');
        socialSheet.columns = [
            { header: 'Metric', key: 'metric', width: 30 },
            { header: 'Value', key: 'value', width: 20 }
        ];
        socialSheet.addRows([
            { metric: 'Total Employees', value: socialMetrics.totalEmployees },
            { metric: 'Female Employees', value: socialMetrics.femaleEmployees },
            { metric: 'Avg Training Hours', value: socialMetrics.avgTrainingHours },
            { metric: 'Workplace Incidents', value: socialMetrics.workplaceIncidents },
            { metric: 'Employee Turnover (%)', value: socialMetrics.employeeTurnoverPercent }
        ]);
    }
    // Governance Sheet
    if (govMetrics) {
        const govSheet = workbook.addWorksheet('Governance');
        govSheet.columns = [
            { header: 'Metric', key: 'metric', width: 30 },
            { header: 'Value', key: 'value', width: 20 }
        ];
        govSheet.addRows([
            { metric: 'Board Members', value: govMetrics.boardMembers },
            { metric: 'Independent Directors', value: govMetrics.independentDirectors },
            { metric: 'Anti-Corruption Policy', value: govMetrics.antiCorruptionPolicy ? 'Yes' : 'No' },
            { metric: 'Data Privacy Policy', value: govMetrics.dataPrivacyPolicy ? 'Yes' : 'No' },
            { metric: 'Compliance Violations', value: govMetrics.complianceViolations }
        ]);
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
};
exports.generateExcelReport = generateExcelReport;
