import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export const WaitlistFormModel = {
  // Get all forms for a project
  async getForms(projectId) {
    const sql = `
      SELECT 
        signup_form,
        verification_form,
        referral_form
      FROM waitlist_projects 
      WHERE id = ?
    `;
    
    try {
      const results = await query(sql, [projectId]);
      return results[0] || null;
    } catch (error) {
      console.error('Database Error:', error);
      throw new Error('Failed to fetch forms');
    }
  },

  // Update forms for a project
  async updateForms(projectId, formData) {
    const { signup_form, verification_form, referral_form } = formData;
    
    const sql = `
      UPDATE waitlist_projects 
      SET 
        signup_form = ?,
        verification_form = ?,
        referral_form = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    try {
      await query(sql, [
        signup_form ? JSON.stringify(signup_form) : null,
        verification_form ? JSON.stringify(verification_form) : null,
        referral_form ? JSON.stringify(referral_form) : null,
        projectId
      ]);
      
      return await this.getForms(projectId);
    } catch (error) {
      console.error('Database Error:', error);
      throw new Error('Failed to update forms');
    }
  }
};
