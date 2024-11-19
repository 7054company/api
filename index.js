import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// In-memory database
let agents = [
  {
    id: '1',
    name: 'Data Analyzer',
    type: 'Analyzer',
    status: 'active',
    lastActive: '2 minutes ago',
    description: 'Analyzes complex data sets and generates insights',
    capabilities: ['Data Processing', 'Pattern Recognition', 'Report Generation'],
    apiKey: uuidv4(),
    created: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Task Assistant',
    type: 'Assistant',
    status: 'active',
    lastActive: '1 hour ago',
    description: 'Helps with daily tasks and scheduling',
    capabilities: ['Task Management', 'Calendar Integration', 'Reminders'],
    apiKey: uuidv4(),
    created: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Performance Tracker',
    type: 'Tracker',
    status: 'active',
    lastActive: 'Just now',
    description: 'Monitors and tracks system performance metrics',
    capabilities: ['Metric Collection', 'Performance Analysis', 'Alert Generation'],
    apiKey: uuidv4(),
    created: new Date().toISOString(),
  },
];

// API Routes
const router = express.Router();

// Get all agents
router.get('/agents', (req, res) => {
  res.json(agents);
});

// Get single agent
router.get('/agents/:id', (req, res) => {
  const agent = agents.find(a => a.id === req.params.id);
  if (!agent) {
    return res.status(404).json({ message: 'Agent not found' });
  }
  res.json(agent);
});

// Create new agent
router.post('/agents', (req, res) => {
  const newAgent = {
    id: uuidv4(),
    ...req.body,
    apiKey: uuidv4(),
    created: new Date().toISOString(),
    lastActive: 'Just now',
    status: 'active',
  };
  agents.push(newAgent);
  res.status(201).json(newAgent);
});

// Update agent
router.put('/agents/:id', (req, res) => {
  const index = agents.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Agent not found' });
  }
  
  agents[index] = {
    ...agents[index],
    ...req.body,
    lastActive: 'Just now',
  };
  
  res.json(agents[index]);
});

// Delete agent
router.delete('/agents/:id', (req, res) => {
  const index = agents.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Agent not found' });
  }
  
  agents = agents.filter(a => a.id !== req.params.id);
  res.status(204).send();
});

import https from 'https';

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
        // Split the raw response by new lines and map each log entry to the formatted output
        const logEntries = data.split('\n').map(log => {
          // Match timestamp pattern in the format [YYYY-MM-DDTHH:MM:SSZ]
          const timestampMatch = log.match(/\[(.*?)\]/);
          if (timestampMatch) {
            const timestamp = timestampMatch[1];
            const logMessage = log.replace(timestampMatch[0], '').trim(); // Get log message after timestamp
            return { timestamp, message: logMessage };
          }
          return null; // In case no timestamp found, ignore that log entry
        }).filter(entry => entry !== null); // Remove any null entries

        // Create the final formatted response
        const formattedResponse = logEntries.map(entry => {
          return `[${entry.timestamp}] ${entry.message}`;
        }).join('\n');

        // Send the formatted log data back as the response
        res.send(formattedResponse);

      } catch (error) {
        console.error('Error processing response:', error.message);
        res.status(500).json({ message: 'Error processing response', error: error.message });
      }
    });
  }).on('error', (error) => {
    console.error('Error fetching data:', error.message);
    res.status(500).json({ message: 'Error fetching data', error: error.message });
  });
});



// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Use the router with /api prefix
app.use('/api', router);

app.listen(port, () => {
  console.log(`Agent API server running on port ${port}`);
});
