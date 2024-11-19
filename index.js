// Query raw data by UID and format the response
router.get('/log/agent/:uid', (req, res) => {
  const { uid } = req.params;
  const url = `https://hello-world-virid-chi.vercel.app/query/raw/${uid}`;

  https.get(url, (response) => {
    let data = '';

    // A chunk of data has been received.
    response.on('data', (chunk) => {
      data += chunk;
    });

    // The whole response has been received.
    response.on('end', () => {
      try {
        // Raw logs are like: [timestamp] message [timestamp] message...
        const logEntries = [];
        const logPattern = /\[([^\]]+)\]\s([^\[]+)/g; // Regex to match [timestamp] log message

        let match;
        // Use regex to extract the timestamp and message pairs
        while ((match = logPattern.exec(data)) !== null) {
          logEntries.push({
            timestamp: match[1],  // The timestamp part
            message: match[2].trim(), // The log message part
          });
        }

        // Now send the structured logs as a JSON response
        // We will format it as a string like: [timestamp] message
        const formattedLogs = logEntries.map(entry => `[${entry.timestamp}] ${entry.message}`).join('\n');

        res.send(formattedLogs); // Send it as plain text, formatted as desired
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
