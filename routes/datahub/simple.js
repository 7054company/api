import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database.js';
import { authenticateToken } from '../../auth.js';

const router = express.Router();

// Create new data item - POST /api/d/new
router.post('/new', authenticateToken, async (req, res) => {
  try {
    const { name, content = '' } = req.body;
    
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
        id, user_id, name, type, content, is_public, file_size, created_at, updated_at
      ) VALUES (?, ?, ?, 'file', ?, TRUE, ?, NOW(), NOW())
    `;
    
    await query(sql, [id, userId, name, content, content.length]);

    res.status(201).json({
      success: true,
      message: 'File created successfully',
      id,
      name
    });
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create file',
      error: error.message 
    });
  }
});

// Get file content in raw form - GET /api/d/p/:id
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

// Update file content and name - PUT /api/d/p/:id
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

// Delete file - DELETE /api/d/p/:id
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

    res.json({
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
    res.status(500).json({
      success: false,
      message: 'Failed to fetch files',
      error: error.message
    });
  }
});

export default router;
