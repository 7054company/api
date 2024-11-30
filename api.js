import express from 'express';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Protected route example
router.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

// Get user profile
router.get('/profile', authenticateToken, (req, res) => {
  res.json({
    message: 'Profile data retrieved successfully',
    user: req.user
  });
});

// Update user profile
router.put('/profile', authenticateToken, (req, res) => {
  // This is a placeholder for profile updates
  // In a real application, you would update the user's data in data.txt
  res.json({
    message: 'Profile updated successfully',
    updates: req.body
  });
});

export default router;
