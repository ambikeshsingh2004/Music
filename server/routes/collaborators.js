const express = require('express');
const { query } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get collaborators for a project
router.get('/projects/:projectId/collaborators', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Check access
    const hasAccess = await query(
      'SELECT 1 FROM collaborators WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.userId]
    );

    if (hasAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `SELECT c.*, u.username, u.email 
       FROM collaborators c
       JOIN users u ON c.user_id = u.id
       WHERE c.project_id = $1
       ORDER BY c.joined_at ASC`,
      [projectId]
    );

    res.json({ collaborators: result.rows });
  } catch (error) {
    console.error('Get collaborators error:', error);
    res.status(500).json({ error: 'Failed to get collaborators' });
  }
});

// Add collaborator to project
router.post('/projects/:projectId/collaborators', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userEmail, role } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required' });
    }

    // Check if current user is owner
    const projectResult = await query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (projectResult.rows[0].owner_id !== req.user.userId) {
      return res.status(403).json({ error: 'Only owner can add collaborators' });
    }

    // Find user by email
    const userResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [userEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult.rows[0].id;

    // Check if already collaborator
    const existingResult = await query(
      'SELECT 1 FROM collaborators WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'User is already a collaborator' });
    }

    // Add collaborator
    const result = await query(
      `INSERT INTO collaborators (project_id, user_id, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [projectId, userId, role || 'editor']
    );

    res.status(201).json({ collaborator: result.rows[0] });
  } catch (error) {
    console.error('Add collaborator error:', error);
    res.status(500).json({ error: 'Failed to add collaborator' });
  }
});

// Remove collaborator from project
router.delete('/projects/:projectId/collaborators/:userId', authenticateToken, async (req, res) => {
  try {
    const { projectId, userId } = req.params;

    // Check if current user is owner
    const projectResult = await query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (projectResult.rows[0].owner_id !== req.user.userId) {
      return res.status(403).json({ error: 'Only owner can remove collaborators' });
    }

    // Cannot remove owner
    if (userId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot remove project owner' });
    }

    await query(
      'DELETE FROM collaborators WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    res.json({ message: 'Collaborator removed successfully' });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({ error: 'Failed to remove collaborator' });
  }
});

module.exports = router;
