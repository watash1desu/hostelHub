import { logger } from './utils/logger';
// server.ts
import express, { Express } from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
import helmet from 'helmet';

import { connectDB } from './config/db';

// Import Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import studentRoutes from './routes/student.routes';
import dishRoutes from './routes/dish.routes';
import mealReviewRoutes from './routes/mealReview.routes';
import issueRoutes from './routes/issue.routes';

import adminDishRoutes from './routes/adminDish.routes';
import adminMenuRoutes from './routes/adminMenu.routes';
import adminUserRoutes from './routes/adminUser.routes';
import adminReviewRoutes from './routes/adminReview.routes';
import adminDashboardRoutes from './routes/adminDashboard.routes';
import adminSettingsRoutes from './routes/adminSettings.routes';

import { verifyToken } from './middlewares/verifyToken.middleware';
import { requirePasswordChanged } from './middlewares/requirePasswordChanged.middleware';
import { requireRole } from './middlewares/requireRole.middleware';
import { errorHandler } from './middlewares/errorHandler';



const app: Express = express();

const httpServer = http.createServer(app);

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Security & Middleware
app.use(helmet());
app.use(
  cors({
    origin: [FRONTEND_URL, 'http://127.0.0.1:5173', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '10mb' }));

// Public Routes
app.get('/', (_, res) => res.status(200).json({ message: 'Server Running' }));
app.use('/api/auth', authRoutes);

// Shared Protected Routes
app.use('/api/users', verifyToken, requirePasswordChanged, userRoutes);
app.use('/api/issues', verifyToken, requirePasswordChanged, issueRoutes);
app.use('/api/dishes', verifyToken, requirePasswordChanged, dishRoutes);
app.use('/api/reviews', verifyToken, requirePasswordChanged, mealReviewRoutes);

// Student Specific Routes (Handles Menu, Notifications, and Votes)
app.use('/api/student', verifyToken, requirePasswordChanged, requireRole('STUDENT'), studentRoutes);

// Admin Specific Routes
app.use('/api/admin/menu', verifyToken, requirePasswordChanged, requireRole('ADMIN'), adminMenuRoutes);
app.use('/api/admin/users', verifyToken, requirePasswordChanged, requireRole('ADMIN'), adminUserRoutes);
app.use('/api/admin/dishes', verifyToken, requirePasswordChanged, requireRole('ADMIN'), adminDishRoutes);
app.use('/api/admin/reviews', verifyToken, requirePasswordChanged, requireRole('ADMIN'), adminReviewRoutes);
app.use('/api/admin/dashboard', verifyToken, requirePasswordChanged, requireRole('ADMIN'), adminDashboardRoutes);
app.use('/api/admin/settings', verifyToken, requirePasswordChanged, requireRole('ADMIN'), adminSettingsRoutes);

// Global Error Handler
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();

    httpServer.listen(PORT, () => {
      logger.info('APP', `Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('APP', 'Startup failed:', error);
    process.exit(1);
  }
};

startServer();