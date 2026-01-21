import Task from '../models/Task';
import EnvironmentalMetrics from '../models/EnvironmentalMetrics';
import SocialMetrics from '../models/SocialMetrics';
import GovernanceMetrics from '../models/GovernanceMetrics';
import Evidence from '../models/Evidence';
import { calculateBRSRReadiness } from './complianceService';

/**
 * Generate tasks based on compliance gaps, missing data, and expiring documents
 */
export const generateTasks = async (
  companyId: string,
  userId: string,
  period: string
): Promise<any[]> => {
  const tasks: any[] = [];

  // Get compliance gaps
  try {
    const compliance = await calculateBRSRReadiness(companyId, period);
    
    // Create tasks from compliance next steps
    compliance.nextSteps.forEach((step, index) => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (step.priority === 'high' ? 1 : step.priority === 'medium' ? 3 : 7));
      
      tasks.push({
        title: step.action,
        description: `Complete ${step.requirement} for ${step.area} area`,
        relatedTo: 'Compliance',
        esgArea: step.area,
        priority: step.priority === 'high' ? 'High' : step.priority === 'medium' ? 'Medium' : 'Low',
        status: 'Pending',
        dueDate,
        impact: `Improves ${step.area} compliance`,
        source: 'compliance',
        sourceId: `compliance-${step.area}-${index}`
      });
    });
  } catch (error) {
    console.error('Error generating compliance tasks:', error);
  }

  // Get expiring evidence (within 30 days)
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const expiringEvidence = await Evidence.find({
      companyId,
      expiryDate: {
        $gte: now,
        $lte: thirtyDaysFromNow
      }
    });

    expiringEvidence.forEach((evidence) => {
      tasks.push({
        title: `Renew expiring document: ${evidence.evidenceType}`,
        description: `Document expires on ${evidence.expiryDate?.toLocaleDateString()}`,
        relatedTo: 'Evidence',
        esgArea: evidence.esgArea,
        priority: 'High',
        status: 'Pending',
        dueDate: evidence.expiryDate || new Date(),
        impact: 'Prevents compliance gap',
        source: 'expiring-document',
        sourceId: evidence._id.toString()
      });
    });
  } catch (error) {
    console.error('Error generating expiring document tasks:', error);
  }

  // Get missing critical data
  try {
    const [envMetrics, socialMetrics, govMetrics] = await Promise.all([
      EnvironmentalMetrics.findOne({ companyId, period }).sort({ createdAt: -1 }),
      SocialMetrics.findOne({ companyId, period }).sort({ createdAt: -1 }),
      GovernanceMetrics.findOne({ companyId, period }).sort({ createdAt: -1 })
    ]);

    // Check for missing critical environmental data
    if (!envMetrics?.electricityKwh && !envMetrics?.electricityUsageKwh) {
      tasks.push({
        title: 'Add electricity consumption data',
        description: 'Electricity data is required for environmental metrics',
        relatedTo: 'Data',
        esgArea: 'Environmental',
        priority: 'High',
        status: 'Pending',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        impact: 'Environment score improvement',
        source: 'missing-data',
        sourceId: 'env-electricity'
      });
    }

    if (!envMetrics?.waterUsageKL) {
      tasks.push({
        title: 'Add water consumption data',
        description: 'Water data is required for environmental metrics',
        relatedTo: 'Data',
        esgArea: 'Environmental',
        priority: 'High',
        status: 'Pending',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        impact: 'Environment score improvement',
        source: 'missing-data',
        sourceId: 'env-water'
      });
    }

    // Check for missing critical social data
    if (!socialMetrics?.totalEmployeesPermanent && !socialMetrics?.totalEmployees) {
      tasks.push({
        title: 'Add employee count data',
        description: 'Employee count is required for social metrics',
        relatedTo: 'Data',
        esgArea: 'Social',
        priority: 'High',
        status: 'Pending',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        impact: 'Social score improvement',
        source: 'missing-data',
        sourceId: 'social-employees'
      });
    }

    // Check for missing critical governance data
    if (!govMetrics?.boardMembers) {
      tasks.push({
        title: 'Add board composition details',
        description: 'Board details are required for governance metrics',
        relatedTo: 'Data',
        esgArea: 'Governance',
        priority: 'High',
        status: 'Pending',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
        impact: 'Governance score improvement',
        source: 'missing-data',
        sourceId: 'gov-board'
      });
    }
  } catch (error) {
    console.error('Error generating missing data tasks:', error);
  }

  return tasks;
};

/**
 * Sync tasks - generate new tasks and update existing ones
 */
export const syncTasks = async (
  companyId: string,
  userId: string,
  period: string
): Promise<void> => {
  // Generate new tasks
  const newTasks = await generateTasks(companyId, userId, period);

  // Get existing tasks
  const existingTasks = await Task.find({
    companyId,
    status: { $in: ['Pending', 'In Progress'] },
    source: { $in: ['compliance', 'missing-data', 'expiring-document'] }
  });

  // Create a map of existing tasks by sourceId
  const existingTasksMap = new Map(
    existingTasks.map(task => [task.sourceId, task])
  );

  // Add new tasks that don't exist
  for (const taskData of newTasks) {
    if (!existingTasksMap.has(taskData.sourceId)) {
      await Task.create({
        ...taskData,
        companyId,
        userId
      });
    }
  }

  // Update overdue tasks
  const now = new Date();
  await Task.updateMany(
    {
      companyId,
      status: { $in: ['Pending', 'In Progress'] },
      dueDate: { $lt: now }
    },
    {
      $set: { status: 'Overdue' }
    }
  );
};

