const express = require('express');
const turf = require('@turf/turf');
const { query, spatialQuery } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { getCache, setCache } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

// GIS Validation Engine
class GISValidationEngine {
  constructor() {
    this.elevationCache = new Map();
  }

  // Get elevation data from Google Elevation API or NASA DEM
  async getElevationData(coordinates) {
    const cacheKey = `elevation:${coordinates[0]},${coordinates[1]}`;
    
    if (this.elevationCache.has(cacheKey)) {
      return this.elevationCache.get(cacheKey);
    }

    try {
      // Try Google Elevation API first
      if (process.env.GOOGLE_ELEVATION_API_KEY) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/elevation/json?locations=${coordinates[1]},${coordinates[0]}&key=${process.env.GOOGLE_ELEVATION_API_KEY}`
        );
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const elevation = data.results[0].elevation;
          this.elevationCache.set(cacheKey, elevation);
          return elevation;
        }
      }

      // Fallback to NASA DEM (simplified - would need actual implementation)
      const elevation = await this.getNASAElevation(coordinates);
      this.elevationCache.set(cacheKey, elevation);
      return elevation;
      
    } catch (error) {
      logger.error('Elevation API error:', error);
      return null;
    }
  }

  async getNASAElevation(coordinates) {
    // Placeholder for NASA DEM implementation
    // In production, you would integrate with NASA's Shuttle Radar Topography Mission (SRTM) data
    return 100; // Default elevation in meters
  }

  // Calculate FAR (Floor Area Ratio) validation
  validateFAR(projectData, zoningRules) {
    const violations = [];

    if (!projectData.lot_size || !projectData.proposed_floor_area) {
      return violations;
    }

    const actualFAR = projectData.proposed_floor_area / projectData.lot_size;

    zoningRules.forEach(rule => {
      if (rule.max_floor_area_ratio) {
        const isCompliant = actualFAR <= rule.max_floor_area_ratio;
        violations.push({
          rule_type: 'FAR',
          rule_name: 'Floor Area Ratio',
          zoning_code: rule.zoning_code,
          is_compliant: isCompliant,
          actual_value: actualFAR,
          required_value: rule.max_floor_area_ratio,
          severity: isCompliant ? 'info' : 'error',
          description: `FAR validation for ${rule.zoning_code} zone`,
          details: isCompliant 
            ? `FAR of ${actualFAR.toFixed(2)} is within the limit of ${rule.max_floor_area_ratio}`
            : `FAR of ${actualFAR.toFixed(2)} exceeds maximum allowed ${rule.max_floor_area_ratio}`
        });
      }
    });

    return violations;
  }

  // Validate road width vs building height relationship
  async validateRoadWidthToHeight(projectGeometry, buildingHeight) {
    const violations = [];

    try {
      // Find nearby roads
      const nearbyRoads = await this.findNearbyRoads(projectGeometry, 100); // 100m radius
      
      for (const road of nearbyRoads) {
        const distance = turf.distance(
          turf.centroid(projectGeometry),
          turf.nearestPointOnLine(road.geometry, turf.centroid(projectGeometry))
        ) * 1000; // Convert to meters

        // Standard rule: Building height should not exceed 1.5 times the road width
        const maxAllowedHeight = road.width * 1.5;
        const isCompliant = buildingHeight <= maxAllowedHeight;

        violations.push({
          rule_type: 'ROAD_WIDTH_HEIGHT',
          rule_name: 'Road Width to Building Height Ratio',
          road_name: road.name,
          road_width: road.width,
          distance_to_road: distance,
          is_compliant: isCompliant,
          actual_value: buildingHeight,
          required_value: maxAllowedHeight,
          severity: isCompliant ? 'info' : 'error',
          description: `Building height vs road width validation`,
          details: isCompliant 
            ? `Building height ${buildingHeight}m is acceptable for ${road.width}m road`
            : `Building height ${buildingHeight}m exceeds limit of ${maxAllowedHeight}m for ${road.width}m road`
        });
      }
    } catch (error) {
      logger.error('Road width validation error:', error);
    }

    return violations;
  }

  // Validate distances from infrastructure
  async validateInfrastructureDistances(projectGeometry) {
    const violations = [];

    try {
      // Check distance from drains/sewers
      const drains = await this.findNearbyInfrastructure(projectGeometry, 'drain', 500);
      const minDrainDistance = 10; // 10 meters minimum

      for (const drain of drains) {
        const distance = turf.distance(
          turf.centroid(projectGeometry),
          turf.centroid(drain.geometry)
        ) * 1000;

        const isCompliant = distance >= minDrainDistance;
        violations.push({
          rule_type: 'INFRASTRUCTURE_DISTANCE',
          rule_name: 'Distance from Drainage System',
          infrastructure_type: 'drain',
          is_compliant: isCompliant,
          actual_value: distance,
          required_value: minDrainDistance,
          severity: isCompliant ? 'info' : 'error',
          description: 'Minimum distance from drainage infrastructure',
          details: isCompliant 
            ? `Distance of ${distance.toFixed(1)}m from drain is adequate`
            : `Distance of ${distance.toFixed(1)}m from drain is below minimum ${minDrainDistance}m`
        });
      }

      // Check distance from sewers
      const sewers = await this.findNearbyInfrastructure(projectGeometry, 'sewer', 300);
      const minSewerDistance = 5; // 5 meters minimum

      for (const sewer of sewers) {
        const distance = turf.distance(
          turf.centroid(projectGeometry),
          turf.centroid(sewer.geometry)
        ) * 1000;

        const isCompliant = distance >= minSewerDistance;
        violations.push({
          rule_type: 'INFRASTRUCTURE_DISTANCE',
          rule_name: 'Distance from Sewer System',
          infrastructure_type: 'sewer',
          is_compliant: isCompliant,
          actual_value: distance,
          required_value: minSewerDistance,
          severity: isCompliant ? 'info' : 'warning',
          description: 'Minimum distance from sewer infrastructure',
          details: isCompliant 
            ? `Distance of ${distance.toFixed(1)}m from sewer is adequate`
            : `Distance of ${distance.toFixed(1)}m from sewer is below recommended ${minSewerDistance}m`
        });
      }

    } catch (error) {
      logger.error('Infrastructure distance validation error:', error);
    }

    return violations;
  }

  // Validate open space percentage
  validateOpenSpacePercentage(projectData, zoningRules) {
    const violations = [];

    if (!projectData.lot_size) {
      return violations;
    }

    // Calculate building footprint (simplified)
    const estimatedFootprint = projectData.proposed_floor_area / 2; // Assume 2 floors average
    const openSpaceArea = projectData.lot_size - estimatedFootprint;
    const openSpacePercentage = (openSpaceArea / projectData.lot_size) * 100;

    zoningRules.forEach(rule => {
      // Minimum open space requirements by zoning type
      const minOpenSpaceReq = this.getMinimumOpenSpace(rule.zoning_type);
      
      if (minOpenSpaceReq > 0) {
        const isCompliant = openSpacePercentage >= minOpenSpaceReq;
        violations.push({
          rule_type: 'OPEN_SPACE',
          rule_name: 'Minimum Open Space Requirement',
          zoning_code: rule.zoning_code,
          is_compliant: isCompliant,
          actual_value: openSpacePercentage,
          required_value: minOpenSpaceReq,
          severity: isCompliant ? 'info' : 'error',
          description: `Open space percentage for ${rule.zoning_type} zone`,
          details: isCompliant 
            ? `Open space of ${openSpacePercentage.toFixed(1)}% meets requirement of ${minOpenSpaceReq}%`
            : `Open space of ${openSpacePercentage.toFixed(1)}% is below minimum ${minOpenSpaceReq}%`
        });
      }
    });

    return violations;
  }

  // Validate parking requirements with enhanced logic
  validateParkingRequirements(projectData, zoningRules) {
    const violations = [];

    zoningRules.forEach(rule => {
      if (rule.min_parking_spaces && projectData.proposed_parking_spaces !== null) {
        // Enhanced parking calculation based on floor area
        let calculatedMinParking = rule.min_parking_spaces;
        
        if (projectData.proposed_floor_area) {
          // Different parking ratios by zoning type
          const parkingRatio = this.getParkingRatio(rule.zoning_type);
          calculatedMinParking = Math.ceil(projectData.proposed_floor_area / parkingRatio);
        }

        const isCompliant = projectData.proposed_parking_spaces >= calculatedMinParking;
        violations.push({
          rule_type: 'PARKING',
          rule_name: 'Parking Space Requirement',
          zoning_code: rule.zoning_code,
          is_compliant: isCompliant,
          actual_value: projectData.proposed_parking_spaces,
          required_value: calculatedMinParking,
          severity: isCompliant ? 'info' : 'error',
          description: `Parking requirement for ${rule.zoning_type} zone`,
          calculation_method: 'floor_area_based',
          details: isCompliant 
            ? `${projectData.proposed_parking_spaces} parking spaces meet requirement of ${calculatedMinParking}`
            : `${projectData.proposed_parking_spaces} parking spaces below minimum ${calculatedMinParking}`
        });
      }
    });

    return violations;
  }

  // Load and process shapefile rules
  async loadShapefileRules(shapefilePath) {
    // In production, use a library like 'shapefile' to read .shp files
    // This is a simplified version
    try {
      const rules = [
        {
          zone_type: 'R1',
          max_height: 35,
          max_far: 0.5,
          min_open_space: 40,
          parking_ratio: 100 // 1 space per 100 sq m
        },
        {
          zone_type: 'C1',
          max_height: 150,
          max_far: 3.0,
          min_open_space: 20,
          parking_ratio: 50 // 1 space per 50 sq m
        }
      ];

      return rules;
    } catch (error) {
      logger.error('Shapefile loading error:', error);
      return [];
    }
  }

  // Helper methods
  async findNearbyRoads(geometry, radiusMeters = 100) {
    try {
      const centroid = turf.centroid(geometry);
      const [lng, lat] = centroid.geometry.coordinates;

      const result = await query(`
        SELECT 
          r.*,
          ST_AsGeoJSON(r.geometry) as geojson,
          ST_Distance(
            ST_Transform(r.geometry, 3857),
            ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857)
          ) as distance_meters
        FROM roads r
        WHERE ST_DWithin(
          ST_Transform(r.geometry, 3857),
          ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857),
          $3
        )
        ORDER BY distance_meters
      `, [lng, lat, radiusMeters]);

      return result.rows.map(row => ({
        ...row,
        geometry: JSON.parse(row.geojson)
      }));
    } catch (error) {
      logger.error('Find nearby roads error:', error);
      return [];
    }
  }

  async findNearbyInfrastructure(geometry, type, radiusMeters = 300) {
    // Placeholder - in production, this would query infrastructure layers
    return [
      {
        id: 1,
        type: type,
        geometry: {
          type: 'Point',
          coordinates: [-74.006, 40.712]
        }
      }
    ];
  }

  getMinimumOpenSpace(zoningType) {
    const openSpaceRequirements = {
      'residential': 30,
      'commercial': 20,
      'industrial': 15,
      'mixed_use': 25,
      'institutional': 40
    };
    return openSpaceRequirements[zoningType] || 20;
  }

  getParkingRatio(zoningType) {
    const parkingRatios = {
      'residential': 100, // 1 space per 100 sq m
      'commercial': 50,   // 1 space per 50 sq m
      'industrial': 150,  // 1 space per 150 sq m
      'mixed_use': 75,    // 1 space per 75 sq m
      'institutional': 80 // 1 space per 80 sq m
    };
    return parkingRatios[zoningType] || 100;
  }
}

// Get road network data
router.get('/roads', async (req, res, next) => {
  try {
    const { bbox, limit = 100 } = req.query;
    
    let whereClause = '';
    let queryParams = [limit];
    
    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);
      whereClause = `WHERE ST_Intersects(geometry, ST_MakeEnvelope($2, $3, $4, $5, 4326))`;
      queryParams = [limit, minLng, minLat, maxLng, maxLat];
    }

    const result = await query(`
      SELECT 
        id, name, road_type, width, speed_limit,
        ST_AsGeoJSON(geometry) as geojson
      FROM roads
      ${whereClause}
      ORDER BY name
      LIMIT $1
    `, queryParams);

    res.status(200).json({
      status: 'success',
      results: result.rows.length,
      data: {
        roads: result.rows.map(row => ({
          ...row,
          geometry: JSON.parse(row.geojson)
        }))
      }
    });

  } catch (error) {
    logger.error('Get roads error:', error);
    next(error);
  }
});

// Get land use data
router.get('/landuse', async (req, res, next) => {
  try {
    const { bbox, use_type, limit = 100 } = req.query;
    
    let whereClause = '';
    let queryParams = [limit];
    let paramCount = 1;
    
    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);
      whereClause = `WHERE ST_Intersects(geometry, ST_MakeEnvelope($${++paramCount}, $${++paramCount}, $${++paramCount}, $${++paramCount}, 4326))`;
      queryParams.push(minLng, minLat, maxLng, maxLat);
    }
    
    if (use_type) {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += `use_type = $${++paramCount}`;
      queryParams.push(use_type);
    }

    const result = await query(`
      SELECT 
        id, use_type, description,
        ST_AsGeoJSON(geometry) as geojson,
        ST_Area(ST_Transform(geometry, 3857)) as area_sqm
      FROM land_use
      ${whereClause}
      ORDER BY use_type
      LIMIT $1
    `, queryParams);

    res.status(200).json({
      status: 'success',
      results: result.rows.length,
      data: {
        land_use: result.rows.map(row => ({
          ...row,
          geometry: JSON.parse(row.geojson)
        }))
      }
    });

  } catch (error) {
    logger.error('Get land use error:', error);
    next(error);
  }
});

// Create buffer around geometry
router.post('/buffer', async (req, res, next) => {
  try {
    const { geometry, radius, unit = 'meters' } = req.body;

    if (!geometry || !radius) {
      return next(new AppError('Geometry and radius are required', 400));
    }

    // Convert radius to appropriate units
    let radiusInKm = radius;
    if (unit === 'meters') {
      radiusInKm = radius / 1000;
    } else if (unit === 'feet') {
      radiusInKm = radius * 0.0003048;
    }

    const buffered = turf.buffer(geometry, radiusInKm, { units: 'kilometers' });

    res.status(200).json({
      status: 'success',
      data: {
        original_geometry: geometry,
        buffered_geometry: buffered,
        radius: radius,
        unit: unit
      }
    });

  } catch (error) {
    logger.error('Buffer creation error:', error);
    next(error);
  }
});

// Find intersecting features
router.post('/intersect', async (req, res, next) => {
  try {
    const { geometry, layer_type = 'zoning_layers' } = req.body;

    if (!geometry) {
      return next(new AppError('Geometry is required', 400));
    }

    // Convert GeoJSON to WKT
    const coordinates = geometry.coordinates[0];
    const wktCoords = coordinates.map(coord => `${coord[0]} ${coord[1]}`).join(', ');
    const wkt = `POLYGON((${wktCoords}))`;

    const result = await spatialQuery(wkt, layer_type);

    res.status(200).json({
      status: 'success',
      results: result.rows.length,
      data: {
        intersecting_features: result.rows
      }
    });

  } catch (error) {
    logger.error('Intersection analysis error:', error);
    next(error);
  }
});

// Advanced GIS validation endpoint
router.post('/validate-advanced/:projectId', async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const gisEngine = new GISValidationEngine();

    // Get project data
    const projectResult = await query(`
      SELECT 
        p.*,
        ST_AsGeoJSON(p.project_area) as project_area_geojson
      FROM projects p
      WHERE p.id = $1
    `, [projectId]);

    if (projectResult.rows.length === 0) {
      return next(new AppError('Project not found', 404));
    }

    const project = projectResult.rows[0];

    if (!project.project_area_geojson) {
      return next(new AppError('Project must have a defined area', 400));
    }

    const projectGeometry = JSON.parse(project.project_area_geojson);

    // Get applicable zoning rules
    const zoningResult = await query(`
      SELECT z.*
      FROM zoning_layers z, projects p
      WHERE p.id = $1 AND ST_Intersects(z.geometry, p.project_area)
    `, [projectId]);

    if (zoningResult.rows.length === 0) {
      return next(new AppError('No applicable zoning found', 400));
    }

    const zoningRules = zoningResult.rows;

    // Run comprehensive validation
    const validationResults = [];

    // 1. FAR validation
    const farViolations = gisEngine.validateFAR(project, zoningRules);
    validationResults.push(...farViolations);

    // 2. Road width to height validation
    if (project.proposed_building_height) {
      const roadHeightViolations = await gisEngine.validateRoadWidthToHeight(
        projectGeometry, 
        project.proposed_building_height
      );
      validationResults.push(...roadHeightViolations);
    }

    // 3. Infrastructure distance validation
    const infrastructureViolations = await gisEngine.validateInfrastructureDistances(projectGeometry);
    validationResults.push(...infrastructureViolations);

    // 4. Open space validation
    const openSpaceViolations = gisEngine.validateOpenSpacePercentage(project, zoningRules);
    validationResults.push(...openSpaceViolations);

    // 5. Enhanced parking validation
    const parkingViolations = gisEngine.validateParkingRequirements(project, zoningRules);
    validationResults.push(...parkingViolations);

    // 6. Get elevation data for the project
    const centroid = turf.centroid(projectGeometry);
    const elevation = await gisEngine.getElevationData(centroid.geometry.coordinates);

    // Calculate summary
    const totalRules = validationResults.length;
    const compliantRules = validationResults.filter(r => r.is_compliant).length;
    const errorCount = validationResults.filter(r => r.severity === 'error' && !r.is_compliant).length;
    const warningCount = validationResults.filter(r => r.severity === 'warning' && !r.is_compliant).length;

    res.status(200).json({
      status: 'success',
      data: {
        project_id: projectId,
        validation_summary: {
          total_rules: totalRules,
          compliant_rules: compliantRules,
          compliance_percentage: Math.round((compliantRules / totalRules) * 100),
          error_count: errorCount,
          warning_count: warningCount,
          overall_compliant: errorCount === 0
        },
        site_analysis: {
          elevation: elevation,
          project_area_sqm: turf.area(projectGeometry),
          perimeter_m: turf.length(turf.polygon(projectGeometry.coordinates), { units: 'meters' }),
          centroid: centroid.geometry.coordinates
        },
        validation_results: validationResults,
        applicable_zoning: zoningRules
      }
    });

  } catch (error) {
    logger.error('Advanced GIS validation error:', error);
    next(error);
  }
});

// Load shapefile rules
router.post('/load-shapefile', async (req, res, next) => {
  try {
    const { shapefile_path } = req.body;
    const gisEngine = new GISValidationEngine();

    const rules = await gisEngine.loadShapefileRules(shapefile_path);

    res.status(200).json({
      status: 'success',
      data: {
        loaded_rules: rules,
        count: rules.length
      }
    });

  } catch (error) {
    logger.error('Shapefile loading error:', error);
    next(error);
  }
});

// Get elevation for coordinates
router.get('/elevation/:lng/:lat', async (req, res, next) => {
  try {
    const lng = parseFloat(req.params.lng);
    const lat = parseFloat(req.params.lat);

    if (isNaN(lng) || isNaN(lat)) {
      return next(new AppError('Invalid coordinates', 400));
    }

    const gisEngine = new GISValidationEngine();
    const elevation = await gisEngine.getElevationData([lng, lat]);

    res.status(200).json({
      status: 'success',
      data: {
        coordinates: [lng, lat],
        elevation: elevation,
        unit: 'meters'
      }
    });

  } catch (error) {
    logger.error('Elevation query error:', error);
    next(error);
  }
});

module.exports = router;