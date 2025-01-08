import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export const WaitlistModel = {
  // Get user-specific projects
  async getUserProjects(userId) {
    const sql = `
      SELECT 
        p.*,
        COUNT(s.id) as signup_count
      FROM waitlist_projects p
      LEFT JOIN waitlist_signups s ON p.id = s.project_id
      WHERE p.status = 'active' AND p.user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    
    return await query(sql, [userId]);
  },

  // Get all public projects
  async getProjects() {
    const sql = `
      SELECT 
        p.*,
        COUNT(s.id) as signup_count
      FROM waitlist_projects p
      LEFT JOIN waitlist_signups s ON p.id = s.project_id
      WHERE p.status = 'active'
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    
    return await query(sql);
  },

  async createProject({ name, details, userId }) {
    const projectId = uuidv4();
    const sql = `
      INSERT INTO waitlist_projects (
        id, name, details, user_id, status, created_at
      ) VALUES (?, ?, ?, ?, 'active', NOW())
    `;
    
    await query(sql, [projectId, name, details, userId]);
    return projectId;
  },

  async getProjectById(id) {
    const sql = `
      SELECT * FROM waitlist_projects 
      WHERE id = ? AND status = 'active'
    `;
    
    const results = await query(sql, [id]);
    return results[0];
  },

  async createSignup({ projectId, email, referralCode }) {
    const signupId = uuidv4();
    const uniqueCode = uuidv4().split('-')[0];
    
    const sql = `
      INSERT INTO waitlist_signups (
        id, project_id, email, status,
        referral_code, referred_by, created_at
      ) VALUES (?, ?, ?, 'pending', ?, ?, NOW())
    `;
    
    await query(sql, [signupId, projectId, email, uniqueCode, referralCode || null]);
    return { signupId, uniqueCode };
  },

  async getProjectSignups(projectId) {
    const sql = `
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM waitlist_signups 
         WHERE referred_by = s.referral_code) as referral_count
      FROM waitlist_signups s
      WHERE s.project_id = ?
      ORDER BY s.created_at DESC
    `;
    
    return await query(sql, [projectId]);
  },

  async getSignupByEmail(projectId, email) {
    const sql = `
      SELECT * FROM waitlist_signups
      WHERE project_id = ? AND email = ?
    `;
    
    const results = await query(sql, [projectId, email]);
    return results[0];
  }
};
