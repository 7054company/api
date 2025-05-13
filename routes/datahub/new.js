import express from 'express';
import { DataHubModel } from '../../models/d/new.model.js';

const router = express.Router();

// Create new data entry - no authentication required
router.post('/new', async (req, res) => {
  try {
    const { id, apiKey } = await DataHubModel.create(req.body);
    
    res.status(201).json({
      success: true,
      d: { 
        id,
        apiKey // Return the generated API key to the user
      }
    });
  } catch (error) {
    console.error('Error creating data:', error);
    res.status(500).json({ message: 'Failed to create data entry' });
  }
});

// Get data entry by ID - API key check if enabled
router.get('/x/:id', async (req, res) => {
  try {
    const data = await DataHubModel.getById(req.params.id);
    
    if (!data) {
      return res.status(404).json({ message: 'Data not found' });
    }

    // Check if API key is required
    if (data.requiresApiKey) {
      const apiKey = req.headers['x-api-key'];
      const config = JSON.parse(data.config || '{}');
      
      if (!apiKey || apiKey !== config.apikey) {
        return res.status(401).json({ message: 'Invalid or missing API key' });
      }
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ message: 'Failed to fetch data entry' });
  }
});

export default router;