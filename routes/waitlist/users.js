import { Router } from 'express';
import { authenticateToken } from '../../auth.js';
import { WaitlistUserModel } from '../../models/waitlist.user.model.js';
import { WaitlistModel } from '../../models/waitlist.model.js';
import { WaitlistFormModel } from '../../models/waitlist.userform.model.js';

const router = Router();

// Get all forms for a project
router.get('/:projectId/forms', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Verify project exists and belongs to user
    const project = await WaitlistModel.getProjectById(projectId);
    if (!project || project.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get forms
    const forms = await WaitlistFormModel.getForms(projectId);
    res.json({ forms });
  } catch (error) {
    console.error('Error fetching forms:', error);
    res.status(500).json({ message: 'Failed to fetch forms' });
  }
});

// Update forms for a project
router.post('/:projectId/forms', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const formData = req.body;
    
    // Verify project exists and belongs to user
    const project = await WaitlistModel.getProjectById(projectId);
    if (!project || project.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Update forms
    const updatedForms = await WaitlistFormModel.updateForms(projectId, formData);
    res.json({ 
      message: 'Forms updated successfully',
      forms: updatedForms
    });
  } catch (error) {
    console.error('Error updating forms:', error);
    res.status(500).json({ message: 'Failed to update forms' });
  }
});

// Existing routes...
export default router;
