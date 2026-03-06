import express from 'express';
import { DataHubModel } from '../../models/d/new.model.js';

const router = express.Router();

// Public access route - get item by user ID and path
// Route: /api/d/public/:userId/*
router.get('/:userId/*', async (req, res) => {
  try {
    const { userId } = req.params;
    const itemPath = req.params[0] || ''; // Get the wildcard path
    
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: 'User ID is required' 
      });
    }

    // Get item by path
    const item = await DataHubModel.getByPath(userId, itemPath);
    
    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: 'File or folder not found' 
      });
    }

    // Check if item is public
    if (!item.is_public) {
      return res.status(403).json({ 
        success: false,
        message: 'This item is not publicly accessible' 
      });
    }

    // For files, return content directly or as JSON based on Accept header
    if (item.type === 'file') {
      const acceptHeader = req.headers.accept || '';
      
      // If requesting JSON or no specific type, return JSON response
      if (acceptHeader.includes('application/json') || acceptHeader.includes('*/*')) {
        return res.json({
          success: true,
          data: {
            id: item.id,
            name: item.name,
            type: item.type,
            content: item.content,
            file_size: item.file_size,
            mime_type: item.mime_type,
            tags: item.tags,
            created_at: item.created_at,
            updated_at: item.updated_at
          }
        });
      }
      
      // Return raw content with appropriate headers
      if (item.mime_type) {
        res.set('Content-Type', item.mime_type);
      } else {
        res.set('Content-Type', 'text/plain');
      }
      
      if (item.file_size) {
        res.set('Content-Length', item.file_size.toString());
      }
      
      res.set('Cache-Control', 'public, max-age=3600');
      return res.send(item.content);
    }
    
    // For folders, return folder contents
    if (item.type === 'folder') {
      const children = await DataHubModel.getPublicChildren(item.id);
      
      return res.json({
        success: true,
        data: {
          id: item.id,
          name: item.name,
          type: item.type,
          tags: item.tags,
          children: children.map(child => ({
            id: child.id,
            name: child.name,
            type: child.type,
            file_size: child.file_size,
            mime_type: child.mime_type,
            tags: child.tags,
            created_at: child.created_at,
            updated_at: child.updated_at,
            path: `${itemPath}/${child.name}`.replace(/^\/+/, '')
          })),
          created_at: item.created_at,
          updated_at: item.updated_at
        }
      });
    }

  } catch (error) {
    console.error('Error fetching public data:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch public data',
      error: error.message 
    });
  }
});

// Get public root items for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const items = await DataHubModel.getPublicRootItems(userId);
    
    res.json({
      success: true,
      data: items.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        file_size: item.file_size,
        mime_type: item.mime_type,
        tags: item.tags,
        created_at: item.created_at,
        updated_at: item.updated_at,
        path: item.name
      }))
    });
  } catch (error) {
    console.error('Error fetching public root items:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch public items',
      error: error.message 
    });
  }
});

export default router;
