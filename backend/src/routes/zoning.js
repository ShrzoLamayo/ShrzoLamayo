const express = require('express');
const { query } = require('../config/database');
const { getZoningAtPoint, getNearbyFeatures, spatialQuery } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { restrictTo } = require('../middleware/auth');
const { getCache, setCache } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

// Get all zoning layers
router.get('/layers', async (req, res, next) => {
  try {
    const cacheKey = 'zoning:layers:all';
    let result = await getCache(cacheKey);

    if (!result) {
      const dbResult = await query(`
        SELECT 
          id, name, description, zoning_code, zoning_type,
          max_height, max_floor_area_ratio, min_front_setback,
          min_side_setback, min_rear_setback, max_lot_coverage,
          min_parking_spaces, created_at, updated_at,
          ST_AsGeoJSON(geometry) as geojson,
          ST_Area(ST_Transform(geometry, 3857)) as area_sqm
        FROM zoning_layers
        ORDER BY name
      `);
      
      result = dbResult.rows;
      await setCache(cacheKey, result, 3600); // Cache for 1 hour
    }

    res.status(200).json({
      status: 'success',
      results: result.length,
      data: {
        layers: result
      }
    });
  } catch (error) {
    logger.error('Get zoning layers error:', error);
    next(error);
  }
});

// Get zoning layer by ID
router.get('/layers/:id', async (req, res, next) => {
  try {
    const layerId = req.params.id;
    const cacheKey = `zoning:layer:${layerId}`;
    let result = await getCache(cacheKey);

    if (!result) {
      const dbResult = await query(`
        SELECT 
          id, name, description, zoning_code, zoning_type,
          max_height, max_floor_area_ratio, min_front_setback,
          min_side_setback, min_rear_setback, max_lot_coverage,
          min_parking_spaces, created_at, updated_at,
          ST_AsGeoJSON(geometry) as geojson,
          ST_Area(ST_Transform(geometry, 3857)) as area_sqm
        FROM zoning_layers
        WHERE id = $1
      `, [layerId]);
      
      if (dbResult.rows.length === 0) {
        return next(new AppError('Zoning layer not found', 404));
      }
      
      result = dbResult.rows[0];
      await setCache(cacheKey, result, 3600);
    }

    res.status(200).json({
      status: 'success',
      data: {
        layer: result
      }
    });
  } catch (error) {
    logger.error('Get zoning layer error:', error);
    next(error);
  }
});

// Get zoning at specific point
router.get('/point/:lng/:lat', async (req, res, next) => {
  try {
    const lng = parseFloat(req.params.lng);
    const lat = parseFloat(req.params.lat);

    if (isNaN(lng) || isNaN(lat)) {
      return next(new AppError('Invalid coordinates', 400));
    }

    const cacheKey = `zoning:point:${lng}:${lat}`;
    let result = await getCache(cacheKey);

    if (!result) {
      const dbResult = await getZoningAtPoint(lng, lat);
      result = dbResult.rows[0] || null;
      await setCache(cacheKey, result, 1800); // Cache for 30 minutes
    }

    res.status(200).json({
      status: 'success',
      data: {
        zoning: result,
        coordinates: [lng, lat]
      }
    });
  } catch (error) {
    logger.error('Get zoning at point error:', error);
    next(error);
  }
});

// Get nearby zoning features
router.get('/nearby/:lng/:lat', async (req, res, next) => {
  try {
    const lng = parseFloat(req.params.lng);
    const lat = parseFloat(req.params.lat);
    const radius = parseInt(req.query.radius) || 1000; // Default 1km radius

    if (isNaN(lng) || isNaN(lat)) {
      return next(new AppError('Invalid coordinates', 400));
    }

    const cacheKey = `zoning:nearby:${lng}:${lat}:${radius}`;
    let result = await getCache(cacheKey);

    if (!result) {
      const dbResult = await getNearbyFeatures(lng, lat, radius, 'zoning_layers');
      result = dbResult.rows;
      await setCache(cacheKey, result, 1800);
    }

    res.status(200).json({
      status: 'success',
      results: result.length,
      data: {
        features: result,
        center: [lng, lat],
        radius: radius
      }
    });
  } catch (error) {
    logger.error('Get nearby zoning error:', error);
    next(error);
  }
});

// Search zoning by area (polygon intersect)
router.post('/search', async (req, res, next) => {
  try {
    const { geometry } = req.body;

    if (!geometry || !geometry.coordinates) {
      return next(new AppError('Valid geometry is required', 400));
    }

    // Convert GeoJSON to WKT
    let wkt;
    if (geometry.type === 'Polygon') {
      const coords = geometry.coordinates[0];
      const wktCoords = coords.map(coord => `${coord[0]} ${coord[1]}`).join(', ');
      wkt = `POLYGON((${wktCoords}))`;
    } else {
      return next(new AppError('Only Polygon geometry is supported', 400));
    }

    const result = await spatialQuery(wkt, 'zoning_layers');

    res.status(200).json({
      status: 'success',
      results: result.rows.length,
      data: {
        layers: result.rows
      }
    });
  } catch (error) {
    logger.error('Search zoning error:', error);
    next(error);
  }
});

// Get zoning rules for a specific project
router.get('/rules/:projectId', async (req, res, next) => {
  try {
    const projectId = req.params.projectId;

    // Get project with its area
    const projectResult = await query(`
      SELECT 
        p.*,
        ST_AsGeoJSON(p.project_area) as project_area_geojson,
        ST_Area(ST_Transform(p.project_area, 3857)) as project_area_sqm
      FROM projects p
      WHERE p.id = $1
    `, [projectId]);

    if (projectResult.rows.length === 0) {
      return next(new AppError('Project not found', 404));
    }

    const project = projectResult.rows[0];

    if (!project.project_area_geojson) {
      return next(new AppError('Project does not have a defined area', 400));
    }

    // Find applicable zoning layers
    const zoningResult = await query(`
      SELECT 
        z.*,
        ST_AsGeoJSON(z.geometry) as geojson,
        ST_Area(ST_Intersection(z.geometry, p.project_area)) / ST_Area(p.project_area) as coverage_ratio
      FROM zoning_layers z, projects p
      WHERE p.id = $1 
        AND ST_Intersects(z.geometry, p.project_area)
      ORDER BY coverage_ratio DESC
    `, [projectId]);

    res.status(200).json({
      status: 'success',
      data: {
        project: project,
        applicable_zoning: zoningResult.rows
      }
    });
  } catch (error) {
    logger.error('Get zoning rules error:', error);
    next(error);
  }
});

// Admin routes for managing zoning layers
router.post('/layers', restrictTo('admin'), async (req, res, next) => {
  try {
    const {
      name,
      description,
      zoning_code,
      zoning_type,
      max_height,
      max_floor_area_ratio,
      min_front_setback,
      min_side_setback,
      min_rear_setback,
      max_lot_coverage,
      min_parking_spaces,
      geometry
    } = req.body;

    if (!name || !zoning_code || !zoning_type || !geometry) {
      return next(new AppError('Name, zoning code, type, and geometry are required', 400));
    }

    // Convert GeoJSON to WKT
    let wkt;
    if (geometry.type === 'MultiPolygon') {
      // Handle MultiPolygon
      const polygons = geometry.coordinates.map(polygon => {
        const coords = polygon[0].map(coord => `${coord[0]} ${coord[1]}`).join(', ');
        return `((${coords}))`;
      }).join(', ');
      wkt = `MULTIPOLYGON(${polygons})`;
    } else if (geometry.type === 'Polygon') {
      const coords = geometry.coordinates[0].map(coord => `${coord[0]} ${coord[1]}`).join(', ');
      wkt = `MULTIPOLYGON(((${coords})))`;
    } else {
      return next(new AppError('Only Polygon and MultiPolygon geometries are supported', 400));
    }

    const result = await query(`
      INSERT INTO zoning_layers (
        name, description, zoning_code, zoning_type,
        max_height, max_floor_area_ratio, min_front_setback,
        min_side_setback, min_rear_setback, max_lot_coverage,
        min_parking_spaces, geometry
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ST_GeomFromText($12, 4326))
      RETURNING *, ST_AsGeoJSON(geometry) as geojson
    `, [
      name, description, zoning_code, zoning_type,
      max_height, max_floor_area_ratio, min_front_setback,
      min_side_setback, min_rear_setback, max_lot_coverage,
      min_parking_spaces, wkt
    ]);

    // Clear cache
    await setCache('zoning:layers:all', null, 0);

    res.status(201).json({
      status: 'success',
      data: {
        layer: result.rows[0]
      }
    });
  } catch (error) {
    logger.error('Create zoning layer error:', error);
    next(error);
  }
});

// Update zoning layer (admin only)
router.patch('/layers/:id', restrictTo('admin'), async (req, res, next) => {
  try {
    const layerId = req.params.id;
    const updates = [];
    const values = [];
    let paramCount = 1;

    const {
      name,
      description,
      zoning_code,
      zoning_type,
      max_height,
      max_floor_area_ratio,
      min_front_setback,
      min_side_setback,
      min_rear_setback,
      max_lot_coverage,
      min_parking_spaces,
      geometry
    } = req.body;

    // Build dynamic update query
    const updateFields = {
      name, description, zoning_code, zoning_type,
      max_height, max_floor_area_ratio, min_front_setback,
      min_side_setback, min_rear_setback, max_lot_coverage,
      min_parking_spaces
    };

    for (const [field, value] of Object.entries(updateFields)) {
      if (value !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        values.push(value);
      }
    }

    if (geometry) {
      let wkt;
      if (geometry.type === 'MultiPolygon') {
        const polygons = geometry.coordinates.map(polygon => {
          const coords = polygon[0].map(coord => `${coord[0]} ${coord[1]}`).join(', ');
          return `((${coords}))`;
        }).join(', ');
        wkt = `MULTIPOLYGON(${polygons})`;
      } else if (geometry.type === 'Polygon') {
        const coords = geometry.coordinates[0].map(coord => `${coord[0]} ${coord[1]}`).join(', ');
        wkt = `MULTIPOLYGON(((${coords})))`;
      } else {
        return next(new AppError('Only Polygon and MultiPolygon geometries are supported', 400));
      }
      
      updates.push(`geometry = ST_GeomFromText($${paramCount++}, 4326)`);
      values.push(wkt);
    }

    if (updates.length === 0) {
      return next(new AppError('No updates provided', 400));
    }

    values.push(layerId);

    const result = await query(`
      UPDATE zoning_layers 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *, ST_AsGeoJSON(geometry) as geojson
    `, values);

    if (result.rows.length === 0) {
      return next(new AppError('Zoning layer not found', 404));
    }

    // Clear cache
    await setCache('zoning:layers:all', null, 0);
    await setCache(`zoning:layer:${layerId}`, null, 0);

    res.status(200).json({
      status: 'success',
      data: {
        layer: result.rows[0]
      }
    });
  } catch (error) {
    logger.error('Update zoning layer error:', error);
    next(error);
  }
});

// Delete zoning layer (admin only)
router.delete('/layers/:id', restrictTo('admin'), async (req, res, next) => {
  try {
    const layerId = req.params.id;

    const result = await query(
      'DELETE FROM zoning_layers WHERE id = $1 RETURNING id',
      [layerId]
    );

    if (result.rows.length === 0) {
      return next(new AppError('Zoning layer not found', 404));
    }

    // Clear cache
    await setCache('zoning:layers:all', null, 0);
    await setCache(`zoning:layer:${layerId}`, null, 0);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    logger.error('Delete zoning layer error:', error);
    next(error);
  }
});

module.exports = router;