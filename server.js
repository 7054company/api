import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import authRoutes from './auth.js';
import apiRoutes from './routes/api.js';
import agentRoutes from './routes/agents.js';
import logsRoutes from './routes/logs.js';
import healthRoutes from './routes/health.js';
import aiRouter from './routes/ai/index.js';
import resetMailRoutes from './routes/mail/reset.js';
import usageRoutes from './routes/usage/index.js';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/log', logsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/ai', aiRouter);
app.use('/api/mail/reset', resetMailRoutes);
app.use('/api/usage', usageRoutes); // Added usage routes that include balance endpoints

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

export default app;
