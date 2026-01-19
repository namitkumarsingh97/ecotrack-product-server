import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import User from './models/User';
import Company from './models/Company';
import EnvironmentalMetrics from './models/EnvironmentalMetrics';
import SocialMetrics from './models/SocialMetrics';
import GovernanceMetrics from './models/GovernanceMetrics';
import ESGScore from './models/ESGScore';
import { calculateESGScore } from './services/esgScoring';

dotenv.config();

const seedData = async () => {
  try {
    await connectDatabase();

    console.log('🌱 Starting database seeding...\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Company.deleteMany({});
    await EnvironmentalMetrics.deleteMany({});
    await SocialMetrics.deleteMany({});
    await GovernanceMetrics.deleteMany({});
    await ESGScore.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // Create test users
    console.log('👤 Creating test users...');
    const testUsers = [
      {
        name: 'Admin User',
        email: 'admin@ecotrack.in',
        password: await bcrypt.hash('admin1234', 10),
        plan: 'enterprise',
        role: 'ADMIN'  // Main admin account
      },
      {
        name: 'Demo User',
        email: 'demo@ecotrack.in',
        password: await bcrypt.hash('demo1234', 10),
        plan: 'pro',
        role: 'USER'
      },
      {
        name: 'Rajesh Kumar',
        email: 'rajesh@greenmanufacturing.com',
        password: await bcrypt.hash('test1234', 10),
        plan: 'starter',
        role: 'USER'
      },
      {
        name: 'Priya Sharma',
        email: 'priya@sustainableindia.com',
        password: await bcrypt.hash('test1234', 10),
        plan: 'enterprise',
        role: 'ADMIN'
      }
    ];

    const users = await User.insertMany(testUsers);
    console.log(`✅ Created ${users.length} test users`);
    console.log('   👑 admin@ecotrack.in / admin1234 (ADMIN - Enterprise Plan)');
    console.log('   📧 demo@ecotrack.in / demo1234 (Pro Plan)');
    console.log('   📧 rajesh@greenmanufacturing.com / test1234');
    console.log('   👑 priya@sustainableindia.com / test1234 (ADMIN)\n');

    // Create test companies
    console.log('🏢 Creating test companies...');
    const testCompanies = [
      {
        userId: users[0]._id,
        name: 'Green Manufacturing Pvt Ltd',
        industry: 'Manufacturing',
        employeeCount: 150,
        annualRevenue: 50000000,
        location: 'Mumbai, Maharashtra',
        reportingYear: 2026
      },
      {
        userId: users[0]._id,
        name: 'EcoTech Solutions',
        industry: 'IT/Software',
        employeeCount: 85,
        annualRevenue: 25000000,
        location: 'Bangalore, Karnataka',
        reportingYear: 2026
      },
      {
        userId: users[1]._id,
        name: 'Sustainable Textiles Ltd',
        industry: 'Textiles',
        employeeCount: 250,
        annualRevenue: 75000000,
        location: 'Ahmedabad, Gujarat',
        reportingYear: 2026
      },
      {
        userId: users[2]._id,
        name: 'Pure Pharma Industries',
        industry: 'Pharmaceuticals',
        employeeCount: 120,
        annualRevenue: 60000000,
        location: 'Hyderabad, Telangana',
        reportingYear: 2026
      }
    ];

    const companies = await Company.insertMany(testCompanies);
    console.log(`✅ Created ${companies.length} test companies\n`);

    // Create comprehensive ESG data for each company
    for (const company of companies) {
      console.log(`📊 Adding ESG data for ${company.name}...`);

      // Create data for multiple periods (Q1, Q2, Q3, Q4)
      const periods = ['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'];

      for (let i = 0; i < periods.length; i++) {
        const period = periods[i];
        const improvement = i * 0.05; // 5% improvement each quarter

        // Environmental Metrics (with quarterly improvement)
        const envData = {
          companyId: company._id,
          period,
          // Base values adjusted by company size
          electricityUsageKwh: Math.round((45000 - i * 2000) * (company.employeeCount / 150)),
          fuelConsumptionLitres: Math.round((3000 - i * 150) * (company.employeeCount / 150)),
          waterUsageKL: Math.round((800 - i * 40) * (company.employeeCount / 150)),
          wasteGeneratedKg: Math.round((4000 - i * 200) * (company.employeeCount / 150)),
          renewableEnergyPercent: Math.min(25 + i * 5, 40), // Increasing renewable energy
          carbonEmissionsTons: Math.round((120 - i * 8) * (company.employeeCount / 150))
        };

        // Social Metrics
        const socialData = {
          companyId: company._id,
          period,
          totalEmployees: company.employeeCount + i * 5, // Growing workforce
          femaleEmployees: Math.round((company.employeeCount + i * 5) * (0.30 + improvement)), // Improving diversity
          avgTrainingHours: 24 + i * 4, // Increasing training
          workplaceIncidents: Math.max(1 - i, 0), // Improving safety
          employeeTurnoverPercent: Math.max(8 - i, 4) // Reducing turnover
        };

        // Governance Metrics
        const govData = {
          companyId: company._id,
          period,
          boardMembers: 5,
          independentDirectors: 2 + (i >= 2 ? 1 : 0), // Added director in Q3
          antiCorruptionPolicy: i >= 1, // Implemented in Q2
          dataPrivacyPolicy: true,
          complianceViolations: Math.max(1 - i, 0) // Resolving violations
        };

        await EnvironmentalMetrics.create(envData);
        await SocialMetrics.create(socialData);
        await GovernanceMetrics.create(govData);

        // Calculate and save ESG score
        try {
          const scores = await calculateESGScore(company._id.toString(), period);
          await ESGScore.create({
            companyId: company._id,
            period,
            ...scores
          });
          console.log(`   ✅ ${period}: E=${scores.environmentalScore.toFixed(1)} S=${scores.socialScore.toFixed(1)} G=${scores.governanceScore.toFixed(1)} Overall=${scores.overallScore.toFixed(1)}`);
        } catch (error) {
          console.log(`   ⚠️  ${period}: Metrics added but score calculation skipped`);
        }
      }
    }

    console.log('\n🎉 Database seeding completed successfully!\n');

    // Print summary
    console.log('📋 SUMMARY');
    console.log('==========');
    console.log(`Users: ${await User.countDocuments()}`);
    console.log(`Companies: ${await Company.countDocuments()}`);
    console.log(`Environmental Metrics: ${await EnvironmentalMetrics.countDocuments()}`);
    console.log(`Social Metrics: ${await SocialMetrics.countDocuments()}`);
    console.log(`Governance Metrics: ${await GovernanceMetrics.countDocuments()}`);
    console.log(`ESG Scores: ${await ESGScore.countDocuments()}`);

    console.log('\n🚀 QUICK START');
    console.log('==============');
    console.log('1. Start the backend: npm run dev');
    console.log('2. Start the frontend: npm run dev (in frontend folder)');
    console.log('3. Login with:');
    console.log('   👑 Admin: admin@ecotrack.in / admin1234');
    console.log('   📧 Demo: demo@ecotrack.in / demo1234');
    console.log('4. Admin users can access /dashboard/admin/users to manage users');
    console.log('5. View dashboard with pre-populated ESG data!');

    console.log('\n💡 TIP: All companies have 4 quarters of data showing improvement over time!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed function
seedData();

