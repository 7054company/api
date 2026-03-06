import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { DataHubModel } from '../../models/d/new.model.js';
import { authenticateToken } from '../../auth.js';

const router = express.Router();

// Get item by path (authenticated)
router.get('/path/*', authenticateToken, async (req, res) => {
  try {
    const itemPath = req.params[0] || '';
    const item = await DataHubModel.getByPath(req.user.id, itemPath);
    
    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: 'Item not found' 
      });
    }
    
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error fetching item by path:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch item',
      error: error.message 
    });
  }
});

// Get full path of an item
router.get('/x/:id/fullpath', authenticateToken, async (req, res) => {
  try {
    const fullPath = await DataHubModel.getFullPath(req.params.id, req.user.id);
    
    res.json({
      success: true,
      data: { 
        path: fullPath,
        publicUrl: fullPath ? `/api/d/public/${req.user.id}/${fullPath}` : null
      }
    });
  } catch (error) {
    console.error('Error fetching full path:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch item path',
      error: error.message
    });
  }
});

// Create new data entry (file or folder)
router.post('/new', authenticateToken, async (req, res) => {
  try {
    const result = await DataHubModel.create({
      ...req.body,
      userId: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating data:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create data entry',
      error: error.message 
    });
  }
});

// Create new folder
router.post('/new/folder', authenticateToken, async (req, res) => {
  try {
    const result = await DataHubModel.createFolder({
      ...req.body,
      userId: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create folder',
      error: error.message 
    });
  }
});

// Create new file
router.post('/new/file', authenticateToken, async (req, res) => {
  try {
    const result = await DataHubModel.createFile({
      ...req.body,
      userId: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: result
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

// Get root items for user
router.get('/root', authenticateToken, async (req, res) => {
  try {
    const items = await DataHubModel.getRootItems(req.user.id);
    
    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('Error fetching root items:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch root items',
      error: error.message 
    });
  }
});

// Get data entry by ID
router.get('/x/:id', authenticateToken, async (req, res) => {
  try {
    const result = await DataHubModel.getById(req.params.id, req.user.id);
    
    if (!result) {
      return res.status(404).json({ 
        success: false,
        message: 'Data not found' 
      });
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch data entry',
      error: error.message 
    });
  }
});

// Toggle public access
router.put('/x/:id/public', authenticateToken, async (req, res) => {
  try {
    const { isPublic } = req.body;
    
    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isPublic must be a boolean value'
      });
    }

    const result = await DataHubModel.togglePublic(req.params.id, isPublic, req.user.id);
    const fullPath = await DataHubModel.getFullPath(req.params.id, req.user.id);

    res.json({
      success: true,
      message: `Item ${isPublic ? 'made public' : 'made private'} successfully`,
      data: {
        ...result,
        publicUrl: isPublic && fullPath ? `/api/d/public/${req.user.id}/${fullPath}` : null
      }
    });
  } catch (error) {
    console.error('Error toggling public access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle public access',
      error: error.message
    });
  }
});

// Bulk operations
router.post('/bulk/:operation', authenticateToken, async (req, res) => {
  try {
    const { operation } = req.params;
    const { itemIds, targetFolderId, isPublic } = req.body;

    if (!itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({
        success: false,
        message: 'itemIds array is required'
      });
    }

    let results = [];

    switch (operation) {
      case 'move':
        if (targetFolderId === undefined) {
          return res.status(400).json({
            success: false,
            message: 'targetFolderId is required for move operation'
          });
        }
        
        for (const itemId of itemIds) {
          try {
            await DataHubModel.move(itemId, targetFolderId, req.user.id);
            results.push({ itemId, success: true });
          } catch (error) {
            results.push({ itemId, success: false, error: error.message });
          }
        }
        break;

      case 'delete':
        for (const itemId of itemIds) {
          try {
            await DataHubModel.delete(itemId, req.user.id);
            results.push({ itemId, success: true });
          } catch (error) {
            results.push({ itemId, success: false, error: error.message });
          }
        }
        break;

      case 'toggle-public':
        if (typeof isPublic !== 'boolean') {
          return res.status(400).json({
            success: false,
            message: 'isPublic boolean is required for toggle-public operation'
          });
        }
        
        for (const itemId of itemIds) {
          try {
            await DataHubModel.togglePublic(itemId, isPublic, req.user.id);
            results.push({ itemId, success: true });
          } catch (error) {
            results.push({ itemId, success: false, error: error.message });
          }
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid operation. Supported: move, delete, toggle-public'
        });
    }

    res.json({
      success: true,
      message: `Bulk ${operation} completed`,
      results
    });
  } catch (error) {
    console.error('Error in bulk operation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk operation',
      error: error.message
    });
  }
});

// Sync file from URL
router.post('/x/:id/sync', authenticateToken, async (req, res) => {
  try {
    const result = await DataHubModel.syncFromUrl(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'File synced successfully',
      data: result
    });
  } catch (error) {
    console.error('Error syncing file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync file',
      error: error.message
    });
  }
});

// Copy item
router.post('/x/:id/copy', authenticateToken, async (req, res) => {
  try {
    const { targetFolderId, newName } = req.body;
    
    const result = await DataHubModel.copy(req.params.id, targetFolderId, newName, req.user.id);
    
    res.json({
      success: true,
      message: 'Item copied successfully',
      data: result
    });
  } catch (error) {
    console.error('Error copying item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to copy item',
      error: error.message
    });
  }
});

// Update data entry
router.put('/x/:id', authenticateToken, async (req, res) => {
  try {
    const updatedData = await DataHubModel.update(req.params.id, req.body, req.user.id);
    
    res.json({
      success: true,
      data: updatedData
    });
  } catch (error) {
    console.error('Error updating data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update data entry',
      error: error.message
    });
  }
});

// Rename file or folder
router.put('/x/:id/rename', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    const updatedData = await DataHubModel.rename(req.params.id, name, req.user.id);
    
    res.json({
      success: true,
      data: updatedData
    });
  } catch (error) {
    console.error('Error renaming item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rename item',
      error: error.message
    });
  }
});

// Move file or folder
router.put('/x/:id/move', authenticateToken, async (req, res) => {
  try {
    const { parentId } = req.body;
    
    const updatedData = await DataHubModel.move(req.params.id, parentId, req.user.id);
    
    res.json({
      success: true,
      data: updatedData
    });
  } catch (error) {
    console.error('Error moving item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to move item',
      error: error.message
    });
  }
});

// Get folder children
router.get('/x/:id/children', authenticateToken, async (req, res) => {
  try {
    const children = await DataHubModel.getChildren(req.params.id, req.user.id);
    
    res.json({
      success: true,
      data: children
    });
  } catch (error) {
    console.error('Error fetching children:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch folder contents',
      error: error.message
    });
  }
});

// Search items
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: searchTerm, type } = req.query;
    
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    const results = await DataHubModel.search(searchTerm, req.user.id, type);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search items',
      error: error.message
    });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await DataHubModel.getStats(req.user.id);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// Get item path
router.get('/x/:id/path', authenticateToken, async (req, res) => {
  try {
    const path = await DataHubModel.getPath(req.params.id, req.user.id);
    
    res.json({
      success: true,
      data: { path }
    });
  } catch (error) {
    console.error('Error fetching path:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch item path',
      error: error.message
    });
  }
});

// Delete data entry
router.delete('/x/:id', authenticateToken, async (req, res) => {
  try {
    await DataHubModel.delete(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete item',
      error: error.message
    });
  }
});

export default router;
