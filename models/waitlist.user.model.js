import { query } from '../config/database.js';

export const WaitlistUserModel = {
  async getUsersByProjectId(projectId) {
    const sql = `
      SELECT 
        id,
        project_id,
        email,
        status,
        referral_code,
        referred_by,
        created_at,
        (
          SELECT COUNT(*) 
          FROM waitlist_signups ws2 
          WHERE ws2.referred_by = waitlist_signups.referral_code
        ) as referral_count
      FROM waitlist_signups
      WHERE project_id = ?
      ORDER BY created_at DESC
    `;

    try {
      const users = await query(sql, [projectId]);
      return users;
    } catch (error) {
      console.error('Database Error:', error);
      throw new Error('Failed to fetch waitlist users');
    }
  },

  async getUserById(signupId) {
    const sql = `
      SELECT 
        id,
        project_id,
        email,
        status,
        referral_code,
        referred_by,
        created_at
      FROM waitlist_signups
      WHERE id = ?
    `;

    try {
      const results = await query(sql, [signupId]);
      return results[0] || null;
    } catch (error) {
      console.error('Database Error:', error);
      throw new Error('Failed to fetch waitlist user');
    }
  }
};
