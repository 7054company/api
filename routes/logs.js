import { Router } from 'express';
import https from 'https';

const router = Router();

// Get agent logs
  const { uid } = req.params;
  const url = `https://hello-world-virid-chi.vercel.app/query/raw/${uid}`;

  https.get(url, (response) => {
    let data = '';

    // Collect data chunks
    response.on('data', (chunk) => {
      data += chunk;
    });

    // Process the complete response
    response.on('end', () => {
      try {
        const logEntries = [];
        const logPattern = /\[([^\]]+)\]\s([^\[]+)/g; // Match [timestamp] message

        let match;
        while ((match = logPattern.exec(data)) !== null) {
          logEntries.push(`[${match[1]}] ${match[2].trim()}`);
        }

        if (logEntries.length === 0) {
          return res.status(404).send('No logs found for the provided UID.');
        }

        // Join logs with newlines
        const formattedLogs = logEntries.join('\n');
        res.type('text/plain').send(formattedLogs); // Respond with plain text
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
