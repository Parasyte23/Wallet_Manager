const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const dotenv = require('dotenv')
const http = require('http'); 
const { Server } = require('socket.io');
const walletRoutes = require('./routes/walletRoutes');
const authRoutes = require('./routes/authRoutes');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Create HTTP server and initialize Socket.io
const server = http.createServer(app);
const io = new Server(server , {
    cors : { origin : "*"}
});

// Middleware
app.use(cors());
app.use(express.json());

// Middleware to make 'io' accessible inside your controllers
app.use((req, res, next) => {
    req.io = io;
    next();
})

// Listen for user connections and group them into private rooms using their User ID
io.on('connection' , (socket) => {
    socket.on('joinRoom' , (userId) => {
        socket.join(userId);
    });
});

// Routes
app.use('/api/wallet', walletRoutes);
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
// CRITICAL: Change app.listen to server.listen
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));