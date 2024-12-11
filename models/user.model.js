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

async getLoginHistory(userId) {
  const sql = `
    SELECT ip_address as ip, login_time as timestamp
    FROM login_history
    WHERE user_id = ?
    ORDER BY login_time DESC
  `;
  return await query(sql, [userId]);
}

};
