const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a name'],
            trim: true
        },
        email: {
            type: String,
            required: [true, 'Please add an email'],
            unique: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please add a valid email'
            ]
        },
        password: { 
            type: String, 
            required: true }, // New Field
        walletId: {
            type: String,
            required: true,
            unique: true,
            // Example format based on the UI: MW-4589-2026
        },
        balance: {
            type: Number,
            default: 0.00,
            min: [0, 'Balance cannot be negative']
        }
    },
    {
        timestamps: true // Automatically creates createdAt and updatedAt fields
    }
);

// Hash password before saving to the database
userSchema.pre('save', async function() {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
        return; // Just return, do not call next()
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare entered password with hashed database password
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);