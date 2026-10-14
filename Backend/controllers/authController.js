// backend/controllers/authController.js
const User = require('../models/user');
const jwt = require('jsonwebtoken');

// Helper function to generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secretkey123', {
        expiresIn: '30d',
    });
};

// Helper function to generate a random Wallet ID
const generateWalletId = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const year = new Date().getFullYear();
    return `MW-${randomNum}-${year}`;
};

// @desc    Register a new user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const user = await User.create({
            name,
            email,
            password,
            walletId: generateWalletId()
        });

        res.status(201).json({
            success: true,
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error("REGISTRATION ERROR:", error); // <-- Add this line
        res.status(500).json({ error: 'Server error during registration' });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {

            res.status(200).json({
                success: true,
                _id: user._id,
                name: user.name,
                email: user.email,
                walletId: user.walletId,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error during login' });
    }
};

// Update user profile settings
exports.updateProfile = async (req, res) => {
    try {
        const { userId, newName } = req.body;
        
        if (!newName || newName.trim().length === 0) {
            return res.status(400).json({ error: 'Name cannot be empty' });
        }

        const user = await User.findByIdAndUpdate(
            userId, 
            { name: newName }, 
            { returnDocument: 'after' }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ 
            success: true, 
            message: 'Profile updated successfully',
            user: { name: user.name, email: user.email }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error updating profile' });
    }
};