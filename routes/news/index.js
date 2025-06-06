import express from 'express';
import axios from 'axios';

const router = express.Router();


const GEMINI_API_KEY = 'AIzaSyBK_GYb6nfjIZ8OlHT4xgguA5NeCSLqGmU';

router.post('/verify', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  try {
    const prompt = `
You are an AI fact checker. Given a statement from a user, search your latest knowledge and verify whether it is true, false, or unverified.
Explain briefly why. The user asked:
"${query}"
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer found.';
    res.json({ result: reply });

  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Error from Gemini API',
      detail: error.response?.data || error.message
    });
  }
});

export default router;
