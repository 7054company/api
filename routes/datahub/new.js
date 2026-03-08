import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DataHubModel } from '../../models/d/new.model.js';
import { authenticateToken } from '../../auth.js';

const router = express.Router();

// Get all data items for a bucket or user
router.get('/data', authenticateToken, async (req, res) => {
  try {
    const { bucketId } = req.query;
    const userId = req.user.id;

    let items;
    // Get items for specific bucket or all items if no bucket specified
    items = await DataHubModel.getRootItems(userId, bucketId);

    res.json({
      success: true,
      items
    });
  } catch (error) {
    console.error('Error fetching data items:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch data items',
      error: error.message 
    });
  }
});

// Create new data item
router.post('/data', authenticateToken, async (req, res) => {
  try {
    const { name, content, type = 'file', bucketId, parentId, tags, isPublic = false } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false,
        message: 'Name is required' 
      });
    }

    const dataItem = await DataHubModel.create({
      userId: req.user.id,
      bucketId,
      name,
      content: content || '',
      type,
      parentId: parentId || null,
      tags: tags || [],
      isPublic
    });

    res.status(201).json({
      success: true,
      message: 'Data item created successfully',
      item: dataItem
    });
  } catch (error) {
    console.error('Error creating data item:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create data item',
      error: error.message 
    });
  }
});

// Get single data item
router.get('/data/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const item = await DataHubModel.getById(id, userId);
    
    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: 'Data item not found' 
      });
    }

    res.json({
      success: true,
      item
    });
  } catch (error) {
    console.error('Error fetching data item:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch data item',
      error: error.message 
    });
  }
});

// Update data item
router.put('/data/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content, tags, isPublic } = req.body;
    const userId = req.user.id;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (content !== undefined) updates.content = content;
    if (tags !== undefined) updates.tags = tags;
    if (isPublic !== undefined) updates.is_public = isPublic;

    const updatedItem = await DataHubModel.update(id, updates, userId);

    res.json({
      success: true,
      message: 'Data item updated successfully',
      item: updatedItem
    });
  } catch (error) {
    console.error('Error updating data item:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update data item',
      error: error.message 
    });
  }
});

// Delete data item
router.delete('/data/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await DataHubModel.delete(id, userId);

    res.json({
      success: true,
      message: 'Data item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting data item:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete data item',
      error: error.message 
    });
  }
});

// Search data items
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: searchTerm, type } = req.query;
    const userId = req.user.id;

    if (!searchTerm) {
      return res.status(400).json({ 
        success: false,
        message: 'Search term is required' 
      });
    }

    const results = await DataHubModel.search(searchTerm, userId, type);

    res.json({
      success: true,
      results,
      count: results.length
    });
  } catch (error) {
    console.error('Error searching data items:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to search data items',
      error: error.message 
    });
  }
});

// Get data statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await DataHubModel.getStats(userId);

    res.json({
      success: true,
      stats
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

// Move data item
router.post('/data/:id/move', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { parentId } = req.body;
    const userId = req.user.id;

    const movedItem = await DataHubModel.move(id, parentId, userId);

    res.json({
      success: true,
      message: 'Data item moved successfully',
      item: movedItem
    });
  } catch (error) {
    console.error('Error moving data item:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to move data item',
      error: error.message 
    });
  }
});

// Copy data item
router.post('/data/:id/copy', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { parentId, newName } = req.body;
    const userId = req.user.id;

    const copiedItem = await DataHubModel.copy(id, parentId, newName, userId);

    res.json({
      success: true,
      message: 'Data item copied successfully',
      item: copiedItem
    });
  } catch (error) {
    console.error('Error copying data item:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to copy data item',
      error: error.message 
    });
  }
});

// Toggle public access
router.post('/data/:id/toggle-public', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;
    const userId = req.user.id;

    const result = await DataHubModel.togglePublic(id, isPublic, userId);

    res.json({
      success: true,
      message: `Data item ${isPublic ? 'made public' : 'made private'} successfully`,
      isPublic: result.isPublic
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

// Toggle public/private status
router.post('/data/:id/toggle-public', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;
    const userId = req.user.id;

    const result = await DataHubModel.togglePublicStatus(id, isPublic, userId);

    res.json({
      success: true,
      message: `Data item ${isPublic ? 'made public' : 'made private'} successfully`,
      isPublic: result.isPublic
    });
  } catch (error) {
    console.error('Error toggling public status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to toggle public status',
      error: error.message 
    });
  }
});

// Sync from URL
router.post('/data/:id/sync', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await DataHubModel.syncFromUrl(id, userId);

    res.json({
      success: true,
      message: 'Data synced successfully',
      content: result.content
    });
  } catch (error) {
    console.error('Error syncing data:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to sync data',
      error: error.message 
    });
  }
});

export default router;
