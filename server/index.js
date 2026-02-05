require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const versionRoutes = require('./routes/versions');
const proposalRoutes = require('./routes/proposals');
const collaboratorRoutes = require('./routes/collaborators');
const userRoutes = require('./routes/users');
const collabRequestRoutes = require('./routes/collaboration-requests');
const messageRoutes = require('./routes/messages');

// Socket.IO handlers
require('./sockets')(io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/collaborators', collaboratorRoutes);
app.use('/api/users', userRoutes);
app.use('/api/collaboration-requests', collabRequestRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = { app, server, io };
