import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database.js';

const router = express.Router();

// Create new data entry
router.post('/new', async (req, res) => {
  try {
    const { userId = 0, data = {}, bucket_id = null } = req.body;
    const id = uuidv4();
    const apiKey = uuidv4().replace(/-/g, '');

    
    const config = {
      apikey: apiKey,
      ap1: 'disable'
    };

    // Handle tags
    let tags = [];
    if (data.tags) {
      tags = Array.isArray(data.tags) ? data.tags : [data.tags];
    }

    const sql = `
      INSERT INTO datahub_data (
        id, user_id, bucket_id, data, config, tags, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    await query(sql, [
      id, 
      userId, 
      bucket_id,
      JSON.stringify(data),
      JSON.stringify(config),
      JSON.stringify(tags)
    ]);
    
    return { id, apiKey };
  } catch (error) {
    console.error('Error creating data:', error);
    res.status(500).json({ message: 'Failed to create data entry' });
  }
});

// Get data entry by ID
router.get('/x/:id', async (req, res) => {
  try {
    const sql = `
      SELECT 
        id,
        user_id,
        bucket_id,
        data,
        config,
        tags,
        logs,
        created_at,
        updated_at
      FROM datahub_data
      WHERE id = ?
    `;
    
    const [result] = await query(sql, [req.params.id]);
    
    if (!result) {
      return res.status(404).json({ message: 'Data not found' });
    }
    
    // Parse config and tags
    const config = JSON.parse(result.config || '{}');
    result.requiresApiKey = config.ap1 === 'enable';
    result.tags = JSON.parse(result.tags || '[]');
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ message: 'Failed to fetch data entry' });
  }
});

// Update data entry
router.put('/x/:id', async (req, res) => {
  try {
    const allowedFields = ['data', 'config', 'logs', 'tags', 'bucket_id'];
    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(req.body)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push('updated_at = NOW()');
    values.push(req.params.id);

    const sql = `
      UPDATE datahub_data 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await query(sql, values);
    
    const updatedData = await query(
      'SELECT * FROM datahub_data WHERE id = ?', 
      [req.params.id]
    );
    
    res.json(updatedData[0]);
  } catch (error) {
    console.error('Error updating data:', error);
    res.status(500).json({ message: 'Failed to update data entry' });
  }
});

// Delete data entry
router.delete('/x/:id', async (req, res) => {
  try {
    const sql = 'DELETE FROM datahub_data WHERE id = ?';
    await query(sql, [req.params.id]);
    res.json({ message: 'Data entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting data:', error);
    res.status(500).json({ message: 'Failed to delete data entry' });
  }
});

export default router;
