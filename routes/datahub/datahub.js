import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database.js';
import { authenticateToken } from '../../auth.js';

const router = express.Router();

// Add CORS headers for all routes
router.use((req, res, next) => {
  res.header('Content-Type', 'application/json');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Create new data item - POST /api/d/new
router.post('/new', authenticateToken, async (req, res) => {
  try {
    const { name, content = '', type = 'file', parentId = null, isPublic = false, parent_id } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false,
        message: 'Name is required' 
      });
    }

    const id = uuidv4();
    const userId = req.user.id;
    const finalParentId = parentId || parent_id || null;

    const sql = `
      INSERT INTO datahub_data (
        id, user_id, parent_id, name, type, content, is_public,
        file_size, config, tags, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '{}', '[]', NOW(), NOW())
    `;
    
    const fileSize = content ? content.length : 0;
    await query(sql, [id, userId, finalParentId, name, type, content, isPublic, fileSize]);

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
    const { parentId = null, parent_id, type } = req.query;
    const finalParentId = parentId || parent_id || null;

    let sql = `
      SELECT id, name, type, file_size, is_public, created_at, updated_at, parent_id
      FROM datahub_data 
      WHERE user_id = ? AND parent_id ${finalParentId ? '= ?' : 'IS NULL'}
    `;
    
    const params = [userId];
    if (finalParentId) params.push(finalParentId);

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY type DESC, name ASC';

    const items = await query(sql, params);

    return res.status(200).json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch items',
      error: error.message
    });
  }
});

// List user's files - GET /api/d/files
router.get('/files', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT id, name, file_size, is_public, created_at, updated_at
      FROM datahub_data
      WHERE user_id = ? AND type = 'file'
      ORDER BY updated_at DESC
    `;
    
    const files = await query(sql, [userId]);

    return res.status(200).json({
      success: true,
      files: files.map(file => ({
        id: file.id,
        name: file.name,
        size: file.file_size,
        isPublic: file.is_public,
        createdAt: file.created_at,
        updatedAt: file.updated_at,
        publicUrl: file.is_public ? `/api/d/p/${file.id}` : null
      }))
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch files',
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

    return res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error fetching item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch item',
      error: error.message
    });
  }
});

// View public file content (raw) - GET /api/d/p/:id
router.get('/p/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT name, content, mime_type, file_size, updated_at
      FROM datahub_data
      WHERE id = ? AND is_public = TRUE AND type = 'file'
    `;
    
    const [file] = await query(sql, [id]);
    
    if (!file) {
      return res.status(404).send('File not found or not public');
    }

    // Set appropriate headers
    if (file.mime_type) {
      res.set('Content-Type', file.mime_type);
    } else {
      res.set('Content-Type', 'text/plain');
    }
    
    if (file.file_size) {
      res.set('Content-Length', file.file_size.toString());
    }
    
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Last-Modified', new Date(file.updated_at).toUTCString());
    
    // Return raw content
    res.send(file.content || '');
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).send('Internal server error');
  }
});

// Get public file content in JSON form - GET /api/d/p/:id/json
router.get('/p/:id/json', async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT id, name, content, mime_type, file_size, updated_at, created_at
      FROM datahub_data
      WHERE id = ? AND is_public = TRUE AND type = 'file'
    `;
    
    const [file] = await query(sql, [id]);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found or not public'
      });
    }

    res.json({
      success: true,
      data: file
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
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

// Update file content and name (alternative endpoint) - PUT /api/d/p/:id
router.put('/p/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content } = req.body;
    const userId = req.user.id;

    // Check if file exists and belongs to user
    const checkSql = `
      SELECT id FROM datahub_data
      WHERE id = ? AND user_id = ? AND type = 'file'
    `;
    
    const [existingFile] = await query(checkSql, [id, userId]);
    
    if (!existingFile) {
      return res.status(404).json({
        success: false,
        message: 'File not found or access denied'
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

    res.json({
      success: true,
      message: 'File updated successfully'
    });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update file',
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

// Delete file (alternative endpoint) - DELETE /api/d/p/:id
router.delete('/p/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const sql = `
      DELETE FROM datahub_data 
      WHERE id = ? AND user_id = ? AND type = 'file'
    `;
    
    const result = await query(sql, [id, userId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
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
