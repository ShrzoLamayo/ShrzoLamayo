const express = require('express');
const { query, transaction } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// Validation rules engine
class ZoningValidator {
  constructor(project, zoningLayers) {
    this.project = project;
    this.zoningLayers = zoningLayers;
    this.violations = [];
  }

  async validateAll() {
    await this.validateHeight();
    await this.validateFloorAreaRatio();
    await this.validateSetbacks();
    await this.validateLotCoverage();
    await this.validateParkingSpaces();
    
    return this.violations;
  }

  validateHeight() {
    for (const zoning of this.zoningLayers) {
      if (zoning.max_height && this.project.proposed_building_height) {
        if (this.project.proposed_building_height > zoning.max_height) {
          this.violations.push({
            rule_name: 'Building Height',
            rule_description: `Maximum building height in ${zoning.zoning_code} zone`,
            is_compliant: false,
            actual_value: this.project.proposed_building_height,
            required_value: zoning.max_height,
            violation_details: `Proposed height of ${this.project.proposed_building_height}m exceeds maximum allowed height of ${zoning.max_height}m in ${zoning.zoning_code} zone`,
            severity: 'error'
          });
        } else {
          this.violations.push({
            rule_name: 'Building Height',
            rule_description: `Maximum building height in ${zoning.zoning_code} zone`,
            is_compliant: true,
            actual_value: this.project.proposed_building_height,
            required_value: zoning.max_height,
            violation_details: null,
            severity: 'info'
          });
        }
      }
    }
  }

  validateFloorAreaRatio() {
    if (!this.project.lot_size || !this.project.proposed_floor_area) {
      return;
    }

    const actualFAR = this.project.proposed_floor_area / this.project.lot_size;

    for (const zoning of this.zoningLayers) {
      if (zoning.max_floor_area_ratio) {
        if (actualFAR > zoning.max_floor_area_ratio) {
          this.violations.push({
            rule_name: 'Floor Area Ratio',
            rule_description: `Maximum FAR in ${zoning.zoning_code} zone`,
            is_compliant: false,
            actual_value: actualFAR,
            required_value: zoning.max_floor_area_ratio,
            violation_details: `Proposed FAR of ${actualFAR.toFixed(2)} exceeds maximum allowed FAR of ${zoning.max_floor_area_ratio} in ${zoning.zoning_code} zone`,
            severity: 'error'
          });
        } else {
          this.violations.push({
            rule_name: 'Floor Area Ratio',
            rule_description: `Maximum FAR in ${zoning.zoning_code} zone`,
            is_compliant: true,
            actual_value: actualFAR,
            required_value: zoning.max_floor_area_ratio,
            violation_details: null,
            severity: 'info'
          });
        }
      }
    }
  }

  validateSetbacks() {
    // For now, this is a simplified validation
    // In a real system, you would need to calculate actual setbacks from property boundaries
    for (const zoning of this.zoningLayers) {
      if (zoning.min_front_setback) {
        // Assuming we have setback data in the project (simplified)
        const estimatedFrontSetback = this.project.lot_size ? Math.sqrt(this.project.lot_size) * 0.1 : 10;
        
        if (estimatedFrontSetback < zoning.min_front_setback) {
          this.violations.push({
            rule_name: 'Front Setback',
            rule_description: `Minimum front setback in ${zoning.zoning_code} zone`,
            is_compliant: false,
            actual_value: estimatedFrontSetback,
            required_value: zoning.min_front_setback,
            violation_details: `Estimated front setback of ${estimatedFrontSetback.toFixed(2)}m is less than required ${zoning.min_front_setback}m`,
            severity: 'warning'
          });
        } else {
          this.violations.push({
            rule_name: 'Front Setback',
            rule_description: `Minimum front setback in ${zoning.zoning_code} zone`,
            is_compliant: true,
            actual_value: estimatedFrontSetback,
            required_value: zoning.min_front_setback,
            violation_details: null,
            severity: 'info'
          });
        }
      }
    }
  }

  validateLotCoverage() {
    if (!this.project.lot_size || !this.project.proposed_floor_area) {
      return;
    }

    // Simplified: assuming building footprint is floor area divided by number of floors
    const estimatedFootprint = this.project.proposed_floor_area / 2; // Assume 2 floors
    const lotCoverage = estimatedFootprint / this.project.lot_size;

    for (const zoning of this.zoningLayers) {
      if (zoning.max_lot_coverage) {
        if (lotCoverage > zoning.max_lot_coverage) {
          this.violations.push({
            rule_name: 'Lot Coverage',
            rule_description: `Maximum lot coverage in ${zoning.zoning_code} zone`,
            is_compliant: false,
            actual_value: lotCoverage,
            required_value: zoning.max_lot_coverage,
            violation_details: `Estimated lot coverage of ${(lotCoverage * 100).toFixed(1)}% exceeds maximum allowed ${(zoning.max_lot_coverage * 100)}%`,
            severity: 'error'
          });
        } else {
          this.violations.push({
            rule_name: 'Lot Coverage',
            rule_description: `Maximum lot coverage in ${zoning.zoning_code} zone`,
            is_compliant: true,
            actual_value: lotCoverage,
            required_value: zoning.max_lot_coverage,
            violation_details: null,
            severity: 'info'
          });
        }
      }
    }
  }

  validateParkingSpaces() {
    for (const zoning of this.zoningLayers) {
      if (zoning.min_parking_spaces && this.project.proposed_parking_spaces !== null) {
        if (this.project.proposed_parking_spaces < zoning.min_parking_spaces) {
          this.violations.push({
            rule_name: 'Parking Spaces',
            rule_description: `Minimum parking spaces in ${zoning.zoning_code} zone`,
            is_compliant: false,
            actual_value: this.project.proposed_parking_spaces,
            required_value: zoning.min_parking_spaces,
            violation_details: `Proposed ${this.project.proposed_parking_spaces} parking spaces is less than required ${zoning.min_parking_spaces}`,
            severity: 'error'
          });
        } else {
          this.violations.push({
            rule_name: 'Parking Spaces',
            rule_description: `Minimum parking spaces in ${zoning.zoning_code} zone`,
            is_compliant: true,
            actual_value: this.project.proposed_parking_spaces,
            required_value: zoning.min_parking_spaces,
            violation_details: null,
            severity: 'info'
          });
        }
      }
    }
  }
}

// Run validation for a project
router.post('/validate/:projectId', async (req, res, next) => {
  try {
    const projectId = req.params.projectId;

    // Check if user has access to this project
    let whereClause = 'WHERE p.id = $1';
    let queryParams = [projectId];
    
    if (req.user.role !== 'admin') {
      whereClause += ' AND p.user_id = $2';
      queryParams.push(req.user.id);
    }

    // Get project details
    const projectResult = await query(`
      SELECT 
        p.*,
        ST_AsGeoJSON(p.project_area) as project_area_geojson
      FROM projects p
      ${whereClause}
    `, queryParams);

    if (projectResult.rows.length === 0) {
      return next(new AppError('Project not found or access denied', 404));
    }

    const project = projectResult.rows[0];

    if (!project.project_area_geojson) {
      return next(new AppError('Project must have a defined area for validation', 400));
    }

    // Get applicable zoning layers
    const zoningResult = await query(`
      SELECT 
        z.*,
        ST_Area(ST_Intersection(z.geometry, p.project_area)) / ST_Area(p.project_area) as coverage_ratio
      FROM zoning_layers z, projects p
      WHERE p.id = $1 
        AND ST_Intersects(z.geometry, p.project_area)
      ORDER BY coverage_ratio DESC
    `, [projectId]);

    if (zoningResult.rows.length === 0) {
      return next(new AppError('No applicable zoning found for this project area', 400));
    }

    // Run validation
    const validator = new ZoningValidator(project, zoningResult.rows);
    const violations = await validator.validateAll();

    // Save validation results in database
    await transaction(async (client) => {
      // Clear previous validation results
      await client.query(
        'DELETE FROM validation_results WHERE project_id = $1',
        [projectId]
      );

      // Insert new validation results
      for (const violation of violations) {
        await client.query(`
          INSERT INTO validation_results (
            project_id, rule_name, rule_description, is_compliant,
            actual_value, required_value, violation_details, severity
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          projectId,
          violation.rule_name,
          violation.rule_description,
          violation.is_compliant,
          violation.actual_value,
          violation.required_value,
          violation.violation_details,
          violation.severity
        ]);
      }
    });

    // Calculate compliance summary
    const totalRules = violations.length;
    const compliantRules = violations.filter(v => v.is_compliant).length;
    const errorCount = violations.filter(v => v.severity === 'error' && !v.is_compliant).length;
    const warningCount = violations.filter(v => v.severity === 'warning' && !v.is_compliant).length;

    const compliancePercentage = totalRules > 0 ? (compliantRules / totalRules) * 100 : 0;

    res.status(200).json({
      status: 'success',
      data: {
        project_id: projectId,
        validation_summary: {
          total_rules: totalRules,
          compliant_rules: compliantRules,
          compliance_percentage: Math.round(compliancePercentage),
          error_count: errorCount,
          warning_count: warningCount,
          overall_compliant: errorCount === 0
        },
        applicable_zoning: zoningResult.rows,
        validation_results: violations
      }
    });
  } catch (error) {
    logger.error('Validation error:', error);
    next(error);
  }
});

// Get validation results for a project
router.get('/results/:projectId', async (req, res, next) => {
  try {
    const projectId = req.params.projectId;

    // Check if user has access to this project
    let whereClause = 'WHERE p.id = $1';
    let queryParams = [projectId];
    
    if (req.user.role !== 'admin') {
      whereClause += ' AND p.user_id = $2';
      queryParams.push(req.user.id);
    }

    const projectCheck = await query(`
      SELECT id FROM projects p ${whereClause}
    `, queryParams);

    if (projectCheck.rows.length === 0) {
      return next(new AppError('Project not found or access denied', 404));
    }

    // Get validation results
    const result = await query(`
      SELECT * FROM validation_results 
      WHERE project_id = $1 
      ORDER BY 
        CASE severity 
          WHEN 'error' THEN 1 
          WHEN 'warning' THEN 2 
          WHEN 'info' THEN 3 
        END,
        rule_name
    `, [projectId]);

    // Calculate summary
    const violations = result.rows;
    const totalRules = violations.length;
    const compliantRules = violations.filter(v => v.is_compliant).length;
    const errorCount = violations.filter(v => v.severity === 'error' && !v.is_compliant).length;
    const warningCount = violations.filter(v => v.severity === 'warning' && !v.is_compliant).length;

    const compliancePercentage = totalRules > 0 ? (compliantRules / totalRules) * 100 : 0;

    res.status(200).json({
      status: 'success',
      data: {
        project_id: projectId,
        validation_summary: {
          total_rules: totalRules,
          compliant_rules: compliantRules,
          compliance_percentage: Math.round(compliancePercentage),
          error_count: errorCount,
          warning_count: warningCount,
          overall_compliant: errorCount === 0
        },
        validation_results: violations
      }
    });
  } catch (error) {
    logger.error('Get validation results error:', error);
    next(error);
  }
});

// Get all validation results with filters
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const severity = req.query.severity;
    const isCompliant = req.query.compliant;

    let whereClause = '';
    let queryParams = [limit, offset];
    let paramCount = 2;

    if (req.user.role !== 'admin') {
      whereClause = 'WHERE p.user_id = $3';
      queryParams.push(req.user.id);
      paramCount++;
    }

    if (severity) {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += `vr.severity = $${++paramCount}`;
      queryParams.push(severity);
    }

    if (isCompliant !== undefined) {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += `vr.is_compliant = $${++paramCount}`;
      queryParams.push(isCompliant === 'true');
    }

    const result = await query(`
      SELECT 
        vr.*,
        p.name as project_name,
        p.address as project_address,
        u.first_name || ' ' || u.last_name as owner_name
      FROM validation_results vr
      JOIN projects p ON vr.project_id = p.id
      JOIN users u ON p.user_id = u.id
      ${whereClause}
      ORDER BY vr.created_at DESC
      LIMIT $1 OFFSET $2
    `, queryParams);

    res.status(200).json({
      status: 'success',
      results: result.rows.length,
      pagination: {
        page,
        limit
      },
      data: {
        validation_results: result.rows
      }
    });
  } catch (error) {
    logger.error('Get validation results error:', error);
    next(error);
  }
});

module.exports = router;