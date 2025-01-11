import { query } from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export const AuthXAppModel = {
  // Create a new application
  async create({ userId, name, type, domain = null, status = 'active', configure = null, secret_key = null }) {
    const id = uuidv4();
    const sql = `
      INSERT INTO authx_apps (
        id, user_id, name, type, domain, status, configure, secret_key,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    await query(sql, [id, userId, name, type, domain, status, configure, secret_key]);
    return id;
  },

  // Get all apps for a user
  async getByUserId(userId) {
    const sql = `
      SELECT 
        a.*,
        COUNT(DISTINCT u.id) as user_count,
        TIMESTAMPDIFF(MINUTE, a.updated_at, NOW()) as minutes_ago
      FROM authx_apps a
      LEFT JOIN authx_app_users u ON a.id = u.app_id
      WHERE a.user_id = ?
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `;
    
    const apps = await query(sql, [userId]);
    return apps.map(app => ({
      ...app,
      lastUpdated: this.formatTimeAgo(app.minutes_ago)
    }));
  },

  // Get single app by ID
  async getById(id) {
    const sql = `
      SELECT 
        a.*,
        COUNT(DISTINCT u.id) as user_count,
        TIMESTAMPDIFF(MINUTE, a.updated_at, NOW()) as minutes_ago
      FROM authx_apps a
      LEFT JOIN authx_app_users u ON a.id = u.app_id
      WHERE a.id = ?
      GROUP BY a.id
    `;
    
    const [app] = await query(sql, [id]);
    if (!app) return null;

    return {
      ...app,
      lastUpdated: this.formatTimeAgo(app.minutes_ago)
    };
  },

  // Update application
  async update(id, updates) {
    const allowedFields = ['name', 'domain', 'status', 'type', 'configure', 'secret_key'];
    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updateFields.length === 0) return false;

    updateFields.push('updated_at = NOW()');
    values.push(id);

    const sql = `
      UPDATE authx_apps 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await query(sql, values);
    return true;
  },

  // Delete application
  async delete(id) {
    const sql = 'DELETE FROM authx_apps WHERE id = ?';
    await query(sql, [id]);
  },

  // Helper function to format time ago
  formatTimeAgo(minutes) {
    if (minutes < 60) {
      return `${minutes} minutes ago`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
  }
};
