// Socket.IO event handlers for real-time collaboration

const activeUsers = new Map(); // projectId -> Set of user objects
const userSocketMap = new Map(); // socketId -> { userId, username }

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Register user for messaging
    socket.on('register-user', ({ userId, username }) => {
      userSocketMap.set(socket.id, { userId, username });
      socket.join(`user:${userId}`); // Personal room for direct messages
      console.log(`User ${username} registered for messaging`);
    });

    // Join project room
    socket.on('join-project', ({ projectId, user }) => {
      socket.join(projectId);

      // Track active user
      if (!activeUsers.has(projectId)) {
        activeUsers.set(projectId, new Set());
      }
      activeUsers.get(projectId).add({ socketId: socket.id, ...user });

      // Notify others in the room
      socket.to(projectId).emit('user-joined', { user });

      // Send current active users to the new joiner
      const users = Array.from(activeUsers.get(projectId) || []);
      socket.emit('active-users', { users });

      console.log(`User ${user.username} joined project ${projectId}`);
    });

    // Leave project room
    socket.on('leave-project', ({ projectId, user }) => {
      socket.leave(projectId);

      // Remove from active users
      if (activeUsers.has(projectId)) {
        const users = activeUsers.get(projectId);
        const userToRemove = Array.from(users).find(u => u.socketId === socket.id);
        if (userToRemove) {
          users.delete(userToRemove);
        }
      }

      // Notify others
      socket.to(projectId).emit('user-left', { user });

      console.log(`User ${user.username} left project ${projectId}`);
    });

    // Join conversation room
    socket.on('join-conversation', ({ conversationId }) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
    });

    // Leave conversation room
    socket.on('leave-conversation', ({ conversationId }) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`Socket ${socket.id} left conversation ${conversationId}`);
    });

    // New message in conversation
    socket.on('send-message', ({ conversationId, message }) => {
      socket.to(`conversation:${conversationId}`).emit('new-message', { message });
    });

    // Typing indicator
    socket.on('typing-start', ({ conversationId, user }) => {
      socket.to(`conversation:${conversationId}`).emit('user-typing', { user, isTyping: true });
    });

    socket.on('typing-stop', ({ conversationId, user }) => {
      socket.to(`conversation:${conversationId}`).emit('user-typing', { user, isTyping: false });
    });

    // New proposal notification
    socket.on('proposal-created', ({ projectId, proposal }) => {
      socket.to(projectId).emit('new-proposal', { proposal });
    });

    // Proposal status update
    socket.on('proposal-updated', ({ projectId, proposalId, status }) => {
      socket.to(projectId).emit('proposal-status-changed', { proposalId, status });
    });

    // New comment
    socket.on('comment-added', ({ projectId, comment }) => {
      socket.to(projectId).emit('new-comment', { comment });
    });

    // Version saved notification
    socket.on('version-saved', ({ projectId, version }) => {
      socket.to(projectId).emit('new-version', { version });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);

      // Remove from user socket map
      userSocketMap.delete(socket.id);

      // Remove from all project rooms
      activeUsers.forEach((users, projectId) => {
        const userToRemove = Array.from(users).find(u => u.socketId === socket.id);
        if (userToRemove) {
          users.delete(userToRemove);
          io.to(projectId).emit('user-left', { user: userToRemove });
        }
      });
    });
  });
};
