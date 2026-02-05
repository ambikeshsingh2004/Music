const express = require('express');
const { query } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all versions for a project
router.get('/projects/:projectId/versions', authenticateToken, async (req, res) => {
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
      `SELECT v.*, u.username as created_by_username 
       FROM versions v 
       JOIN users u ON v.created_by = u.id 
       WHERE v.project_id = $1 
       ORDER BY v.created_at DESC`,
      [projectId]
    );

    res.json({ versions: result.rows });
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({ error: 'Failed to get versions' });
  }
});

// Get specific version
router.get('/projects/:projectId/versions/:versionId', authenticateToken, async (req, res) => {
  try {
    const { projectId, versionId } = req.params;

    // Check access
    const hasAccess = await query(
      'SELECT 1 FROM collaborators WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.userId]
    );

    if (hasAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `SELECT v.*, u.username as created_by_username 
       FROM versions v 
       JOIN users u ON v.created_by = u.id 
       WHERE v.id = $1 AND v.project_id = $2`,
      [versionId, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json({ version: result.rows[0] });
  } catch (error) {
    console.error('Get version error:', error);
    res.status(500).json({ error: 'Failed to get version' });
  }
});

// Create new version (save) - owners save directly, others create proposals
router.post('/projects/:projectId/versions', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { musicData, metadata, message, parentVersionId } = req.body;

    if (!musicData) {
      return res.status(400).json({ error: 'Music data is required' });
    }

    // Get project to check ownership
    const projectResult = await query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const isOwner = projectResult.rows[0].owner_id === req.user.userId;

    // Check if user is a collaborator with editor access
    const collaboratorResult = await query(
      'SELECT role FROM collaborators WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.userId]
    );
    const isEditor = collaboratorResult.rows[0]?.role === 'editor';

    // Get next version number
    const versionCountResult = await query(
      'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM versions WHERE project_id = $1',
      [projectId]
    );
    const versionNumber = versionCountResult.rows[0].next_version;

    // Create version
    const versionResult = await query(
      `INSERT INTO versions (project_id, parent_version_id, version_number, music_data, metadata, created_by, message) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        projectId,
        parentVersionId || null,
        versionNumber,
        JSON.stringify(musicData),
        JSON.stringify(metadata || {}),
        req.user.userId,
        message || `Version ${versionNumber}`
      ]
    );

    const version = versionResult.rows[0];

    // If owner or editor, update HEAD directly
    if (isOwner || isEditor) {
      await query(
        'UPDATE projects SET current_version_id = $1, updated_at = NOW() WHERE id = $2',
        [version.id, projectId]
      );

      // Invalidate cache
      // await invalidateProjectCache(projectId);

      res.status(201).json({
        version,
        type: 'saved',
        message: 'Version saved successfully!'
      });
    } else {
      // Non-owner/non-editor: Create a proposal for owner approval
      const proposalResult = await query(
        `INSERT INTO proposals (project_id, version_id, proposed_by, title, description, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING *`,
        [
          projectId,
          version.id,
          req.user.userId,
          message || `Proposed changes (v${versionNumber})`,
          `Changes submitted for review. Created at ${new Date().toLocaleString()}`
        ]
      );

      res.status(201).json({
        version,
        proposal: proposalResult.rows[0],
        type: 'proposal',
        message: 'Your changes have been submitted as a proposal for the owner to review!'
      });
    }
  } catch (error) {
    console.error('Create version error:', error);
    res.status(500).json({ error: 'Failed to create version' });
  }
});

// Revert to a specific version (move pointer)
router.post('/projects/:projectId/revert/:versionId', authenticateToken, async (req, res) => {
  try {
    const { projectId, versionId } = req.params;

    // Check if user is owner or editor
    const accessResult = await query(
      'SELECT role FROM collaborators WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.userId]
    );

    if (accessResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const role = accessResult.rows[0].role;
    if (role === 'viewer') {
      return res.status(403).json({ error: 'Viewers cannot revert versions' });
    }

    // Verify version exists and belongs to project
    const versionResult = await query(
      'SELECT id FROM versions WHERE id = $1 AND project_id = $2',
      [versionId, projectId]
    );

    if (versionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Update current_version_id (just move the pointer)
    await query(
      'UPDATE projects SET current_version_id = $1, updated_at = NOW() WHERE id = $2',
      [versionId, projectId]
    );

    // Invalidate cache
    // await invalidateProjectCache(projectId);

    res.json({ message: 'Reverted to version successfully', versionId });
  } catch (error) {
    console.error('Revert version error:', error);
    res.status(500).json({ error: 'Failed to revert version' });
  }
});

module.exports = router;
