import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';

const router = Router();

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

// Get all agents
router.get('/', (req, res) => {
  res.json(agents);
});

// Get single agent
router.get('/:id', (req, res) => {
  const agent = agents.find(a => a.id === req.params.id);
  if (!agent) {
    return res.status(404).json({ message: 'Agent not found' });
  }
  res.json(agent);
});

// Create new agent
router.post('/', (req, res) => {
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
router.put('/:id', (req, res) => {
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
router.delete('/:id', (req, res) => {
  const index = agents.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Agent not found' });
  }
  
  agents = agents.filter(a => a.id !== req.params.id);
  res.status(204).send();
});

// Get agent logs
router.get('/log/:uid', (req, res) => {
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
