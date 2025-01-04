import express from 'express';
import { WaitlistModel } from '../../models/waitlist.model.js';
import { authenticateToken } from '../../auth.js';

const router = express.Router();

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

// Create new project
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

// Get project signups
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

export default router;
