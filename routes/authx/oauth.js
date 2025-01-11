import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthXAppModel } from '../../models/authx/app.model.js';
import { authenticateToken } from '../../auth.js';

const router = express.Router();

// Get OAuth configuration for an app
router.get('/config/:appId', authenticateToken, async (req, res) => {
  try {
    const app = await AuthXAppModel.getById(req.params.appId);
    
    if (!app) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (app.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ 
      clientId: app.id,
      clientSecret: app.secret_key,
      redirectUris: app.configure?.redirectUris || [],
      allowedScopes: app.configure?.allowedScopes || ['profile', 'email']
    });
  } catch (error) {
    console.error('Error fetching OAuth config:', error);
    res.status(500).json({ message: 'Failed to fetch OAuth configuration' });
  }
});

// Update OAuth configuration
router.put('/config/:appId', authenticateToken, async (req, res) => {
  try {
    const app = await AuthXAppModel.getById(req.params.appId);
    
    if (!app) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (app.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { redirectUris, allowedScopes } = req.body;
    
    const configure = {
      ...app.configure,
      redirectUris: redirectUris || app.configure?.redirectUris || [],
      allowedScopes: allowedScopes || app.configure?.allowedScopes || ['profile', 'email']
    };

    await AuthXAppModel.update(req.params.appId, { configure });

    res.json({ 
      message: 'OAuth configuration updated successfully',
      config: configure
    });
  } catch (error) {
    console.error('Error updating OAuth config:', error);
    res.status(500).json({ message: 'Failed to update OAuth configuration' });
  }
});

// Generate new client secret
router.post('/secret/:appId', authenticateToken, async (req, res) => {
  try {
    const app = await AuthXAppModel.getById(req.params.appId);
    
    if (!app) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (app.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const newSecret = uuidv4();
    await AuthXAppModel.update(req.params.appId, { secret_key: newSecret });

    res.json({ 
      message: 'Client secret regenerated successfully',
      clientSecret: newSecret
    });
  } catch (error) {
    console.error('Error regenerating client secret:', error);
    res.status(500).json({ message: 'Failed to regenerate client secret' });
  }
});

export default router;