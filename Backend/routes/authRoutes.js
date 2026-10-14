// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login, updateProfile } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.put('/update-profile', updateProfile); // New route

module.exports = router;