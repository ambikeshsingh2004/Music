const express = require('express');
const { query } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all conversations for the current user
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        c.*,
        p.name as project_name,
        (
          SELECT json_agg(json_build_object('id', u.id, 'username', u.username))
          FROM conversation_participants cp2
          JOIN users u ON cp2.user_id = u.id
          WHERE cp2.conversation_id = c.id AND cp2.user_id != $1
        ) as other_participants,
        (
          SELECT json_build_object('content', m.content, 'sender_id', m.sender_id, 'created_at', m.created_at, 'sender_username', u.username)
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message,
        (
          SELECT COUNT(*)
          FROM messages m
          WHERE m.conversation_id = c.id AND m.created_at > cp.last_read_at
        )::integer as unread_count
       FROM conversations c
       JOIN conversation_participants cp ON c.id = cp.conversation_id
       LEFT JOIN projects p ON c.project_id = p.id
       WHERE cp.user_id = $1
       ORDER BY c.updated_at DESC`,
      [req.user.userId]
    );

    res.json({ conversations: result.rows });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Get or create direct conversation with a user
router.post('/conversations/direct', authenticateToken, async (req, res) => {
  try {
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }

    if (recipientId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }

    // Check if direct conversation already exists between these users
    const existingResult = await query(
      `SELECT c.id FROM conversations c
       WHERE c.type = 'direct'
       AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = $1)
       AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = $2)
       AND (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) = 2`,
      [req.user.userId, recipientId]
    );

    if (existingResult.rows.length > 0) {
      // Return existing conversation
      const conversationId = existingResult.rows[0].id;
      const convResult = await query(
        `SELECT c.*, 
          (SELECT json_agg(json_build_object('id', u.id, 'username', u.username))
           FROM conversation_participants cp JOIN users u ON cp.user_id = u.id
           WHERE cp.conversation_id = c.id AND cp.user_id != $1) as other_participants
         FROM conversations c WHERE c.id = $2`,
        [req.user.userId, conversationId]
      );
      return res.json({ conversation: convResult.rows[0], existing: true });
    }

    // Create new conversation
    const convResult = await query(
      `INSERT INTO conversations (type) VALUES ('direct') RETURNING *`
    );
    const conversation = convResult.rows[0];

    // Add participants
    await query(
      `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
      [conversation.id, req.user.userId, recipientId]
    );

    // Get recipient info
    const recipientResult = await query(
      `SELECT id, username FROM users WHERE id = $1`,
      [recipientId]
    );

    conversation.other_participants = [recipientResult.rows[0]];

    res.status(201).json({ conversation, existing: false });
  } catch (error) {
    console.error('Create direct conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Create project conversation
router.post('/conversations/project', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Check if project conversation already exists
    const existingResult = await query(
      `SELECT id FROM conversations WHERE project_id = $1 AND type = 'project'`,
      [projectId]
    );

    if (existingResult.rows.length > 0) {
      return res.json({ conversation: existingResult.rows[0], existing: true });
    }

    // Verify user has access to project
    const accessResult = await query(
      `SELECT 1 FROM collaborators WHERE project_id = $1 AND user_id = $2`,
      [projectId, req.user.userId]
    );

    if (accessResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to project' });
    }

    // Get project name
    const projectResult = await query(
      `SELECT name FROM projects WHERE id = $1`,
      [projectId]
    );

    // Create conversation
    const convResult = await query(
      `INSERT INTO conversations (project_id, type, name) 
       VALUES ($1, 'project', $2) RETURNING *`,
      [projectId, projectResult.rows[0].name + ' Discussion']
    );
    const conversation = convResult.rows[0];

    // Add all project collaborators as participants
    await query(
      `INSERT INTO conversation_participants (conversation_id, user_id)
       SELECT $1, user_id FROM collaborators WHERE project_id = $2`,
      [conversation.id, projectId]
    );

    res.status(201).json({ conversation, existing: false });
  } catch (error) {
    console.error('Create project conversation error:', error);
    res.status(500).json({ error: 'Failed to create project conversation' });
  }
});

// Get messages in a conversation
router.get('/conversations/:conversationId/messages', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;

    // Verify user is participant
    const participantResult = await query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, req.user.userId]
    );

    if (participantResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this conversation' });
    }

    let messagesQuery = `
      SELECT m.*, u.username as sender_username
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
    `;
    const params = [conversationId];

    if (before) {
      messagesQuery += ` AND m.created_at < $${params.length + 1}`;
      params.push(before);
    }

    messagesQuery += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await query(messagesQuery, params);

    // Update last_read_at
    await query(
      `UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, req.user.userId]
    );

    res.json({ messages: result.rows.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Send a message
router.post('/conversations/:conversationId/messages', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, messageType = 'text', metadata } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify user is participant
    const participantResult = await query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, req.user.userId]
    );

    if (participantResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this conversation' });
    }

    // Create message
    const result = await query(
      `INSERT INTO messages (conversation_id, sender_id, content, message_type, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [conversationId, req.user.userId, content.trim(), messageType, metadata ? JSON.stringify(metadata) : null]
    );

    // Update conversation's updated_at
    await query(
      `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
      [conversationId]
    );

    // Get sender username
    const userResult = await query(
      `SELECT username FROM users WHERE id = $1`,
      [req.user.userId]
    );

    const message = {
      ...result.rows[0],
      sender_username: userResult.rows[0].username
    };

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark conversation as read
router.post('/conversations/:conversationId/read', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;

    await query(
      `UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, req.user.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Get conversation participants
router.get('/conversations/:conversationId/participants', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Verify user is participant
    const participantResult = await query(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, req.user.userId]
    );

    if (participantResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this conversation' });
    }

    const result = await query(
      `SELECT u.id, u.username, cp.joined_at
       FROM conversation_participants cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.conversation_id = $1`,
      [conversationId]
    );

    res.json({ participants: result.rows });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ error: 'Failed to get participants' });
  }
});

module.exports = router;
