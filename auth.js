import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_FILE = join(__dirname, 'data', 'users.json');

// In-memory database
let usersCache = new Map();

// File handling utilities
const initDataFile = async () => {
  try {
    await fs.access(DATA_FILE);
    // Load initial data into memory
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const users = JSON.parse(data).users;
    usersCache.clear();
    users.forEach(user => usersCache.set(user.id, user));
  } catch {
    const dataDir = join(__dirname, 'data');
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
    await fs.writeFile(DATA_FILE, JSON.stringify({ users: [] }));
  }
};

const getUsers = async () => {
  await initDataFile();
  return Array.from(usersCache.values());
};

const saveUsers = async (users) => {
  // Update both cache and file
  usersCache.clear();
  users.forEach(user => usersCache.set(user.id, user));
  await fs.writeFile(DATA_FILE, JSON.stringify({ users }, null, 2));
};

// IP handling utilities
const getClientIp = (req) => {
  return req.ip || 
         req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         'unknown';
};

const updateIpHistory = (user, ip) => {
  if (!user.ipHistory) {
    user.ipHistory = [];
  }
  
  user.ipHistory = user.ipHistory.filter(entry => entry.ip !== ip);
  
  user.ipHistory.unshift({
    ip,
    timestamp: new Date().toISOString()
  });
  
  user.ipHistory = user.ipHistory.slice(0, 5);
  
  return user;
};

// Authentication middleware
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Register route
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const clientIp = getClientIp(req);

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check cache first
    const existingUser = Array.from(usersCache.values()).find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      ipHistory: [{
        ip: clientIp,
        timestamp: new Date().toISOString()
      }]
    };

    // Update both cache and file
    usersCache.set(newUser.id, newUser);
    const users = await getUsers();
    users.push(newUser);
    await saveUsers(users);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        ipHistory: newUser.ipHistory
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIp = getClientIp(req);

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check cache first
    const user = Array.from(usersCache.values()).find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update IP history
    const updatedUser = updateIpHistory(user, clientIp);
    usersCache.set(user.id, updatedUser);

    // Update file storage
    const users = await getUsers();
    const userIndex = users.findIndex(u => u.id === user.id);
    users[userIndex] = updatedUser;
    await saveUsers(users);

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        ipHistory: user.ipHistory
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Get current user route
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Authentication token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check cache first
    const user = usersCache.get(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        ipHistory: user.ipHistory
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Error fetching user data' });
  }
});

// Initialize the cache when the module loads
initDataFile().catch(console.error);

export default router;
