import express from 'express';
import { authenticateToken } from '../auth.js';
import { UsageModel } from '../models/usage.model.js';

const router = express.Router();

// Get user balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const balance = await UsageModel.getBalance(req.user.id);
    
    if (!balance) {
      return res.json({
        balance: '0',
        value: '0',
        purchasePrice: '0',
        profit: '0',
        profitPercentage: '0'
      });
    }

    res.json({
      balance: balance.balance.toString(),
      value: balance.value.toFixed(2),
      purchasePrice: balance.purchase_price.toFixed(2),
      profit: balance.profit.toFixed(2),
      profitPercentage: balance.profit_percentage.toFixed(2)
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ message: 'Error retrieving balance data' });
  }
});

// Update balance
router.post('/balance', authenticateToken, async (req, res) => {
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
});

export default router;
