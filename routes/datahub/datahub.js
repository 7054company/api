import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database.js';
import { authenticateToken } from '../../auth.js';

const router = express.Router();

// Create new data item - POST /api/d/new
router.post('/new', authenticateToken, async (req, res) => {
  try {
    const { name, content = '', type = 'file', parentId = null, isPublic = false } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false,
        message: 'Name is required' 
      });
    }

    const id = uuidv4();
    const userId = req.user.id;

    const sql = `
      INSERT INTO datahub_data (
        id, user_id, parent_id, name, type, content, is_public, 
        file_size, config, tags, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '{}', '[]', NOW(), NOW())
    `;
    
    const fileSize = content ? content.length : 0;
    await query(sql, [id, userId, parentId, name, type, content, isPublic, fileSize]);

    const newItem = await query(
      'SELECT * FROM datahub_data WHERE id = ?', 
      [id]
    );

    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: newItem[0]
    });
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create item',
      error: error.message 
    });
  }
});

// Get all user's data items - GET /api/d/list
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { parentId = null, type } = req.query;

    let sql = `
      SELECT id, name, type, file_size, is_public, created_at, updated_at, parent_id
      FROM datahub_data 
      WHERE user_id = ? AND parent_id ${parentId ? '= ?' : 'IS NULL'}
    `;
    
    const params = [userId];
    if (parentId) params.push(parentId);

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY type DESC, name ASC';

    const items = await query(sql, params);

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch items',
      error: error.message
    });
  }
});

// View file content (authenticated) - GET /api/d/v/:id
router.get('/v/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const sql = `
      SELECT id, name, content, type, file_size, is_public, created_at, updated_at
      FROM datahub_data
      WHERE id = ? AND user_id = ?
    `;
    
    const [item] = await query(sql, [id, userId]);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found or access denied'
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch item',
      error: error.message
    });
  }
});

// View public file content (no auth required) - GET /api/d/p/:id
router.get('/p/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT id, name, content, type, file_size, created_at, updated_at
      FROM datahub_data
      WHERE id = ? AND is_public = TRUE
    `;
    
    const [item] = await query(sql, [id]);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Public item not found'
      });
    }

    // For file content, return raw content if it's a text file
    if (item.type === 'file' && item.content) {
      res.set('Content-Type', 'text/plain');
      res.send(item.content);
    } else {
      res.json({
        success: true,
        data: item
      });
    }
  } catch (error) {
    console.error('Error fetching public item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch public item',
      error: error.message
    });
  }
});

// Update data item - PUT /api/d/update/:id
router.put('/update/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content, isPublic } = req.body;
    const userId = req.user.id;

    // Check if item exists and belongs to user
    const checkSql = `
      SELECT id FROM datahub_data
      WHERE id = ? AND user_id = ?
    `;
    
    const [existingItem] = await query(checkSql, [id, userId]);
    
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found or access denied'
      });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (content !== undefined) {
      updates.push('content = ?');
      updates.push('file_size = ?');
      values.push(content);
      values.push(content.length);
    }

    if (isPublic !== undefined) {
      updates.push('is_public = ?');
      values.push(isPublic);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updates.push('updated_at = NOW()');
    values.push(id, userId);

    const sql = `
      UPDATE datahub_data 
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `;

    await query(sql, values);

    // Get updated item
    const updatedItem = await query(
      'SELECT * FROM datahub_data WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    res.json({
      success: true,
      message: 'Item updated successfully',
      data: updatedItem[0]
    });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item',
      error: error.message
    });
  }
});

// Delete data item - DELETE /api/d/delete/:id
router.delete('/delete/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const sql = `
      DELETE FROM datahub_data 
      WHERE id = ? AND user_id = ?
    `;
    
    const result = await query(sql, [id, userId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete item',
      error: error.message
    });
  }
});

// Search data items - GET /api/d/search
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { q: searchTerm, type, limit = 50 } = req.query;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    let sql = `
      SELECT id, name, type, file_size, is_public, created_at, updated_at
      FROM datahub_data 
      WHERE user_id = ? AND (
        name LIKE ? OR 
        content LIKE ? OR
        JSON_SEARCH(tags, 'one', ?) IS NOT NULL
      )
    `;

    const searchPattern = `%${searchTerm}%`;
    const params = [userId, searchPattern, searchPattern, searchTerm];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY updated_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const items = await query(sql, params);

    res.json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (error) {
    console.error('Error searching items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search items',
      error: error.message
    });
  }
});

export default router;
