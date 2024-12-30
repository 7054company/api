import express from 'express';
import { authenticateToken } from '../../auth.js';
import { UsageModel } from '../../models/usage.model.js';

const router = express.Router();

// Balance controller functions
const balanceController = {
  async getBalance(req, res) {
    try {
      const balance = await UsageModel.getBalance(req.user.id);
      
      if (!balance) {
        return res.json({
          balance: "0",
          value: "0",
          purchasePrice: "0",
          profit: "0",
          profitPercentage: "0"
        });
      }

      // Convert string values to numbers before formatting
      const numBalance = parseFloat(balance.balance) || 0;
      const numValue = parseFloat(balance.value) || 0;
      const numPurchasePrice = parseFloat(balance.purchase_price) || 0;
      const numProfit = parseFloat(balance.profit) || 0;
      const numProfitPercentage = parseFloat(balance.profit_percentage) || 0;

      res.json({
        balance: numBalance.toFixed(8),
        value: numValue.toFixed(2),
        purchasePrice: numPurchasePrice.toFixed(2),
        profit: numProfit.toFixed(2),
        profitPercentage: numProfitPercentage.toFixed(2)
      });
    } catch (error) {
      console.error('Error fetching balance:', error);
      res.status(500).json({ message: 'Error retrieving balance data' });
    }
  },

  async updateBalance(req, res) {
    try {
      const { amount, type } = req.body;

      if (!amount || !type || !['credit', 'debit'].includes(type)) {
        return res.status(400).json({ message: 'Invalid transaction data' });
      }

      const finalAmount = type === 'credit' ? amount : -amount;
      
      await UsageModel.updateBalance(req.user.id, finalAmount);
      await UsageModel.recordTransaction(req.user.id, type, amount);

      const newBalance = await UsageModel.getBalance(req.user.id);
      
      res.json({
        message: 'Balance updated successfully',
        balance: newBalance
      });
    } catch (error) {
      console.error('Error updating balance:', error);
      res.status(500).json({ message: 'Error updating balance' });
    }
  }
};

// Balance routes - mounted at /api/balance
router.get('/balance', authenticateToken, balanceController.getBalance);
router.post('/balance', authenticateToken, balanceController.updateBalance);

export default router;
