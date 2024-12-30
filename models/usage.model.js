import { query } from '../config/database.js';

export const UsageModel = {
  async getBalance(userId) {
    const sql = `
      SELECT 
        balance,
        purchase_price,
        (balance * current_price) as value,
        ((balance * current_price) - (balance * purchase_price)) as profit,
        (((balance * current_price) - (balance * purchase_price)) / (balance * purchase_price) * 100) as profit_percentage
      FROM user_balances
      WHERE user_id = ?
    `;
    
    const results = await query(sql, [userId]);
    return results[0] || null;
  },

  async updateBalance(userId, amount) {
    const sql = `
      INSERT INTO user_balances (user_id, balance, purchase_price, current_price, updated_at)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        balance = balance + ?,
        updated_at = NOW()
    `;
    
    await query(sql, [userId, amount, 10.00, 10.00, amount]);
  },

  async recordTransaction(userId, type, amount) {
    const sql = `
      INSERT INTO balance_history (
        user_id,
        transaction_type,
        amount,
        created_at
      ) VALUES (?, ?, ?, NOW())
    `;
    
    await query(sql, [userId, type, amount]);
  }
};

export default UsageModel;
