// Load env vars ONLY in local dev
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// Allowed origins logic
const allowedOrigin =
  process.env.ALLOW_ALL_ORIGINS === "true"
    ? "*"
    : process.env.CLIENT_URL || "http://localhost:3000";

const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Middleware
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true
  })
);

app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/versions", require("./routes/versions"));
app.use("/api/proposals", require("./routes/proposals"));
app.use("/api/collaborators", require("./routes/collaborators"));
app.use("/api/users", require("./routes/users"));
app.use(
  "/api/collaboration-requests",
  require("./routes/collaboration-requests")
);
app.use("/api/messages", require("./routes/messages"));

// Socket.IO handlers
require("./sockets")(io);

// Health check (Render uses this)
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Start server (Render injects PORT)
// Start server (Render injects PORT)
const PORT = process.env.PORT || 3001;

// Initialize Database Schema
const fs = require('fs');
const path = require('path');
const { pool } = require('./database');

async function initDb() {
  try {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const messagesPath = path.join(__dirname, '../database/migration_messages.sql');
    const requestsPath = path.join(__dirname, '../database/migration_collaboration_requests.sql');

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const messagesSql = fs.readFileSync(messagesPath, 'utf8');
    const requestsSql = fs.readFileSync(requestsPath, 'utf8');

    await pool.query(schemaSql);
    console.log('✅ Base schema initialized');

    await pool.query(messagesSql);
    console.log('✅ Messages schema initialized');

    await pool.query(requestsSql);
    console.log('✅ Collaboration requests schema initialized');

  } catch (err) {
    console.error('❌ Failed to initialize database:', err);
  }
}

// Start server after DB init
initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 API running on port ${PORT}`);
  });
});

// Export for testing / reuse
module.exports = { app, server, io };
