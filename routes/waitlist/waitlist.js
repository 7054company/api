import express from 'express';
import { WaitlistModel } from '../../models/waitlist.model.js';
import { authenticateToken } from '../../auth.js';

const router = express.Router();

// Public route to view project details
router.get('/view/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Get project without authentication check
    const project = await WaitlistModel.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Return only public-safe data
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

// Get all active projects with signup counts
router.get('/list', async (req, res) => {
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
    
    // Verify project exists and belongs to user
    const project = await WaitlistModel.getProjectById(projectId);
    if (!project || project.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Project not found' });
    }


    
    // Get project signups
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

// Get project signups (protected)
router.get('/:projectId/signups', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Verify project exists and belongs to user
    const project = await WaitlistModel.getProjectById(projectId);
    if (!project || project.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const signups = await WaitlistModel.getProjectSignups(projectId);
    res.json({ signups });
  } catch (error) {
    console.error('Error fetching signups:', error);
    res.status(500).json({ message: 'Failed to fetch signups' });
  }
});

// Join waitlist route updated
router.post('/:projectId/join', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { email, referralCode } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if project exists
    const project = await WaitlistModel.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if already signed up
    const existingSignup = await WaitlistModel.getSignupByEmail(projectId, email);
    if (existingSignup) {
      return res.status(400).json({ message: 'Already signed up' });
    }

    // Create signup with optional referral code
    const { signupId, uniqueCode } = await WaitlistModel.createSignup({
      projectId,
      email,
      referralCode: referralCode || null // Explicitly pass null if referralCode is not provided
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
