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
          logEntries.push(`[${match[1]}] ${match[2].trim()}`);
        }

        if (logEntries.length === 0) {
          return res.status(404).send('No logs found for the provided UID.');
        }

        const formattedLogs = logEntries.join('\n');
        res.type('text/plain').send(formattedLogs);
      } catch (error) {
        console.error('Error processing log data:', error.message);
        res.status(500).json({ message: 'Error processing log data', error: error.message });
      }
    });
  }).on('error', (error) => {
    console.error('Error fetching data:', error.message);
    res.status(500).json({ message: 'Error fetching data', error: error.message });
  });
});

export default router;
