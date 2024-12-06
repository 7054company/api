import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// In-memory storage for design requests
let designHistory = [];

// Get design history
router.get('/history', (req, res) => {
  try {
    res.json(designHistory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve design history' });
  }
});

// Get specific design
router.get('/:id', (req, res) => {
  try {
    const design = designHistory.find(d => d.id === req.params.id);
    if (!design) {
      return res.status(404).json({ error: 'Design not found' });
    }
    res.json(design);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve design' });
  }
});

// Create new design request
router.post('/', (req, res) => {
  try {
    const { prompt, style, elements } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const design = {
      id: uuidv4(),
      prompt,
      style: style || 'default',
      elements: elements || [],
      status: 'completed',
      result: `https://source.unsplash.com/random/800x600?${encodeURIComponent(prompt)}`,
      timestamp: new Date().toISOString()
    };
    
    designHistory.unshift(design);
    res.status(201).json(design);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create design' });
  }
});

// Clear design history
router.delete('/history', (req, res) => {
  try {
    designHistory = [];
    res.status(200).json({ message: 'Design history cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear design history' });
  }
});

export default router;