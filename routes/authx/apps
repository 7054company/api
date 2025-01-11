import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthXAppModel } from '../../models/authx/app.model.js';
import { authenticateToken } from '../../auth.js';

const router = express.Router();

// Get all apps for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const apps = await AuthXAppModel.getByUserId(req.user.id);
    res.json({ apps });
  } catch (error) {
    console.error('Error fetching apps:', error);
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
});

// Get single app
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const app = await AuthXAppModel.getById(req.params.id);
    
    if (!app) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (app.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ app });
  } catch (error) {
    console.error('Error fetching app:', error);
    res.status(500).json({ message: 'Failed to fetch application' });
  }
});

// Create new app
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, type, domain, configure } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required' });
    }

    const secretKey = uuidv4();
    const appId = await AuthXAppModel.create({
      userId: req.user.id,
      name,
      type,
      domain: domain || null,
      configure: configure || null,
      secretKey
    });

    const app = await AuthXAppModel.getById(appId);
    res.status(201).json({ 
      message: 'Application created successfully',
      app 
    });
  } catch (error) {
    console.error('Error creating app:', error);
    res.status(500).json({ message: 'Failed to create application' });
  }
});

// Update app
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const app = await AuthXAppModel.getById(req.params.id);
    
    if (!app) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (app.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updated = await AuthXAppModel.update(req.params.id, req.body);
    if (!updated) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const updatedApp = await AuthXAppModel.getById(req.params.id);
    res.json({
      message: 'Application updated successfully',
      app: updatedApp
    });
  } catch (error) {
    console.error('Error updating app:', error);
    res.status(500).json({ message: 'Failed to update application' });
  }
});

// Delete app
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const app = await AuthXAppModel.getById(req.params.id);
    
    if (!app) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (app.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await AuthXAppModel.delete(req.params.id);
    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Error deleting app:', error);
    res.status(500).json({ message: 'Failed to delete application' });
  }
});

export default router;
