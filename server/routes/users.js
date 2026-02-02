const express = require('express');
const router = express.Router();
const { query } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get all users (excluding current user)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, email, created_at FROM users WHERE id != $1 ORDER BY username',
      [req.user.userId]
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get users not in a specific project
router.get('/available/:projectId', authenticateToken, async (req, res) => {
  const { projectId } = req.params;

  try {
    // Get users who are NOT already collaborators on this project
    const result = await query(
      `SELECT u.id, u.username, u.email, u.created_at 
       FROM users u
       WHERE u.id != $1
       AND u.id NOT IN (
         SELECT user_id FROM collaborators WHERE project_id = $2
       )
       AND u.id != (
         SELECT owner_id FROM projects WHERE id = $2
       )
       ORDER BY u.username`,
      [req.user.userId, projectId]
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get available users error:', error);
    res.status(500).json({ error: 'Failed to fetch available users' });
  }
});

// Search users by username or email
router.get('/search', authenticateToken, async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  try {
    const result = await query(
      `SELECT id, username, email, created_at 
       FROM users 
       WHERE id != $1 
       AND (username ILIKE $2 OR email ILIKE $2)
       ORDER BY username
       LIMIT 20`,
      [req.user.userId, `%${q}%`]
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

module.exports = router;
