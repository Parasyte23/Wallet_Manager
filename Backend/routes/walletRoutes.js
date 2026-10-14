// backend/routes/walletRoutes.js
const express = require('express');
const router = express.Router();
const { addMoney, sendMoney, getTransactions, getUser, withdrawMoney, getAnalytics } = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware'); // Import middleware

// Apply the protect middleware to all routes
router.post('/add', protect, addMoney);
router.post('/send', protect, sendMoney);
router.post('/withdraw', protect, withdrawMoney);
router.get('/transactions/:userId', protect, getTransactions);
router.get('/user/:userId', protect, getUser); 
router.get('/analytics/:userId', protect, getAnalytics);

module.exports = router;