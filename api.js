import { Router } from 'express';
import { authenticateToken } from './auth.js';
import { UserModel } from './models/user.model.js';

const router = Router();

// Protected route example
router.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    res.json({
      message: 'Profile data retrieved successfully',
      user: UserModel.formatUserResponse(user)
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error retrieving profile data' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email if provided
    if (email) {
      if (!UserModel.validateEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      // Check if email is already taken
      const emailExists = await UserModel.checkEmailExists(email, req.user.id);
      if (emailExists) {
        return res.status(400).json({ message: 'Email is already in use' });
      }
    }

    // Update profile
    const updatedUser = await UserModel.updateProfile(req.user.id, req.body);

    res.json({
      message: 'Profile updated successfully',
      user: UserModel.formatUserResponse(updatedUser)
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    const message = error.message === 'No valid fields to update'
      ? error.message
      : 'Error updating profile data';
    res.status(500).json({ message });
  }
});

export default router;
