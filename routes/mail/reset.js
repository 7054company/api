import express from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { UserModel } from '../../models/user.model.js';

const router = express.Router();

// Email configuration
const EMAIL_CONFIG = {
  API_KEY: 'mlsn.a1a1dc095b6c029170820f074982ce3093e669e58f794a1db106b7d9139fbd69',
  SENDER_EMAIL: 'user@trial-o65qngkpr08lwr12.mlsender.net',
  SENDER_NAME: 'Your Support Team',
};

// In-memory token storage (use database in production)
const resetTokens = new Map();

// Token management
const tokenManager = {
  generate(userId, email) {
    const token = uuidv4();
    const expires = Date.now() + 15 * 60 * 1000; // 15 minutes
    
    resetTokens.set(token, { userId, email, expires });
    return token;
  },

  validate(token) {
    const data = resetTokens.get(token);
    
    if (!data) {
      throw new Error('Invalid reset token');
    }
    
    if (Date.now() > data.expires) {
      resetTokens.delete(token);
      throw new Error('Reset token has expired');
    }
    
    return data;
  },

  remove(token) {
    resetTokens.delete(token);
  }
};

// Email service
const emailService = {
  async sendResetEmail(toEmail, username, resetToken) {
    const url = 'https://api.mailersend.com/v1/email';
    const resetUrl = `https://famous-liger-b17e21.netlify.app/forgot-password/code/${resetToken}`;
    
    const emailData = {
      from: {
        email: EMAIL_CONFIG.SENDER_EMAIL,
        name: EMAIL_CONFIG.SENDER_NAME,
      },
      to: [{ email: toEmail, name: username }],
      subject: 'Password Reset Request',
      text: this._getPlainText(username, resetToken, resetUrl),
      html: this._getHtml(username, resetToken, resetUrl),
    };

    try {
      await axios.post(url, emailData, {
        headers: {
          'Authorization': `Bearer ${EMAIL_CONFIG.API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      return true;
    } catch (error) {
      console.error('Email sending failed:', error.response?.data || error.message);
      throw new Error('Failed to send reset email');
    }
  },

  _getPlainText(username, resetToken, resetUrl) {
    return `
      Hello ${username},

      We received a request to reset your password. Here's your password reset token:
      ${resetToken}

      Or click the following link to reset your password:
      ${resetUrl}

      This token will expire in 15 minutes.

      If you did not request this reset, please ignore this email.

      Best regards,
      ${EMAIL_CONFIG.SENDER_NAME}
    `;
  },

  _getHtml(username, resetToken, resetUrl) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb; margin-bottom: 24px;">Password Reset Request</h1>
        
        <p style="margin-bottom: 16px;">Hello ${username},</p>
        
        <p style="margin-bottom: 24px;">We received a request to reset your password. Here's your password reset token:</p>
        
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <code style="font-size: 18px; color: #1f2937;">${resetToken}</code>
        </div>

        <div style="margin-bottom: 24px;">
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 24px;">
          This token will expire in 15 minutes.
        </p>
        
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 24px;">
          If you did not request this reset, please ignore this email.
        </p>
        
        <p style="margin-bottom: 8px;">Best regards,</p>
        <p style="color: #2563eb; font-weight: bold;">${EMAIL_CONFIG.SENDER_NAME}</p>
      </div>
    `;
  }
};

// Route handlers
router.get('/f/:identifier', async (req, res) => {
  const { identifier } = req.params;

  try {
    // Find user
    const user = await UserModel.findByEmail(identifier);
    if (!user) {
      return res.status(404).json({ 
        message: 'No account found with this email address' 
      });
    }

    // Generate reset token
    const resetToken = tokenManager.generate(user.id, user.email);

    // Send reset email
    await emailService.sendResetEmail(user.email, user.username, resetToken);

    res.json({ 
      message: 'Password reset instructions sent',
      email: user.email
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      message: 'Error processing password reset request' 
    });
  }
});

router.post('/reset', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Validate token
    const resetData = tokenManager.validate(token);

    // Update password
    await UserModel.updatePassword(resetData.userId, newPassword);
    
    // Clear token
    tokenManager.remove(token);

    res.json({ 
      message: 'Password successfully reset' 
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(400).json({ 
      message: error.message || 'Error resetting password' 
    });
  }
});

export default router;
