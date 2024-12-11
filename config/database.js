import { query, transaction } from '../config/database.js';
import bcrypt from 'bcryptjs';

export const UserModel = {
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

  async addLoginHistory(userId, ip) {
    const sql = `
      INSERT INTO login_history (user_id, ip_address, login_time)
      VALUES (?, ?, NOW())
    `;
    await query(sql, [userId, ip]);
  },

  async getLoginHistory(userId, limit = 5) {
    // Ensure limit is a valid number
    if (typeof limit !== 'number' || isNaN(limit) || limit <= 0) {
      throw new Error('Invalid LIMIT value');
    }

    console.log(`Fetching login history for userId: ${userId} with limit: ${limit}`);  // Debugging log

    const sql = `
      SELECT ip_address as ip, login_time as timestamp
      FROM login_history
      WHERE user_id = ?
      ORDER BY login_time DESC
      LIMIT ?
    `;
    
    // Log the parameters being passed to the query
    console.log('SQL Params:', [userId, limit]);

    try {
      const result = await query(sql, [userId, limit]);
      return result;
    } catch (error) {
      console.error('Database query failed:', error);  // Log error details
      throw error;  // Rethrow error for further handling
    }
  }
};
