const express = require('express');
const { query } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all public projects (for discovery)
router.get('/public', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, u.username as owner_username,
        (SELECT COUNT(*) FROM versions WHERE project_id = p.id) as version_count,
        (SELECT COUNT(*) FROM collaborators WHERE project_id = p.id) as collaborator_count
       FROM projects p 
       JOIN users u ON p.owner_id = u.id 
       ORDER BY p.updated_at DESC`
    );

    res.json({ projects: result.rows });
  } catch (error) {
    console.error('Get public projects error:', error);
    res.status(500).json({ error: 'Failed to get public projects' });
  }
});

// Get all projects for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, u.username as owner_username 
       FROM projects p 
       JOIN users u ON p.owner_id = u.id 
       WHERE p.owner_id = $1 
       OR p.id IN (
         SELECT project_id FROM collaborators WHERE user_id = $1
       )
       ORDER BY p.updated_at DESC`,
      [req.user.userId]
    );

    res.json({ projects: result.rows });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

// Get single project with current version
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get project
    const projectResult = await query(
      `SELECT p.*, u.username as owner_username 
       FROM projects p 
       JOIN users u ON p.owner_id = u.id 
       WHERE p.id = $1`,
      [id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // Check if user is owner/collaborator
    const isOwner = project.owner_id === req.user.userId;
    const collaboratorResult = await query(
      'SELECT role FROM collaborators WHERE project_id = $1 AND user_id = $2',
      [id, req.user.userId]
    );
    const isCollaborator = collaboratorResult.rows.length > 0;
    const role = collaboratorResult.rows[0]?.role || null;

    // Get current version if exists
    let currentVersion = null;
    if (project.current_version_id) {
      const versionResult = await query(
        'SELECT * FROM versions WHERE id = $1',
        [project.current_version_id]
      );
      currentVersion = versionResult.rows[0] || null;
    }

    const response = {
      project,
      currentVersion,
      isOwner,
      isCollaborator,
      role,
      canEdit: isOwner || role === 'editor'
    };

    res.json(response);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

// Create new project
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const result = await query(
      'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description || '', req.user.userId]
    );

    const project = result.rows[0];

    // Add owner as collaborator
    await query(
      'INSERT INTO collaborators (project_id, user_id, role) VALUES ($1, $2, $3)',
      [project.id, req.user.userId, 'owner']
    );

    res.status(201).json({ project });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project metadata
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Check ownership
    const projectResult = await query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (projectResult.rows[0].owner_id !== req.user.userId) {
      return res.status(403).json({ error: 'Only owner can update project' });
    }

    const result = await query(
      'UPDATE projects SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [name, description, id]
    );

    // Invalidate cache (Removed)
    // await invalidateProjectCache(id);

    res.json({ project: result.rows[0] });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const projectResult = await query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (projectResult.rows[0].owner_id !== req.user.userId) {
      return res.status(403).json({ error: 'Only owner can delete project' });
    }

    await query('DELETE FROM projects WHERE id = $1', [id]);

    // Invalidate cache
    // await invalidateProjectCache(id);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
