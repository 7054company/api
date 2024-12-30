import express from 'express';
import balanceRoutes from './balance.routes.js';

const router = express.Router();

router.use('/balance', balanceRoutes);

export default router;
