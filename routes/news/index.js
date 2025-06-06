import express from 'express';
import axios from 'axios';

const router = express.Router();
const GEMINI_API_KEY = 'AIzaSyBK_GYb6nfjIZ8OlHT4xgguA5NeCSLqGmU'; // Your API key

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
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

    // Determine status from AI reply
    const replyLower = reply.toLowerCase();
    let status = 'not verified';

    if (replyLower.includes('true') || replyLower.includes('correct') || replyLower.includes('verified')) {
      status = 'verified';
    } else if (replyLower.includes('false') || replyLower.includes('fake') || replyLower.includes('incorrect')) {
      status = 'fake';
    } else if (replyLower.includes('unverified') || replyLower.includes('unknown') || replyLower.includes('cannot confirm')) {
      status = 'not verified';
    }

    res.json({ result: reply, status });

  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Error from Gemini API',
      detail: error.response?.data || error.message
    });
  }
});

export default router;
