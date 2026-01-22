import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import Company from '../models/Company';
import ESGScore from '../models/ESGScore';
import EnvironmentalMetrics from '../models/EnvironmentalMetrics';
import SocialMetrics from '../models/SocialMetrics';
import GovernanceMetrics from '../models/GovernanceMetrics';

const getRatingLabel = (score: number): { label: string; color: string } => {
  if (score >= 80) return { label: 'Excellent', color: '#10B981' };
  if (score >= 60) return { label: 'Good', color: '#3B82F6' };
  if (score >= 40) return { label: 'Fair', color: '#F59E0B' };
  return { label: 'Needs Improvement', color: '#EF4444' };
};

// Helper function to draw a table
const drawTable = (
  doc: PDFDocument,
  startY: number,
  headers: string[],
  rows: string[][],
  columnWidths: number[],
  headerColor: string = '#10B981',
  textColor: string = '#000000'
): number => {
  const rowHeight = 25;
  const headerHeight = 30;
  const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
  const startX = (doc.page.width - tableWidth) / 2;

  // Draw header
  let currentY = startY;
  doc.rect(startX, currentY, tableWidth, headerHeight).fill(headerColor);
  
  let currentX = startX;
  headers.forEach((header, i) => {
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#FFFFFF')
       .text(header, currentX + 8, currentY + 8, {
         width: columnWidths[i] - 16,
         align: 'left'
       });
    currentX += columnWidths[i];
  });

  // Draw rows
  currentY += headerHeight;
  rows.forEach((row, rowIndex) => {
    const fillColor = rowIndex % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
    doc.rect(startX, currentY, tableWidth, rowHeight).fill(fillColor);
    
    currentX = startX;
    row.forEach((cell, colIndex) => {
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(textColor)
         .text(cell || 'N/A', currentX + 8, currentY + 7, {
           width: columnWidths[colIndex] - 16,
           align: 'left'
         });
      currentX += columnWidths[colIndex];
    });
    
    // Draw border
    doc.strokeColor('#E5E7EB')
       .lineWidth(0.5)
       .rect(startX, currentY, tableWidth, rowHeight)
       .stroke();
    
    currentY += rowHeight;
  });

  return currentY;
};

export const generatePDFReport = async (companyId: string, period?: string): Promise<Buffer> => {
  const company = await Company.findById(companyId);
  
  if (!company) {
    throw new Error('Company not found');
  }

  // Find ESG score for the specified period, or latest if not specified
  let esgScore;
  if (period) {
    esgScore = await ESGScore.findOne({ companyId, period }).sort({ createdAt: -1 });
  } else {
    esgScore = await ESGScore.findOne({ companyId }).sort({ period: -1 });
  }

  if (!esgScore) {
    throw new Error(`ESG score not found for period ${period || 'latest'}. Please calculate scores first.`);
  }

  // Use the period from the found score
  const reportPeriod = esgScore.period;

  const [envMetrics, socialMetrics, govMetrics] = await Promise.all([
    EnvironmentalMetrics.findOne({ companyId, period: reportPeriod }).sort({ createdAt: -1 }),
    SocialMetrics.findOne({ companyId, period: reportPeriod }).sort({ createdAt: -1 }),
    GovernanceMetrics.findOne({ companyId, period: reportPeriod }).sort({ createdAt: -1 })
  ]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      margin: 40,
      size: 'A4',
      info: {
        Title: `ESG Report - ${company.name}`,
        Author: 'EcoTrack India',
        Subject: 'ESG Sustainability Report',
        Creator: 'EcoTrack India Platform'
      }
    });
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Try to load logo (if available)
    let logoPath: string | null = null;
    const possibleLogoPaths = [
      path.join(process.cwd(), 'frontend', 'public', 'logo.png'),
      path.join(process.cwd(), 'frontend', 'public', 'logo-no-bg.png'),
      path.join(process.cwd(), 'public', 'logo.png'),
      path.join(process.cwd(), 'public', 'logo-no-bg.png')
    ];
    
    for (const logo of possibleLogoPaths) {
      if (fs.existsSync(logo)) {
        logoPath = logo;
        break;
      }
    }

    // Header with gradient background
    const headerHeight = 120;
    doc.rect(0, 0, doc.page.width, headerHeight)
       .fill('#10B981');
    
    // Logo (if available)
    if (logoPath) {
      try {
        doc.image(logoPath, 50, 20, { width: 120, height: 40 });
      } catch (err) {
        // If image fails, use text logo
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .fillColor('#FFFFFF')
           .text('🌱 EcoTrack India', 50, 30);
      }
    } else {
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .fillColor('#FFFFFF')
         .text('🌱 EcoTrack India', 50, 30);
    }

    // Company Information Section in Header
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#FFFFFF')
       .text('ESG Sustainability Report', 50, 70, { width: 300 });
    
    doc.fontSize(8)
       .fillColor('#D1FAE5')
       .text('support@ecotrack.in | www.ecotrack.in', 50, 90, { width: 300 });

    // Company Details Box (right side of header)
    const companyBoxX = doc.page.width - 250;
    doc.rect(companyBoxX, 20, 200, headerHeight - 40)
       .fill('#FFFFFF')
       .fillOpacity(0.95);
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#111827')
       .text(company.name, companyBoxX + 10, 30, { width: 180 });
    
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#4B5563')
       .text(`Industry: ${company.industry}`, companyBoxX + 10, 50, { width: 180 })
       .text(`Location: ${company.location}`, companyBoxX + 10, 65, { width: 180 })
       .text(`Employees: ${company.employeeCount?.toLocaleString() || 'N/A'}`, companyBoxX + 10, 80, { width: 180 });

    // Report Period Badge
    doc.rect(companyBoxX + 10, 95, 180, 20)
       .fill('#3B82F6')
       .fillOpacity(0.9);
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor('#FFFFFF')
       .text(`Reporting Period: ${reportPeriod}`, companyBoxX + 15, 100, { width: 170, align: 'center' });

    let currentY = headerHeight + 30;

    // Overall ESG Score Section
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor('#111827')
       .text('Overall ESG Score', 50, currentY);
    
    currentY += 30;

    const overallScore = Number(esgScore.overallScore) || 0;
    const rating = getRatingLabel(overallScore);
    
    // Simple score display - no circle, just clean text
    const scoreX = doc.page.width / 2;
    const scoreY = currentY + 30;
    
    // Score number (very large, bold, in rating color)
    const scoreText = overallScore.toFixed(0);
    doc.fontSize(72)
       .font('Helvetica-Bold')
       .fillColor(rating.color)
       .text(scoreText, scoreX, scoreY, { 
         width: 200, 
         align: 'center' 
       });
    
    // "/ 100" text (smaller, gray)
    doc.fontSize(24)
       .font('Helvetica')
       .fillColor('#6B7280')
       .text('/ 100', scoreX, scoreY + 50, { 
         width: 200, 
         align: 'center' 
       });
    
    // Rating label (below score, in rating color)
    doc.fontSize(22)
       .font('Helvetica-Bold')
       .fillColor(rating.color)
       .text(rating.label, scoreX, scoreY + 90, { 
         width: 200, 
         align: 'center' 
       });

    currentY += 130;

    // Score Breakdown Table
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#111827')
       .text('Score Breakdown', 50, currentY);
    
    currentY += 25;

    const envScore = Number(esgScore.environmentalScore) || 0;
    const socialScore = Number(esgScore.socialScore) || 0;
    const govScore = Number(esgScore.governanceScore) || 0;

    const breakdownHeaders = ['Category', 'Score', 'Weight', 'Weighted Score'];
    const breakdownRows = [
      ['Environmental', `${envScore.toFixed(1)}/100`, '40%', `${(envScore * 0.4).toFixed(1)}`],
      ['Social', `${socialScore.toFixed(1)}/100`, '30%', `${(socialScore * 0.3).toFixed(1)}`],
      ['Governance', `${govScore.toFixed(1)}/100`, '30%', `${(govScore * 0.3).toFixed(1)}`]
    ];
    const breakdownWidths = [150, 100, 100, 120];

    currentY = drawTable(doc, currentY, breakdownHeaders, breakdownRows, breakdownWidths, '#10B981');
    currentY += 20;

    // Environmental Metrics
    if (envMetrics) {
      // Check if we need a new page
      if (currentY > doc.page.height - 200) {
        doc.addPage();
        currentY = 50;
      } else {
        currentY += 20;
      }

      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#111827')
         .text('Environmental Metrics', 50, currentY);
      
      currentY += 25;

      const envHeaders = ['Metric', 'Value', 'Unit'];
      const envRows: string[][] = [];
      
      if (envMetrics.electricityUsageKwh !== undefined && envMetrics.electricityUsageKwh !== null) {
        envRows.push(['Electricity Usage', Number(envMetrics.electricityUsageKwh).toLocaleString(), 'kWh']);
      }
      if (envMetrics.fuelConsumptionLitres !== undefined && envMetrics.fuelConsumptionLitres !== null) {
        envRows.push(['Fuel Consumption', Number(envMetrics.fuelConsumptionLitres).toLocaleString(), 'Liters']);
      }
      if (envMetrics.waterUsageKL !== undefined && envMetrics.waterUsageKL !== null) {
        envRows.push(['Water Usage', Number(envMetrics.waterUsageKL).toLocaleString(), 'KL']);
      }
      if (envMetrics.wasteGeneratedKg !== undefined && envMetrics.wasteGeneratedKg !== null) {
        envRows.push(['Waste Generated', Number(envMetrics.wasteGeneratedKg).toLocaleString(), 'kg']);
      }
      if (envMetrics.renewableEnergyPercent !== undefined && envMetrics.renewableEnergyPercent !== null) {
        envRows.push(['Renewable Energy', `${Number(envMetrics.renewableEnergyPercent).toFixed(1)}`, '%']);
      }
      if (envMetrics.carbonEmissionsTons !== undefined && envMetrics.carbonEmissionsTons !== null) {
        envRows.push(['Carbon Emissions', Number(envMetrics.carbonEmissionsTons).toLocaleString(), 'tons']);
      }

      if (envRows.length > 0) {
        const envWidths = [200, 150, 100];
        currentY = drawTable(doc, currentY, envHeaders, envRows, envWidths, '#059669');
        currentY += 20;
      }
    }

    // Social Metrics
    if (socialMetrics) {
      // Check if we need a new page
      if (currentY > doc.page.height - 200) {
        doc.addPage();
        currentY = 50;
      } else {
        currentY += 20;
      }

      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#111827')
         .text('Social Metrics', 50, currentY);
      
      currentY += 25;

      const socialHeaders = ['Metric', 'Value', 'Unit'];
      const socialRows: string[][] = [];
      
      // Support both new and legacy fields
      const totalEmployees = socialMetrics.totalEmployeesPermanent 
        ? (Number(socialMetrics.totalEmployeesPermanent) + Number(socialMetrics.totalEmployeesContractual || 0))
        : Number(socialMetrics.totalEmployees || 0);
      
      if (totalEmployees > 0) {
        socialRows.push(['Total Employees', totalEmployees.toLocaleString(), '']);
      }
      
      // Female percentage - support both new and legacy fields
      if (socialMetrics.femalePercentWorkforce !== undefined && socialMetrics.femalePercentWorkforce !== null) {
        socialRows.push(['Female Workforce', `${Number(socialMetrics.femalePercentWorkforce).toFixed(1)}`, '%']);
      } else if (socialMetrics.femaleEmployees && totalEmployees > 0) {
        const femalePercent = (Number(socialMetrics.femaleEmployees) / totalEmployees) * 100;
        socialRows.push(['Female Workforce', `${Number(socialMetrics.femaleEmployees).toLocaleString()} (${femalePercent.toFixed(1)}%)`, '']);
      }
      
      // Training hours - support both new and legacy fields
      const trainingHours = socialMetrics.totalTrainingHoursPerEmployee || socialMetrics.avgTrainingHours;
      if (trainingHours !== undefined && trainingHours !== null) {
        socialRows.push(['Training Hours per Employee', Number(trainingHours).toFixed(1), 'hours']);
      }
      
      // Incidents - support both new and legacy fields
      const incidents = socialMetrics.accidentIncidents || socialMetrics.workplaceIncidents;
      if (incidents !== undefined && incidents !== null) {
        socialRows.push(['Workplace Incidents', Number(incidents).toString(), '']);
      }
      
      // Turnover
      if (socialMetrics.employeeTurnoverPercent !== undefined && socialMetrics.employeeTurnoverPercent !== null) {
        socialRows.push(['Employee Turnover', `${Number(socialMetrics.employeeTurnoverPercent).toFixed(1)}`, '%']);
      }

      if (socialRows.length > 0) {
        const socialWidths = [200, 150, 100];
        currentY = drawTable(doc, currentY, socialHeaders, socialRows, socialWidths, '#3B82F6');
        currentY += 20;
      }
    }

    // Governance Metrics
    if (govMetrics) {
      // Check if we need a new page
      if (currentY > doc.page.height - 200) {
        doc.addPage();
        currentY = 50;
      } else {
        currentY += 20;
      }

      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#111827')
         .text('Governance Metrics', 50, currentY);
      
      currentY += 25;

      const govHeaders = ['Metric', 'Value', 'Status'];
      const govRows: string[][] = [];
      
      if (govMetrics.boardMembers !== undefined && govMetrics.boardMembers !== null) {
        govRows.push(['Board Members', Number(govMetrics.boardMembers).toString(), '']);
      }
      
      if (govMetrics.independentDirectors !== undefined && govMetrics.independentDirectors !== null) {
        govRows.push(['Independent Directors', Number(govMetrics.independentDirectors).toString(), '']);
      }
      
      if (govMetrics.antiCorruptionPolicy !== undefined) {
        govRows.push(['Anti-Corruption Policy', govMetrics.antiCorruptionPolicy ? 'Yes' : 'No', govMetrics.antiCorruptionPolicy ? '✓' : '✗']);
      }
      
      if (govMetrics.dataPrivacyPolicy !== undefined) {
        govRows.push(['Data Privacy Policy', govMetrics.dataPrivacyPolicy ? 'Yes' : 'No', govMetrics.dataPrivacyPolicy ? '✓' : '✗']);
      }
      
      if (govMetrics.complianceViolations !== undefined && govMetrics.complianceViolations !== null) {
        govRows.push(['Compliance Violations', Number(govMetrics.complianceViolations).toString(), '']);
      }

      if (govRows.length > 0) {
        const govWidths = [200, 150, 100];
        currentY = drawTable(doc, currentY, govHeaders, govRows, govWidths, '#8B5CF6');
        currentY += 20;
      }
    }

    // Add footer to the last page (simple approach to avoid recursion)
    const footerText = `Generated by EcoTrack India on ${new Date().toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })} | support@ecotrack.in | www.ecotrack.in`;
    const footerHeight = 30;

    // Add footer to current page
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#6B7280')
       .text(
         footerText,
         50,
         doc.page.height - footerHeight,
         { 
           align: 'center',
           width: doc.page.width - 100
         }
       );

    doc.end();
  });
};

export const generateExcelReport = async (companyId: string, period?: string): Promise<Buffer> => {
  const company = await Company.findById(companyId);
  
  if (!company) {
    throw new Error('Company not found');
  }

  // Find ESG score for the specified period, or latest if not specified
  let esgScore;
  if (period) {
    esgScore = await ESGScore.findOne({ companyId, period }).sort({ createdAt: -1 });
  } else {
    esgScore = await ESGScore.findOne({ companyId }).sort({ period: -1 });
  }

  if (!esgScore) {
    throw new Error(`ESG score not found for period ${period || 'latest'}. Please calculate scores first.`);
  }

  // Use the period from the found score
  const reportPeriod = esgScore.period;

  const [envMetrics, socialMetrics, govMetrics] = await Promise.all([
    EnvironmentalMetrics.findOne({ companyId, period: reportPeriod }).sort({ createdAt: -1 }),
    SocialMetrics.findOne({ companyId, period: reportPeriod }).sort({ createdAt: -1 }),
    GovernanceMetrics.findOne({ companyId, period: reportPeriod }).sort({ createdAt: -1 })
  ]);

  const workbook = new ExcelJS.Workbook();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('ESG Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 }
  ];

  const overallScore = Number(esgScore.overallScore) || 0;
  const envScore = Number(esgScore.environmentalScore) || 0;
  const socialScore = Number(esgScore.socialScore) || 0;
  const govScore = Number(esgScore.governanceScore) || 0;

  summarySheet.addRows([
    { metric: 'Company Name', value: company.name },
    { metric: 'Industry', value: company.industry },
    { metric: 'Employees', value: company.employeeCount },
    { metric: 'Reporting Period', value: esgScore.period },
    { metric: '', value: '' },
    { metric: 'Overall ESG Score', value: overallScore.toFixed(1) },
    { metric: 'Environmental Score', value: envScore.toFixed(1) },
    { metric: 'Social Score', value: socialScore.toFixed(1) },
    { metric: 'Governance Score', value: govScore.toFixed(1) }
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

    const rows: Array<{ metric: string; value: string | number }> = [];
    
    // Total employees - support both new and legacy fields
    const totalEmployees = socialMetrics.totalEmployeesPermanent 
      ? (Number(socialMetrics.totalEmployeesPermanent) + Number(socialMetrics.totalEmployeesContractual || 0))
      : Number(socialMetrics.totalEmployees || 0);
    if (totalEmployees > 0) {
      rows.push({ metric: 'Total Employees', value: totalEmployees });
    }
    
    // Female percentage - support both new and legacy fields
    if (socialMetrics.femalePercentWorkforce !== undefined && socialMetrics.femalePercentWorkforce !== null) {
      rows.push({ metric: 'Female % of Workforce', value: `${Number(socialMetrics.femalePercentWorkforce).toFixed(1)}%` });
    } else if (socialMetrics.femaleEmployees && totalEmployees > 0) {
      rows.push({ metric: 'Female Employees', value: Number(socialMetrics.femaleEmployees) });
    }
    
    // Training hours - support both new and legacy fields
    const trainingHours = socialMetrics.totalTrainingHoursPerEmployee || socialMetrics.avgTrainingHours;
    if (trainingHours !== undefined && trainingHours !== null) {
      rows.push({ metric: 'Training Hours per Employee', value: Number(trainingHours).toFixed(1) });
    }
    
    // Incidents - support both new and legacy fields
    const incidents = socialMetrics.accidentIncidents || socialMetrics.workplaceIncidents;
    if (incidents !== undefined && incidents !== null) {
      rows.push({ metric: 'Workplace Incidents', value: Number(incidents) });
    }
    
    // Turnover
    if (socialMetrics.employeeTurnoverPercent !== undefined && socialMetrics.employeeTurnoverPercent !== null) {
      rows.push({ metric: 'Employee Turnover (%)', value: Number(socialMetrics.employeeTurnoverPercent).toFixed(1) });
    }

    if (rows.length > 0) {
      socialSheet.addRows(rows);
    }
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

