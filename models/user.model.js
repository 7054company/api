import { query, transaction } from '../config/database.js';
import bcrypt from 'bcryptjs';

export const UserModel = {
  // Existing methods
  async findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const users = await query(sql, [email]);
    return users[0];
  },

  async create(userData) {
    const { username, email, password } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const sql = `
      INSERT INTO users (username, email, password, created_at) 
      VALUES (?, ?, ?, NOW())
    `;
    
    const result = await query(sql, [username, email, hashedPassword]);
    return result.insertId;
  },

  async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const sql = `
      UPDATE users 
      SET password = ?, 
          updated_at = NOW() 
      WHERE id = ?
    `;
    await query(sql, [hashedPassword, userId]);
  },

  async addLoginHistory(userId, ip) {
    const sql = `
      INSERT INTO login_history (user_id, ip_address, login_time)
      VALUES (?, ?, NOW())
    `;
    await query(sql, [userId, ip]);
  },

  async getLoginHistory(userId) {
    const sql = `
      SELECT ip_address as ip, login_time as timestamp
      FROM login_history
      WHERE user_id = ?
      ORDER BY login_time DESC
    `;
    return await query(sql, [userId]);
  },

  // New methods for profile management
  async findById(userId) {
    const sql = `
      SELECT id, username, email, company, phone, created_at, updated_at
      FROM users 
      WHERE id = ?
    `;
    const users = await query(sql, [userId]);
    return users[0];
  },

  async checkEmailExists(email, excludeUserId = null) {
    const sql = excludeUserId
      ? 'SELECT id FROM users WHERE email = ? AND id != ?'
      : 'SELECT id FROM users WHERE email = ?';
    
    const params = excludeUserId ? [email, excludeUserId] : [email];
    const results = await query(sql, params);
    return results.length > 0;
  },

  async updateProfile(userId, updates) {
    const validFields = ['username', 'email', 'company', 'phone'];
    const updateFields = [];
    const values = [];

    // Build dynamic update query
    for (const [key, value] of Object.entries(updates)) {
      if (validFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(value === '' ? null : value);
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push('updated_at = NOW()');
    values.push(userId); // For WHERE clause

    const sql = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await query(sql, values);
    return this.findById(userId);
  },

  // Utility methods
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  formatUserResponse(user) {
    if (!user) return null;
    
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      company: user.company || null,
      phone: user.phone || null,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }
};
