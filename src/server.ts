import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';

// Import routes
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import companyRoutes from './routes/company';
import metricsRoutes from './routes/metrics';
import esgRoutes from './routes/esg';
import featuresRoutes from './routes/features';
import evidenceRoutes from './routes/evidence';
import complianceRoutes from './routes/compliance';
import tasksRoutes from './routes/tasks';
import plansRoutes from './routes/plans';
import trialsRoutes from './routes/trials';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'EcoTrack India API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/esg', esgRoutes);
app.use('/api/features', featuresRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/trials', trialsRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

