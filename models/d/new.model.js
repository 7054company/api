import { query } from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export const DataHubModel = {
  // Generate random API key
  generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
  },

  // Create new data entry
  async create(data = {}) {
    const id = uuidv4();
    const apiKey = this.generateApiKey();
    
    const config = {
      apikey: apiKey,
      ap1: 'enable'
    };

    const sql = `
      INSERT INTO datahub_data (
        id, user_id, data, config, created_at, updated_at
      ) VALUES (?, ?, ?, ?, NOW(), NOW())
    `;
    
    await query(sql, [
      id, 
      data.userId || 0, 
      JSON.stringify(data),
      JSON.stringify(config)
    ]);
    
    return { id, apiKey };
  },

  // Get data entry by ID
  async getById(id) {
    const sql = `
      SELECT 
        id,
        user_id,
        data,
        config,
        logs,
        created_at,
        updated_at
      FROM datahub_data
      WHERE id = ?
    `;
    
    const [result] = await query(sql, [id]);
    
    if (!result) return null;
    
    // Check if API key is required
    const config = JSON.parse(result.config || '{}');
    result.requiresApiKey = config.ap1 === 'enable';
    
    return result;
  },

  // Update data entry
  async update(id, updates) {
    const allowedFields = ['data', 'config', 'logs'];
    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push('updated_at = NOW()');
    values.push(id);

    const sql = `
      UPDATE datahub_data 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await query(sql, values);
    return this.getById(id);
  }
};