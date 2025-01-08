import express from 'express';
import { WaitlistModel } from '../../models/waitlist.model.js';
import { authenticateToken } from '../../auth.js';

const router = express.Router();

// Public route to view project details
router.get('/view/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await WaitlistModel.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const publicProjectData = {
      id: project.id,
      name: project.name,
      details: project.details,
      status: project.status,
      created_at: project.created_at
    };

    res.json({ project: publicProjectData });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Failed to fetch project' });
  }
});

// Get all active projects with signup counts for specific user
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const projects = await WaitlistModel.getUserProjects(userId);
    res.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// Get all public active projects with signup counts
router.get('/list-all', async (req, res) => {
  try {
    const projects = await WaitlistModel.getProjects();
    res.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// Get single project details
router.get('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const project = await WaitlistModel.getProjectById(projectId);
    if (!project || project.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const signups = await WaitlistModel.getProjectSignups(projectId);

    res.json({ 
      project: {
        ...project,
        signups
      }
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Failed to fetch project details' });
  }
});

// Create new project (protected)
router.post('/new', authenticateToken, async (req, res) => {
  try {
    const { name, details } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    const projectId = await WaitlistModel.createProject({
      name,
      details,
      userId: req.user.id
    });

    res.status(201).json({
      message: 'Project created successfully',
      projectId
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Failed to create project' });
  }
});

// Join waitlist route
router.post('/:projectId/join', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { email, referralCode } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const project = await WaitlistModel.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const existingSignup = await WaitlistModel.getSignupByEmail(projectId, email);
    if (existingSignup) {
      return res.status(400).json({ message: 'Already signed up' });
    }

    const { signupId, uniqueCode } = await WaitlistModel.createSignup({
      projectId,
      email,
      referralCode: referralCode || null
    });

    res.status(201).json({
      message: 'Successfully joined waitlist',
      signupId,
      referralCode: uniqueCode
    });
  } catch (error) {
    console.error('Error joining waitlist:', error);
    res.status(500).json({ message: 'Failed to join waitlist' });
  }
});

export default router;
