import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// File path for storing agents data
const dataFilePath = path.resolve('data', 'agents.json');

// Ensure the data directory exists
if (!fs.existsSync('data')) {
  fs.mkdirSync('data');
}

// Load agents data from file
const loadAgents = () => {
  try {
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading agents data:', error);
  }
  return [];
};

// Save agents data to file
const saveAgents = (data) => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving agents data:', error);
  }
};

// Initialize agents data
let agents = loadAgents();

// API Routes
const router = express.Router();

// Recursively list all files and directories
const listDirectoryContents = (dirPath) => {
  const filesAndDirs = fs.readdirSync(dirPath, { withFileTypes: true });
  return filesAndDirs.map((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return {
        type: 'directory',
        name: entry.name,
        contents: listDirectoryContents(fullPath),
      };
    }
    return {
      type: 'file',
      name: entry.name,
      path: fullPath,
    };
  });
};

// Admin route to show directory structure
router.get('/admin/show', (req, res) => {
  const rootDir = path.resolve('.'); // Start from the current directory
  try {
    const structure = listDirectoryContents(rootDir);
    res.json({ root: rootDir, structure });
  } catch (error) {
    res.status(500).json({ error: 'Unable to read directory structure', details: error.message });
  }
});

// Get all agents
router.get('/agents', (req, res) => {
  res.json(agents);
});

// Get single agent
router.get('/agents/:id', (req, res) => {
  const agent = agents.find((a) => a.id === req.params.id);
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
  saveAgents(agents); // Save to file
  res.status(201).json(newAgent);
});

// Update agent
router.put('/agents/:id', (req, res) => {
  const index = agents.findIndex((a) => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Agent not found' });
  }

  agents[index] = {
    ...agents[index],
    ...req.body,
    lastActive: 'Just now',
  };

  saveAgents(agents); // Save to file
  res.json(agents[index]);
});

// Delete agent
router.delete('/agents/:id', (req, res) => {
  const index = agents.findIndex((a) => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Agent not found' });
  }

  agents = agents.filter((a) => a.id !== req.params.id);
  saveAgents(agents); // Save to file
  res.status(204).send();
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
