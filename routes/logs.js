import { Router } from 'express';
import https from 'https';

const router = Router();

// Get agent logs
router.get('/agent/:uid', (req, res) => {
  const { uid } = req.params;
  const url = `https://hello-world-virid-chi.vercel.app/query/raw/${uid}`;

  https.get(url, (response) => {
    let data = '';

    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      try {
        const logEntries = [];
        const logPattern = /\[([^\]]+)\]\s([^\[]+)/g;

        let match;
        while ((match = logPattern.exec(data)) !== null) {
          logEntries.push({
            timestamp: match[1],
            message: match[2].trim()
          });
        }

        if (logEntries.length === 0) {
          return res.status(404).json({ 
            success: false,
            message: 'No logs found for the provided agent ID.'
          });
        }

        res.json({
          success: true,
          data: logEntries
        });
      } catch (error) {
        console.error('Error processing log data:', error.message);
        res.status(500).json({ 
          success: false, 
          message: 'Error processing log data',
          error: error.message 
        });
      }
    });
  }).on('error', (error) => {
    console.error('Error fetching logs:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching logs',
      error: error.message 
    });
  });
});

export default router;
