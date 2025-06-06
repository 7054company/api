require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const GEMINI_API_KEY = AIzaSyBK_GYb6nfjIZ8OlHT4xgguA5NeCSLqGmUY;

app.post('/verify', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  try {
    const prompt = `
You are an AI fact checker. Given a statement from a user, search your latest knowledge and verify whether it is true, false, or unverified.
Explain briefly why. The user asked:
"${query}"
`;

    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + GEMINI_API_KEY,
      {
        contents: [
          {
            parts: [{ text: prompt }],
            role: "user"
          }
        ]
      }
    );

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer found.';
    res.json({ result: reply });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Error from Gemini API', detail: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Gemini News Verifier running on http://localhost:${PORT}`));
