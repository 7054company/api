import express from 'express';
import { DataHubModel } from '../../models/d/new.model.js';
import { authenticateToken } from '../../auth.js';

const router = express.Router();

// Get all data items for a bucket or user
router.get('/data', authenticateToken, async (req, res) => {
  try {
    const { bucketId } = req.query;
    const userId = req.user.id;

    let items;
    if (bucketId) {
      // Get items for specific bucket (root level items for now)
      items = await DataHubModel.getRootItems(userId);
    } else {
      // Get all root items for user
      items = await DataHubModel.getRootItems(userId);
    }

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

export default router;
