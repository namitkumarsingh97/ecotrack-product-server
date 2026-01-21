import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import Task from '../models/Task';
import Company from '../models/Company';
import { authenticate, AuthRequest } from '../middleware/auth';
import { syncTasks } from '../services/taskService';

const router = express.Router();

// Get Tasks Dashboard
router.get('/dashboard/:companyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.params;
    const { period } = req.query;

    // Verify company ownership
    const company = await Company.findOne({
      _id: companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    // Get current period or latest
    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.floor((new Date().getMonth() + 3) / 3);
    const targetPeriod = (period as string) || `${currentYear}-Q${currentQuarter}`;

    // Sync tasks (generate new ones based on current state)
    await syncTasks(companyId, req.userId, targetPeriod);

    // Get all tasks for the company
    const allTasks = await Task.find({ companyId }).sort({ dueDate: 1 });

    // Calculate statistics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const pendingTasks = allTasks.filter(t => t.status === 'Pending').length;
    const overdueTasks = allTasks.filter(t => t.status === 'Overdue').length;
    const dueThisWeek = allTasks.filter(t => 
      t.status !== 'Completed' && 
      t.dueDate >= today && 
      t.dueDate <= weekFromNow
    ).length;
    const completedTasks = allTasks.filter(t => t.status === 'Completed').length;

    // Get today's focus tasks (high priority, pending, due soon)
    const todayFocus = allTasks
      .filter(t => 
        t.status === 'Pending' && 
        t.priority === 'High' && 
        t.dueDate <= new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000)
      )
      .slice(0, 5);

    // Get task table data
    const taskTable = allTasks
      .filter(t => t.status !== 'Completed')
      .map(task => ({
        _id: task._id,
        title: task.title,
        relatedTo: task.relatedTo,
        esgArea: task.esgArea,
        dueDate: task.dueDate,
        due: getDueDateText(task.dueDate),
        impact: task.impact || task.priority,
        priority: task.priority,
        status: task.status
      }));

    res.json({
      statistics: {
        pendingTasks,
        overdueTasks,
        dueThisWeek,
        completedTasks
      },
      todayFocus: todayFocus.length,
      todayFocusTasks: todayFocus,
      taskTable
    });
  } catch (error: any) {
    console.error('Get tasks dashboard error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Helper function to format due date
const getDueDateText = (dueDate: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(dueDate);
  const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  
  const diffTime = dueDateOnly.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `${diffDays} days`;
  return dueDate.toLocaleDateString();
};

// Update Task Status
router.put(
  '/:id/status',
  authenticate,
  [
    body('status').isIn(['Pending', 'In Progress', 'Completed', 'Overdue']).withMessage('Invalid status'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status } = req.body;

      const task = await Task.findOne({
        _id: id,
        userId: req.userId
      });

      if (!task) {
        return res.status(404).json({ error: 'Task not found or unauthorized' });
      }

      task.status = status;
      if (status === 'Completed') {
        task.completedAt = new Date();
      }
      await task.save();

      res.json({
        message: 'Task status updated successfully',
        task
      });
    } catch (error: any) {
      console.error('Update task status error:', error);
      res.status(500).json({ error: error.message || 'Server error' });
    }
  }
);

// Get All Tasks
router.get('/:companyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.params;
    const { esgArea, priority, status } = req.query;

    // Verify company ownership
    const company = await Company.findOne({
      _id: companyId,
      userId: req.userId
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    const query: any = { companyId };
    if (esgArea) query.esgArea = esgArea;
    if (priority) query.priority = priority;
    if (status) query.status = status;

    const tasks = await Task.find(query).sort({ dueDate: 1 });

    res.json({ tasks });
  } catch (error: any) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Create Manual Task
router.post(
  '/:companyId',
  authenticate,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('relatedTo').isIn(['Evidence', 'Compliance', 'Data', 'Score']).withMessage('Invalid related to'),
    body('esgArea').isIn(['Environmental', 'Social', 'Governance', 'Overall']).withMessage('Invalid ESG area'),
    body('dueDate').isISO8601().withMessage('Valid due date is required'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { companyId } = req.params;
      const { title, description, relatedTo, esgArea, priority, dueDate, impact } = req.body;

      // Verify company ownership
      const company = await Company.findOne({
        _id: companyId,
        userId: req.userId
      });

      if (!company) {
        return res.status(404).json({ error: 'Company not found or unauthorized' });
      }

      const task = new Task({
        companyId,
        userId: req.userId,
        title,
        description,
        relatedTo,
        esgArea,
        priority: priority || 'Medium',
        status: 'Pending',
        dueDate: new Date(dueDate),
        impact,
        source: 'manual'
      });

      await task.save();

      res.json({
        message: 'Task created successfully',
        task
      });
    } catch (error: any) {
      console.error('Create task error:', error);
      res.status(500).json({ error: error.message || 'Server error' });
    }
  }
);

// Delete Task
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found or unauthorized' });
    }

    await Task.deleteOne({ _id: task._id });

    res.json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

export default router;

