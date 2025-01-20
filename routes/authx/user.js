import express from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { AuthXUserModel } from '../../models/authx/user.model.js';
import { AuthXAppModel } from '../../models/authx/app.model.js';

const router = express.Router({ mergeParams: true });

// Middleware to validate app
const validateApp = async (req, res, next) => {
  try {
    const { appId } = req.params;
    const app = await AuthXAppModel.getById(appId);
    
    if (!app) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    req.app = app;
    next();
  } catch (error) {
    console.error('App validation error:', error);
    res.status(500).json({ message: 'Error validating application' });
  }
};

// Register new user
router.post('/signup', validateApp, async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const { appId } = req.params;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if user exists
    const existingUser = await AuthXUserModel.findByEmail(appId, email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const userId = await AuthXUserModel.create({
      appId,
      email,
      password,
      username
    });

    // Generate token
    const token = jwt.sign(
      { id: userId, email, appId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: userId,
        email,
        username
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Login
router.post('/login', validateApp, async (req, res) => {
  try {
    const { email, password } = req.body;
    const { appId } = req.params;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await AuthXUserModel.findByEmail(appId, email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, appId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: AuthXUserModel.formatUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Request password reset
router.post('/forgot-password', validateApp, async (req, res) => {
  try {
    const { email } = req.body;
    const { appId } = req.params;

    const user = await AuthXUserModel.findByEmail(appId, email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = uuidv4();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Token expires in 1 hour

    await AuthXUserModel.addResetToken(appId, user.id, resetToken, expires);

    // In a real application, send email with reset token
    res.json({ 
      message: 'Password reset instructions sent',
      resetToken // Only for development, remove in production
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Error processing password reset' });
  }
});

// Reset password
router.post('/reset-password', validateApp, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const { appId } = req.params;

    const userId = await AuthXUserModel.validateResetToken(appId, token);
    if (!userId) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    await AuthXUserModel.updatePassword(appId, userId, newPassword);
    await AuthXUserModel.markTokenUsed(appId, token);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

// Get current user
router.get('/me', validateApp, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Authentication token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const { appId } = req.params;

    if (decoded.appId !== appId) {
      return res.status(403).json({ message: 'Invalid token for this application' });
    }

    const user = await AuthXUserModel.findById(appId, decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: AuthXUserModel.formatUser(user) });
  } catch (error) {
    console.error('Get user error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Error fetching user data' });
  }
});

export default router;
