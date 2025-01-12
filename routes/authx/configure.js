import express from 'express';
import { authenticateToken } from '../../../auth.js';
import { AuthXConfigureModel } from '../../../models/authx/app.configure.model.js';

const router = express.Router();

// Get configuration for an app
router.get('/:appId', authenticateToken, async (req, res) => {
  try {
    const config = await AuthXConfigureModel.getByAppId(req.params.appId);
    
    if (!config) {
      return res.status(404).json({ message: 'Configuration not found' });
    }

    res.json({ config });
  } catch (error) {
    console.error('Error fetching configuration:', error);
    res.status(500).json({ message: 'Failed to fetch configuration' });
  }
});

// Update configuration
router.put('/:appId', authenticateToken, async (req, res) => {
  try {
    const { appId } = req.params;
    const updates = req.body;

    const config = await AuthXConfigureModel.update(appId, updates);
    
    res.json({
      message: 'Configuration updated successfully',
      config
    });
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({ message: 'Failed to update configuration' });
  }
});

// Reset configuration to defaults
router.post('/:appId/reset', authenticateToken, async (req, res) => {
  try {
    const { appId } = req.params;
    const config = await AuthXConfigureModel.reset(appId);
    
    res.json({
      message: 'Configuration reset to defaults',
      config
    });
  } catch (error) {
    console.error('Error resetting configuration:', error);
    res.status(500).json({ message: 'Failed to reset configuration' });
  }
});

export default router;
