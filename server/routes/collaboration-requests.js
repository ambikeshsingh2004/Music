const express = require('express');
const router = express.Router();
const { query } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get all collaboration requests for current user
router.get('/my-requests', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT cr.*, 
              p.name as project_name,
              sender.username as sender_username,
              sender.email as sender_email,
              recipient.username as recipient_username,
              recipient.email as recipient_email
       FROM collaboration_requests cr
       JOIN projects p ON cr.project_id = p.id
       JOIN users sender ON cr.sender_id = sender.id
       JOIN users recipient ON cr.recipient_id = recipient.id
       WHERE cr.sender_id = $1 OR cr.recipient_id = $1
       ORDER BY cr.created_at DESC`,
      [req.user.userId]
    );

    const sent = result.rows.filter(r => r.sender_id === req.user.userId);
    const received = result.rows.filter(r => r.recipient_id === req.user.userId);

    res.json({ sent, received });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Failed to fetch collaboration requests' });
  }
});

// Send collaboration request
router.post('/', authenticateToken, async (req, res) => {
  const { projectId, recipientId, message } = req.body;

  if (!projectId || !recipientId) {
    return res.status(400).json({ error: 'Project ID and recipient ID are required' });
  }

  try {
    // Check if project exists and user has permission
    const projectCheck = await query(
      'SELECT * FROM projects WHERE id = $1 AND (owner_id = $2 OR id IN (SELECT project_id FROM collaborators WHERE user_id = $2 AND role IN (\'owner\', \'editor\')))',
      [projectId, req.user.userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to invite collaborators to this project' });
    }

    // Check if recipient is already a collaborator
    const collabCheck = await query(
      'SELECT * FROM collaborators WHERE project_id = $1 AND user_id = $2',
      [projectId, recipientId]
    );

    if (collabCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a collaborator on this project' });
    }

    // Check if request already exists
    const existingRequest = await query(
      'SELECT * FROM collaboration_requests WHERE project_id = $1 AND recipient_id = $2 AND status = \'pending\'',
      [projectId, recipientId]
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ error: 'Collaboration request already sent to this user' });
    }

    // Create request
    const result = await query(
      'INSERT INTO collaboration_requests (project_id, sender_id, recipient_id, message) VALUES ($1, $2, $3, $4) RETURNING *',
      [projectId, req.user.userId, recipientId, message]
    );

    res.json({ request: result.rows[0] });
  } catch (error) {
    console.error('Send request error:', error);
    res.status(500).json({ error: 'Failed to send collaboration request' });
  }
});

// Accept collaboration request
router.post('/:requestId/accept', authenticateToken, async (req, res) => {
  const { requestId } = req.params;

  try {
    // Get request
    const requestResult = await query(
      'SELECT * FROM collaboration_requests WHERE id = $1 AND recipient_id = $2 AND status = \'pending\'',
      [requestId, req.user.userId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found or already processed' });
    }

    const request = requestResult.rows[0];

    // Add user as collaborator
    await query(
      'INSERT INTO collaborators (project_id, user_id, role) VALUES ($1, $2, $3)',
      [request.project_id, req.user.userId, 'editor']
    );

    // Update request status
    await query(
      'UPDATE collaboration_requests SET status = \'accepted\', responded_at = NOW() WHERE id = $1',
      [requestId]
    );

    res.json({ message: 'Collaboration request accepted' });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ error: 'Failed to accept collaboration request' });
  }
});

// Reject collaboration request
router.post('/:requestId/reject', authenticateToken, async (req, res) => {
  const { requestId } = req.params;

  try {
    const result = await query(
      'UPDATE collaboration_requests SET status = \'rejected\', responded_at = NOW() WHERE id = $1 AND recipient_id = $2 AND status = \'pending\' RETURNING *',
      [requestId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found or already processed' });
    }

    res.json({ message: 'Collaboration request rejected' });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ error: 'Failed to reject collaboration request' });
  }
});

// Cancel collaboration request (sender only)
router.delete('/:requestId', authenticateToken, async (req, res) => {
  const { requestId } = req.params;

  try {
    const result = await query(
      'DELETE FROM collaboration_requests WHERE id = $1 AND sender_id = $2 AND status = \'pending\' RETURNING *',
      [requestId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found or cannot be cancelled' });
    }

    res.json({ message: 'Collaboration request cancelled' });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ error: 'Failed to cancel collaboration request' });
  }
});

module.exports = router;
