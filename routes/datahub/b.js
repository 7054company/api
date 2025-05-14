import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database.js';
import { authenticateToken } from '../../auth.js';

const router = express.Router();

// Create new bucket
router.post('/new/b', authenticateToken, async (req, res) => {
  try {
    const { name, config = {} } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Bucket name is required' });
    }

    const id = uuidv4();
    const userId = req.user.id;

    const sql = `
      INSERT INTO datahub_buckets (
        id, user_id, name, config, created_at, updated_at
      ) VALUES (?, ?, ?, ?, NOW(), NOW())
    `;
    
    await query(sql, [id, userId, name, JSON.stringify(config)]);

    res.status(201).json({
      success: true,
      bucket: { 
        id,
        name,
        config
      }
    });
  } catch (error) {
    console.error('Error creating bucket:', error);
    res.status(500).json({ message: 'Failed to create bucket' });
  }
});

// Get user's buckets
router.get('/b', authenticateToken, async (req, res) => {
  try {
    const sql = `
      SELECT id, name, config, created_at, updated_at
      FROM datahub_buckets
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;
    
    const buckets = await query(sql, [req.user.id]);
    res.json({ buckets });
  } catch (error) {
    console.error('Error fetching buckets:', error);
    res.status(500).json({ message: 'Failed to fetch buckets' });
  }
});

// Get single bucket
router.get('/b/:id', authenticateToken, async (req, res) => {
  try {
    const sql = `
      SELECT id, name, config, created_at, updated_at
      FROM datahub_buckets
      WHERE id = ? AND user_id = ?
    `;
    
    const [bucket] = await query(sql, [req.params.id, req.user.id]);
    
    if (!bucket) {
      return res.status(404).json({ message: 'Bucket not found' });
    }

    res.json({ bucket });
  } catch (error) {
    console.error('Error fetching bucket:', error);
    res.status(500).json({ message: 'Failed to fetch bucket' });
  }
});

// Update bucket
router.put('/b/:id', authenticateToken, async (req, res) => {
  try {
    const { name, config } = req.body;
    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }

    if (config) {
      updates.push('config = ?');
      values.push(JSON.stringify(config));
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    updates.push('updated_at = NOW()');
    values.push(req.params.id, req.user.id);

    const sql = `
      UPDATE datahub_buckets 
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `;

    const result = await query(sql, values);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Bucket not found' });
    }

    res.json({ 
      message: 'Bucket updated successfully',
      bucket: { id: req.params.id, name, config }
    });
  } catch (error) {
    console.error('Error updating bucket:', error);
    res.status(500).json({ message: 'Failed to update bucket' });
  }
});

// Delete bucket
router.delete('/b/:id', authenticateToken, async (req, res) => {
  try {
    const sql = 'DELETE FROM datahub_buckets WHERE id = ? AND user_id = ?';
    const result = await query(sql, [req.params.id, req.user.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Bucket not found' });
    }

    res.json({ message: 'Bucket deleted successfully' });
  } catch (error) {
    console.error('Error deleting bucket:', error);
    res.status(500).json({ message: 'Failed to delete bucket' });
  }
});

export default router;
