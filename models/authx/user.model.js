import { query } from '../../config/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export const AuthXUserModel = {
  // Create a new user for an AuthX app
  async create({ appId, email, password, username = null }) {
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const sql = `
      INSERT INTO authx_app_users (
        id, app_id, email, password, username, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())
    `;
    
    await query(sql, [userId, appId, email, hashedPassword, username]);
    return userId;
  },

  // Find user by email within an app
  async findByEmail(appId, email) {
    const sql = `
      SELECT * FROM authx_app_users
      WHERE app_id = ? AND email = ?
    `;
    
    const [user] = await query(sql, [appId, email]);
    return user || null;
  },

  // Find user by ID within an app
  async findById(appId, userId) {
    const sql = `
      SELECT id, email, username, status, created_at, updated_at
      FROM authx_app_users
      WHERE app_id = ? AND id = ?
    `;
    
    const [user] = await query(sql, [appId, userId]);
    return user || null;
  },

  // Update user password
  async updatePassword(appId, userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const sql = `
      UPDATE authx_app_users
      SET password = ?, updated_at = NOW()
      WHERE app_id = ? AND id = ?
    `;
    
    await query(sql, [hashedPassword, appId, userId]);
  },

  // Add password reset token
  async addResetToken(appId, userId, token, expires) {
    const sql = `
      INSERT INTO authx_password_resets (
        app_id, user_id, token, expires_at, created_at
      ) VALUES (?, ?, ?, ?, NOW())
    `;
    
    await query(sql, [appId, userId, token, expires]);
  },

  // Validate reset token
  async validateResetToken(appId, token) {
    const sql = `
      SELECT user_id
      FROM authx_password_resets
      WHERE app_id = ? AND token = ? AND expires_at > NOW()
      AND used = 0
    `;
    
    const [result] = await query(sql, [appId, token]);
    return result?.user_id || null;
  },

  // Mark reset token as used
  async markTokenUsed(appId, token) {
    const sql = `
      UPDATE authx_password_resets
      SET used = 1, updated_at = NOW()
      WHERE app_id = ? AND token = ?
    `;
    
    await query(sql, [appId, token]);
  },

  // Format user response
  formatUser(user) {
    if (!user) return null;
    
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

   // Add new method to get all users for an app
  async getAllUsers(appId) {
    const sql = `
      SELECT 
        id,
        app_id,
        email,
        username,
        status,
        created_at,
        updated_at,
        (
          SELECT COUNT(*) 
          FROM authx_password_resets 
          WHERE user_id = authx_app_users.id
        ) as reset_count
      FROM authx_app_users
      WHERE app_id = ?
      ORDER BY created_at DESC
    `;
    
    try {
      const users = await query(sql, [appId]);
      return users.map(user => ({
        id: user.id,
        app_id: user.app_id,
        email: user.email,
        username: user.username,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
        reset_count: user.reset_count
      }));
    } catch (error) {
      console.error('Database Error:', error);
      throw new Error('Failed to fetch users');
    }
  },

};
