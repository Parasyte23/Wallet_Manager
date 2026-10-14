const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true // Indexed for faster querying of a specific user's transactions
        },
        type: {
            type: String,
            enum: ['credit', 'debit'],
            required: true
        },
        category: {
            type: String,
            enum: ['transfer', 'deposit', 'withdrawal', 'shopping', 'bills', 'food', 'other'],
            required: true
        },
        title: {
            type: String,
            required: [true, 'Please add a transaction title'],
            trim: true
            // e.g., "Money Sent", "Wallet Deposit", "Amazon Purchase"
        },
        description: {
            type: String,
            trim: true
            // e.g., "To Rahul Patil", "Bank Account ****4589"
        },
        amount: {
            type: Number,
            required: [true, 'Please add an amount']
        },
        status: {
            type: String,
            enum: ['Pending', 'Completed', 'Failed'],
            default: 'Completed'
        },
        referenceUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            // Used if the transaction involves another wallet user (e.g., peer-to-peer transfer)
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Transaction', transactionSchema);