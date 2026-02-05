const express = require('express');
const { query } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all proposals for a project
router.get('/projects/:projectId/proposals', authenticateToken, async (req, res) => {
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
      `SELECT p.*, u.username as proposed_by_username, r.username as reviewed_by_username
       FROM proposals p
       JOIN users u ON p.proposed_by = u.id
       LEFT JOIN users r ON p.reviewed_by = r.id
       WHERE p.project_id = $1
       ORDER BY p.created_at DESC`,
      [projectId]
    );

    res.json({ proposals: result.rows });
  } catch (error) {
    console.error('Get proposals error:', error);
    res.status(500).json({ error: 'Failed to get proposals' });
  }
});

// Create new proposal
router.post('/projects/:projectId/proposals', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { proposedVersionId, title, description } = req.body;

    if (!proposedVersionId || !title) {
      return res.status(400).json({ error: 'Proposed version ID and title are required' });
    }

    // Check if user is collaborator
    const hasAccess = await query(
      'SELECT 1 FROM collaborators WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.userId]
    );

    if (hasAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify version exists
    const versionResult = await query(
      'SELECT id FROM versions WHERE id = $1 AND project_id = $2',
      [proposedVersionId, projectId]
    );

    if (versionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const result = await query(
      `INSERT INTO proposals (project_id, proposed_version_id, proposed_by, title, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [projectId, proposedVersionId, req.user.userId, title, description || '']
    );

    res.status(201).json({ proposal: result.rows[0] });
  } catch (error) {
    console.error('Create proposal error:', error);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// Accept proposal
router.post('/:proposalId/accept', authenticateToken, async (req, res) => {
  try {
    const { proposalId } = req.params;

    // Get proposal
    const proposalResult = await query(
      'SELECT * FROM proposals WHERE id = $1',
      [proposalId]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const proposal = proposalResult.rows[0];

    // Check if user is owner or has editor role
    const accessResult = await query(
      `SELECT p.owner_id, c.role 
       FROM projects p
       LEFT JOIN collaborators c ON p.id = c.project_id AND c.user_id = $1
       WHERE p.id = $2`,
      [req.user.userId, proposal.project_id]
    );

    if (accessResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { owner_id, role } = accessResult.rows[0];
    if (owner_id !== req.user.userId && role !== 'editor') {
      return res.status(403).json({ error: 'Only owner or editors can accept proposals' });
    }

    // Update proposal status
    await query(
      `UPDATE proposals 
       SET status = 'accepted', reviewed_at = NOW(), reviewed_by = $1 
       WHERE id = $2`,
      [req.user.userId, proposalId]
    );

    // Update project's current_version_id to the proposed version
    await query(
      'UPDATE projects SET current_version_id = $1, updated_at = NOW() WHERE id = $2',
      [proposal.proposed_version_id, proposal.project_id]
    );

    // Invalidate cache
    // await invalidateProjectCache(proposal.project_id);

    res.json({ message: 'Proposal accepted successfully' });
  } catch (error) {
    console.error('Accept proposal error:', error);
    res.status(500).json({ error: 'Failed to accept proposal' });
  }
});

// Reject proposal
router.post('/:proposalId/reject', authenticateToken, async (req, res) => {
  try {
    const { proposalId } = req.params;

    // Get proposal
    const proposalResult = await query(
      'SELECT * FROM proposals WHERE id = $1',
      [proposalId]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const proposal = proposalResult.rows[0];

    // Check if user is owner or has editor role
    const accessResult = await query(
      `SELECT p.owner_id, c.role 
       FROM projects p
       LEFT JOIN collaborators c ON p.id = c.project_id AND c.user_id = $1
       WHERE p.id = $2`,
      [req.user.userId, proposal.project_id]
    );

    if (accessResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { owner_id, role } = accessResult.rows[0];
    if (owner_id !== req.user.userId && role !== 'editor') {
      return res.status(403).json({ error: 'Only owner or editors can reject proposals' });
    }

    // Update proposal status
    await query(
      `UPDATE proposals 
       SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $1 
       WHERE id = $2`,
      [req.user.userId, proposalId]
    );

    res.json({ message: 'Proposal rejected successfully' });
  } catch (error) {
    console.error('Reject proposal error:', error);
    res.status(500).json({ error: 'Failed to reject proposal' });
  }
});

module.exports = router;
