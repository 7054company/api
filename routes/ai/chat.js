import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const router = express.Router();
const COHERE_API_KEY = "NUzj39m93BClXV1CKw9naU1Nw7clnNhrwgAKFEq2";
const COHERE_API_URL = "https://api.cohere.ai/v1/generate";

// In-memory storage for chat messages
let chatHistory = [];

// Get chat history
router.get('/history', (req, res) => {
  try {
    res.json(chatHistory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve chat history' });
  }
});

// Send a message
router.post('/', async (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Store user message
    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    chatHistory.push(userMessage);

    // Call Cohere API
    const response = await axios.post(COHERE_API_URL, {
      prompt: message,
      model: 'command',
      max_tokens: 300,
      temperature: 0.7,
      k: 0,
      stop_sequences: [],
      return_likelihoods: 'NONE'
    }, {
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json',
        'Cohere-Version': '2022-12-06'
      }
    });

    // Create AI response
    const aiResponse = {
      id: uuidv4(),
      role: 'assistant',
      content: response.data.generations[0].text.trim(),
      timestamp: new Date().toISOString()
    };
    
    chatHistory.push(aiResponse);
    res.json(aiResponse);
  } catch (error) {
    console.error('Cohere API Error:', error.response?.data || error.message);
    
    // Remove the failed message from history
    chatHistory = chatHistory.slice(0, -1);
    
    res.status(500).json({ 
      error: 'Failed to generate response',
      details: error.response?.data?.message || error.message 
    });
  }
});

// Clear chat history
router.delete('/history', (req, res) => {
  try {
    chatHistory = [];
    res.status(200).json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

export default router;