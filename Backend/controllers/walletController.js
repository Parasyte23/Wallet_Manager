const mongoose = require('mongoose');
const User = require('../models/user');
const Transaction = require('../models/transaction');

// @desc    Add money to user wallet
// @route   POST /api/wallet/add
exports.addMoney = async (req, res) => {
    try {
        const { userId, amount, method , category } = req.body;

        if (amount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than zero' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.balance += amount;
        await user.save();

        const transaction = await Transaction.create({
            user: user._id,
            type: 'credit',
            category: category || 'deposit',
            title: 'Wallet Deposit',
            description: method ? `Added via ${method}` : 'Direct Deposit',
            amount: amount,
            status: 'Completed'
        });

        res.status(200).json({
            success: true,
            balance: user.balance,
            transaction
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during deposit' });
    }
};

// @desc    Transfer money to another user
// @route   POST /api/wallet/send
exports.sendMoney = async (req, res) => {
    // Start a Mongoose session for an ACID transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { senderId, receiverEmail, amount, description, category } = req.body;

        if (amount <= 0) {
            throw new Error('Transfer amount must be greater than zero');
        }

        // Find sender and receiver within the session
        const sender = await User.findById(senderId).session(session);
        const receiver = await User.findOne({ email: receiverEmail }).session(session);

        if (!sender) throw new Error('Sender account not found');
        if (!receiver) throw new Error('Receiver account not found');
        
        if (sender.email === receiver.email) {
            throw new Error('Cannot transfer money to yourself');
        }

        if (sender.balance < amount) {
            throw new Error('Insufficient wallet balance');
        }

        // 1. Update balances
        sender.balance -= amount;
        receiver.balance += amount;

        await sender.save({ session });
        await receiver.save({ session });

        // 2. Create Sender's Debit Transaction
        await Transaction.create([{
            user: sender._id,
            type: 'debit',
            category: category || 'transfer',
            title: 'Money Sent',
            description: description || `To ${receiver.name}`,
            amount: amount,
            referenceUser: receiver._id,
            status: 'Completed'
        }], { session });

        // 3. Create Receiver's Credit Transaction
        await Transaction.create([{
            user: receiver._id,
            type: 'credit',
            category: category || 'transfer',
            title: 'Money Received',
            description: description || `From ${sender.name}`,
            amount: amount,
            referenceUser: sender._id,
            status: 'Completed'
        }], { session });

        // NEW: Instantly push notification to the receiver if they are online
        if(req.io) {
            req.io.to(receiver._id.toString()).emit('moneyReceived' , {
                amount : amount,
                senderName : sender.name
            });
        }

        // If everything above succeeds, commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: 'Transfer successful',
            balance: sender.balance
        });
    } catch (error) {
        // If anything fails, abort the transaction so no partial updates occur
        await session.abortTransaction();
        session.endSession();
        
        console.error(error);
        res.status(400).json({ error: error.message || 'Transfer failed' });
    }
};

// @desc    Get user transactions
// @route   GET /api/wallet/transactions/:userId
exports.getTransactions = async (req, res) => {
    try {
        // Notice we extract type, category, and search from the URL now
        const { limit = 1000, type, category, search } = req.query; 
        
        let query = { user: req.params.userId };

        // Apply filters if they exist
        if (type && type !== 'all') query.type = type;
        if (category && category !== 'all') {
                // The 'i' makes it case-insensitive, so "Shopping" matches "shopping"
                query.category = { $regex: new RegExp(`^${category}$`, 'i') };
        }
        if (search) {
            // Searches for the text inside the transaction title or description
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit)); // Forces the limit, overriding the 4 from the dashboard

        const totalCount = await Transaction.countDocuments(query);

        res.status(200).json({ success: true, count: totalCount, data: transactions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

// @desc    Get user profile & balance
// @route   GET /api/wallet/user/:userId
exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        res.status(200).json({ 
            success: true, 
            balance: user.balance, 
            name: user.name 
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching user' });
    }
};

// @desc    Withdraw money from wallet
// @route   POST /api/wallet/withdraw
exports.withdrawMoney = async (req, res) => {
    try {
        const { userId, amount, destination, category } = req.body;

        if (amount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than zero' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.balance < amount) {
            return res.status(400).json({ error: 'Insufficient wallet balance' });
        }

        // Deduct balance
        user.balance -= amount;
        await user.save();

        // Record the transaction
        const transaction = await Transaction.create({
            user: user._id,
            type: 'debit',
            category: category || 'withdrawal',
            title: 'Wallet Withdrawal',
            description: destination || 'To Bank Account',
            amount: amount,
            status: 'Completed'
        });

        res.status(200).json({
            success: true,
            balance: user.balance,
            transaction
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during withdrawal' });
    }
};

// @desc    Get wallet analytics
// @route   GET /api/wallet/analytics/:userId
exports.getAnalytics = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.params.userId);

        // 1. Calculate Total Income vs Total Expenses
        const typeStats = await Transaction.aggregate([
            { $match: { user: userId, status: 'Completed' } },
            { $group: { _id: '$type', total: { $sum: '$amount' } } }
        ]);

        // 2. Calculate Spending by Category (Only Debits)
        const categoryStats = await Transaction.aggregate([
            { $match: { user: userId, type: 'debit', status: 'Completed' } },
            { $group: { _id: '$category', total: { $sum: '$amount' } } },
            { $sort: { total: -1 } } // Sort highest spending first
        ]);

        res.status(200).json({ 
            success: true, 
            typeStats, 
            categoryStats 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching analytics' });
    }
};

