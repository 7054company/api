import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database.js';

const router = express.Router();

// Helper to safely stringify
const safeJSONStringify = (input, fallback = '{}') => {
  if (typeof input === 'string') return input;
  try {
    return JSON.stringify(input ?? {});
  } catch {
    return fallback;
  }
};

// Helper to safely stringify arrays
const safeJSONStringifyArray = (input) => {
  try {
    return JSON.stringify(Array.isArray(input) ? input : [input]);
  } catch {
    return '[]';
  }
};

// Create new data entry
router.post('/new', async (req, res) => {
  try {
    const { userId = 0, data = '', name = '', bucket_id = null, tags = [] } = req.body;
    const id = uuidv4();
    const apiKey = uuidv4().replace(/-/g, '');

    const config = {
      apikey: apiKey,
      ap1: 'disable'
    };

    const sql = `
      INSERT INTO datahub_data (
        id, user_id, bucket_id, name, data, config, tags, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    await query(sql, [
      id,
      userId,
      bucket_id,
      name,
      typeof data === 'string' ? data : safeJSONStringify(data, '""'),
      safeJSONStringify(config),
      safeJSONStringifyArray(tags)
    ]);

    res.status(201).json({
      success: true,
      id,
      apiKey
    });
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
        name,
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

    try {
      result.config = JSON.parse(result.config || '{}');
      result.tags = JSON.parse(result.tags || '[]');
      result.requiresApiKey = result.config.ap1 === 'enable';
    } catch (e) {
      result.config = {};
      result.tags = [];
      result.requiresApiKey = false;
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ message: 'Failed to fetch data entry' });
  }
});

// Update data entry
router.put('/x/:id', async (req, res) => {
  try {
    const { data, name, tags, config, logs, bucket_id } = req.body;
    const updateFields = [];
    const values = [];

    if (data !== undefined) {
      updateFields.push('data = ?');
      values.push(typeof data === 'string' ? data : safeJSONStringify(data, '""'));
    }

    if (name !== undefined) {
      updateFields.push('name = ?');
      values.push(name);
    }

    if (tags !== undefined) {
      updateFields.push('tags = ?');
      values.push(safeJSONStringifyArray(tags));
    }

    if (config !== undefined) {
      updateFields.push('config = ?');
      values.push(safeJSONStringify(config));
    }

    if (logs !== undefined) {
      updateFields.push('logs = ?');
      values.push(safeJSONStringify(logs));
    }

    if (bucket_id !== undefined) {
      updateFields.push('bucket_id = ?');
      values.push(bucket_id);
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

    const [updatedData] = await query('SELECT * FROM datahub_data WHERE id = ?', [req.params.id]);

    res.json(updatedData);
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
