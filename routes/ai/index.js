import express from 'express';
import chatRouter from './chat.js';
import designRouter from './design.js';

const router = express.Router();

// Mount chat and design routes
router.use('/chat', chatRouter);
router.use('/design', designRouter);

// Test endpoint for AI router
router.get('/', (req, res) => {
  res.json({ message: 'AI API is working' });
});

export default router;
