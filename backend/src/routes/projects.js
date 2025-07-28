const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { restrictTo } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all projects (with pagination)
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const userId = req.user.role === 'admin' ? req.query.userId : req.user.id;

    let whereClause = '';
    let queryParams = [limit, offset];
    let paramCount = 2;

    if (req.user.role !== 'admin') {
      whereClause = 'WHERE p.user_id = $3';
      queryParams.push(req.user.id);
      paramCount++;
    } else if (userId) {
      whereClause = 'WHERE p.user_id = $3';
      queryParams.push(userId);
      paramCount++;
    }

    if (status) {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += `p.status = $${paramCount}`;
      queryParams.push(status);
    }

    const queryText = `
      SELECT 
        p.*,
        u.first_name || ' ' || u.last_name as owner_name,
        u.email as owner_email,
        ST_AsGeoJSON(p.project_area) as project_area_geojson,
        COUNT(pf.id) as file_count
      FROM projects p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN project_files pf ON p.id = pf.project_id
      ${whereClause}
      GROUP BY p.id, u.first_name, u.last_name, u.email
      ORDER BY p.updated_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await query(queryText, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM projects p
      ${whereClause.replace(/\$1|\$2/g, '').replace(/LIMIT.*/, '')}
    `;
    const countParams = queryParams.slice(2); // Remove limit and offset
    const countResult = await query(countQuery, countParams);

    res.status(200).json({
      status: 'success',
      results: result.rows.length,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      },
      data: {
        projects: result.rows
      }
    });
  } catch (error) {
    logger.error('Get projects error:', error);
    next(error);
  }
});

// Get project by ID
router.get('/:id', async (req, res, next) => {
  try {
    const projectId = req.params.id;
    
    let whereClause = 'WHERE p.id = $1';
    let queryParams = [projectId];
    
    if (req.user.role !== 'admin') {
      whereClause += ' AND p.user_id = $2';
      queryParams.push(req.user.id);
    }

    const result = await query(`
      SELECT 
        p.*,
        u.first_name || ' ' || u.last_name as owner_name,
        u.email as owner_email,
        ST_AsGeoJSON(p.project_area) as project_area_geojson
      FROM projects p
      JOIN users u ON p.user_id = u.id
      ${whereClause}
    `, queryParams);

    if (result.rows.length === 0) {
      return next(new AppError('Project not found', 404));
    }

    // Get project files
    const filesResult = await query(
      'SELECT * FROM project_files WHERE project_id = $1 ORDER BY upload_date DESC',
      [projectId]
    );

    // Get validation results
    const validationResult = await query(
      'SELECT * FROM validation_results WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    );

    const project = result.rows[0];
    project.files = filesResult.rows;
    project.validation_results = validationResult.rows;

    res.status(200).json({
      status: 'success',
      data: {
        project
      }
    });
  } catch (error) {
    logger.error('Get project error:', error);
    next(error);
  }
});

// Create new project
router.post('/', [
  body('name').notEmpty().trim(),
  body('description').optional().trim(),
  body('address').optional().trim(),
  body('lot_size').optional().isNumeric(),
  body('proposed_building_height').optional().isNumeric(),
  body('proposed_floor_area').optional().isNumeric(),
  body('proposed_parking_spaces').optional().isInt({ min: 0 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Invalid input data', 400));
    }

    const {
      name,
      description,
      address,
      lot_size,
      proposed_building_height,
      proposed_floor_area,
      proposed_parking_spaces,
      project_area
    } = req.body;

    let projectAreaWKT = null;
    if (project_area && project_area.coordinates) {
      // Convert GeoJSON to WKT for PostGIS
      const coords = project_area.coordinates[0];
      const wktCoords = coords.map(coord => `${coord[0]} ${coord[1]}`).join(', ');
      projectAreaWKT = `POLYGON((${wktCoords}))`;
    }

    const result = await query(`
      INSERT INTO projects (
        user_id, name, description, address, lot_size,
        proposed_building_height, proposed_floor_area, proposed_parking_spaces,
        project_area
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 
        ${projectAreaWKT ? 'ST_GeomFromText($9, 4326)' : 'NULL'})
      RETURNING *, ST_AsGeoJSON(project_area) as project_area_geojson
    `, projectAreaWKT ? 
      [req.user.id, name, description, address, lot_size, proposed_building_height, proposed_floor_area, proposed_parking_spaces, projectAreaWKT] :
      [req.user.id, name, description, address, lot_size, proposed_building_height, proposed_floor_area, proposed_parking_spaces]
    );

    res.status(201).json({
      status: 'success',
      data: {
        project: result.rows[0]
      }
    });
  } catch (error) {
    logger.error('Create project error:', error);
    next(error);
  }
});

// Update project
router.patch('/:id', [
  body('name').optional().notEmpty().trim(),
  body('description').optional().trim(),
  body('address').optional().trim(),
  body('lot_size').optional().isNumeric(),
  body('proposed_building_height').optional().isNumeric(),
  body('proposed_floor_area').optional().isNumeric(),
  body('proposed_parking_spaces').optional().isInt({ min: 0 }),
  body('status').optional().isIn(['draft', 'under_review', 'approved', 'rejected', 'requires_revision'])
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Invalid input data', 400));
    }

    const projectId = req.params.id;
    
    // Check if project exists and user has permission
    let whereClause = 'WHERE id = $1';
    let checkParams = [projectId];
    
    if (req.user.role !== 'admin') {
      whereClause += ' AND user_id = $2';
      checkParams.push(req.user.id);
    }

    const existingProject = await query(
      `SELECT * FROM projects ${whereClause}`,
      checkParams
    );

    if (existingProject.rows.length === 0) {
      return next(new AppError('Project not found or access denied', 404));
    }

    const {
      name,
      description,
      address,
      lot_size,
      proposed_building_height,
      proposed_floor_area,
      proposed_parking_spaces,
      status,
      project_area
    } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(address);
    }
    if (lot_size !== undefined) {
      updates.push(`lot_size = $${paramCount++}`);
      values.push(lot_size);
    }
    if (proposed_building_height !== undefined) {
      updates.push(`proposed_building_height = $${paramCount++}`);
      values.push(proposed_building_height);
    }
    if (proposed_floor_area !== undefined) {
      updates.push(`proposed_floor_area = $${paramCount++}`);
      values.push(proposed_floor_area);
    }
    if (proposed_parking_spaces !== undefined) {
      updates.push(`proposed_parking_spaces = $${paramCount++}`);
      values.push(proposed_parking_spaces);
    }
    if (status !== undefined) {
      // Only admin can change status to approved/rejected
      if ((status === 'approved' || status === 'rejected') && req.user.role !== 'admin') {
        return next(new AppError('Only administrators can approve or reject projects', 403));
      }
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (project_area && project_area.coordinates) {
      const coords = project_area.coordinates[0];
      const wktCoords = coords.map(coord => `${coord[0]} ${coord[1]}`).join(', ');
      const projectAreaWKT = `POLYGON((${wktCoords}))`;
      updates.push(`project_area = ST_GeomFromText($${paramCount++}, 4326)`);
      values.push(projectAreaWKT);
    }

    if (updates.length === 0) {
      return next(new AppError('No updates provided', 400));
    }

    values.push(projectId);
    
    const result = await query(`
      UPDATE projects 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *, ST_AsGeoJSON(project_area) as project_area_geojson
    `, values);

    res.status(200).json({
      status: 'success',
      data: {
        project: result.rows[0]
      }
    });
  } catch (error) {
    logger.error('Update project error:', error);
    next(error);
  }
});

// Delete project
router.delete('/:id', async (req, res, next) => {
  try {
    const projectId = req.params.id;
    
    let whereClause = 'WHERE id = $1';
    let queryParams = [projectId];
    
    if (req.user.role !== 'admin') {
      whereClause += ' AND user_id = $2';
      queryParams.push(req.user.id);
    }

    const result = await query(
      `DELETE FROM projects ${whereClause} RETURNING id`,
      queryParams
    );

    if (result.rows.length === 0) {
      return next(new AppError('Project not found or access denied', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    logger.error('Delete project error:', error);
    next(error);
  }
});

module.exports = router;