const express = require('express');
const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { getCache, setCache } = require('../config/redis');
const turf = require('@turf/turf');
const logger = require('../utils/logger');

const router = express.Router();

// AI Recommendation Engine
class AIRecommendationEngine {
  constructor() {
    this.modelWeights = {
      farOptimization: 0.3,
      heightOptimization: 0.25,
      parkingOptimization: 0.2,
      openSpaceOptimization: 0.15,
      economicViability: 0.1
    };
  }

  // Predict ideal building volume/height based on lot characteristics
  async predictOptimalBuilding(projectData, zoningRules) {
    const recommendations = [];

    try {
      // Get the most restrictive zoning rule
      const primaryZoning = zoningRules.reduce((prev, current) => {
        return (prev.coverage_ratio > current.coverage_ratio) ? prev : current;
      });

      // Calculate optimal FAR utilization (aim for 85% of maximum)
      const targetFARUtilization = 0.85;
      const optimalFAR = primaryZoning.max_floor_area_ratio * targetFARUtilization;
      const optimalFloorArea = projectData.lot_size * optimalFAR;

      // Calculate optimal height based on efficiency
      const optimalHeight = Math.min(
        primaryZoning.max_height * 0.9, // 90% of max height
        this.calculateOptimalHeightByEfficiency(projectData.lot_size, optimalFloorArea)
      );

      // Calculate optimal building footprint
      const optimalFootprint = optimalFloorArea / Math.ceil(optimalHeight / 3.5); // Assume 3.5m floor height
      const buildingCoverage = (optimalFootprint / projectData.lot_size) * 100;

      recommendations.push({
        type: 'BUILDING_OPTIMIZATION',
        category: 'volume_height',
        confidence: 0.87,
        recommendation: {
          optimal_height: Math.round(optimalHeight * 10) / 10,
          optimal_floor_area: Math.round(optimalFloorArea),
          optimal_footprint: Math.round(optimalFootprint),
          building_coverage: Math.round(buildingCoverage * 10) / 10,
          estimated_floors: Math.ceil(optimalHeight / 3.5),
          far_utilization: Math.round(optimalFAR * 100) / 100
        },
        reasoning: [
          `Maximizes FAR utilization at ${(targetFARUtilization * 100)}% of allowable`,
          `Optimal height balances buildability and zoning constraints`,
          `Building coverage of ${buildingCoverage.toFixed(1)}% allows adequate open space`
        ],
        economic_impact: {
          estimated_cost_per_sqm: this.estimateCostPerSqm(optimalHeight, primaryZoning.zoning_type),
          development_efficiency: this.calculateDevelopmentEfficiency(optimalFAR, primaryZoning.max_floor_area_ratio),
          market_value_multiplier: this.estimateMarketValue(optimalHeight, primaryZoning.zoning_type)
        }
      });

      return recommendations;
    } catch (error) {
      logger.error('Building optimization error:', error);
      return [];
    }
  }

  // Flag potential violations and suggest fixes
  async flagViolationsAndSuggestFixes(projectData, zoningRules, validationResults) {
    const suggestions = [];

    try {
      // Analyze each violation and provide specific recommendations
      const violations = validationResults.filter(r => !r.is_compliant && r.severity === 'error');

      for (const violation of violations) {
        switch (violation.rule_type) {
          case 'FAR':
            suggestions.push(...this.suggestFARFixes(violation, projectData, zoningRules));
            break;
          case 'PARKING':
            suggestions.push(...this.suggestParkingFixes(violation, projectData, zoningRules));
            break;
          case 'OPEN_SPACE':
            suggestions.push(...this.suggestOpenSpaceFixes(violation, projectData, zoningRules));
            break;
          case 'ROAD_WIDTH_HEIGHT':
            suggestions.push(...this.suggestHeightFixes(violation, projectData, zoningRules));
            break;
          case 'Building Height':
            suggestions.push(...this.suggestHeightReductionFixes(violation, projectData, zoningRules));
            break;
        }
      }

      return suggestions;
    } catch (error) {
      logger.error('Violation analysis error:', error);
      return [];
    }
  }

  // Suggest alternative layouts
  async suggestAlternativeLayouts(projectData, zoningRules) {
    const layouts = [];

    try {
      const primaryZoning = zoningRules[0];

      // Layout Option 1: Maximum FAR Utilization
      const maxFARLayout = this.generateMaxFARLayout(projectData, primaryZoning);
      layouts.push(maxFARLayout);

      // Layout Option 2: Optimal Open Space
      const openSpaceLayout = this.generateOpenSpaceOptimizedLayout(projectData, primaryZoning);
      layouts.push(openSpaceLayout);

      // Layout Option 3: Height-Optimized (Low-rise, high coverage)
      const lowRiseLayout = this.generateLowRiseLayout(projectData, primaryZoning);
      layouts.push(lowRiseLayout);

      // Layout Option 4: Sustainable/Green Building
      const greenLayout = this.generateGreenBuildingLayout(projectData, primaryZoning);
      layouts.push(greenLayout);

      return layouts;
    } catch (error) {
      logger.error('Layout generation error:', error);
      return [];
    }
  }

  // Calculate development cost estimation
  calculateDevelopmentCost(projectData, zoningRules) {
    const primaryZoning = zoningRules[0];
    const baseCostPerSqm = this.getBaseCostPerSqm(primaryZoning.zoning_type);
    
    // Cost factors
    const heightFactor = this.getHeightCostFactor(projectData.proposed_building_height);
    const complexityFactor = this.getComplexityFactor(projectData.lot_size);
    const locationFactor = 1.0; // Could be enhanced with location-based pricing
    
    const totalCostPerSqm = baseCostPerSqm * heightFactor * complexityFactor * locationFactor;
    const totalDevelopmentCost = totalCostPerSqm * projectData.proposed_floor_area;

    return {
      base_cost_per_sqm: baseCostPerSqm,
      adjusted_cost_per_sqm: Math.round(totalCostPerSqm),
      total_development_cost: Math.round(totalDevelopmentCost),
      cost_factors: {
        height_factor: heightFactor,
        complexity_factor: complexityFactor,
        location_factor: locationFactor
      },
      cost_breakdown: {
        construction: Math.round(totalDevelopmentCost * 0.7),
        permits_fees: Math.round(totalDevelopmentCost * 0.05),
        professional_services: Math.round(totalDevelopmentCost * 0.15),
        contingency: Math.round(totalDevelopmentCost * 0.1)
      }
    };
  }

  // Risk assessment based on zoning compliance
  assessDevelopmentRisk(validationResults, projectData) {
    let riskScore = 0;
    const riskFactors = [];

    // Calculate risk based on violations
    const errorCount = validationResults.filter(r => !r.is_compliant && r.severity === 'error').length;
    const warningCount = validationResults.filter(r => !r.is_compliant && r.severity === 'warning').length;

    riskScore += errorCount * 25; // High impact for errors
    riskScore += warningCount * 10; // Medium impact for warnings

    if (errorCount > 0) {
      riskFactors.push({
        factor: 'Zoning Violations',
        impact: 'High',
        description: `${errorCount} critical zoning violations that may prevent approval`
      });
    }

    if (warningCount > 0) {
      riskFactors.push({
        factor: 'Compliance Warnings',
        impact: 'Medium',
        description: `${warningCount} warnings that may require additional documentation`
      });
    }

    // Additional risk factors
    if (projectData.proposed_building_height > 50) {
      riskScore += 15;
      riskFactors.push({
        factor: 'High-rise Construction',
        impact: 'Medium',
        description: 'Tall buildings require additional structural and safety considerations'
      });
    }

    if (projectData.lot_size < 500) {
      riskScore += 10;
      riskFactors.push({
        factor: 'Small Lot Size',
        impact: 'Low',
        description: 'Limited development options due to small lot size'
      });
    }

    const riskLevel = riskScore <= 20 ? 'Low' : riskScore <= 50 ? 'Medium' : 'High';

    return {
      risk_score: riskScore,
      risk_level: riskLevel,
      risk_factors: riskFactors,
      recommendations: this.getRiskMitigationRecommendations(riskLevel, riskFactors)
    };
  }

  // Helper methods for specific violation fixes
  suggestFARFixes(violation, projectData, zoningRules) {
    const suggestions = [];
    const excessFAR = violation.actual_value - violation.required_value;
    const excessArea = excessFAR * projectData.lot_size;

    suggestions.push({
      type: 'VIOLATION_FIX',
      violation_type: 'FAR',
      priority: 'high',
      confidence: 0.9,
      suggestion: {
        action: 'Reduce Floor Area',
        description: `Reduce total floor area by ${Math.round(excessArea)} sq m`,
        options: [
          {
            option: 'Reduce building height',
            impact: `Remove ${Math.ceil(excessArea / (projectData.lot_size * 0.6))} floors`,
            trade_offs: 'Lower development density, reduced revenue potential'
          },
          {
            option: 'Reduce building footprint',
            impact: `Reduce footprint by ${Math.round(excessArea / 4)} sq m (assuming 4 floors)`,
            trade_offs: 'More open space, potentially better design flexibility'
          }
        ]
      }
    });

    return suggestions;
  }

  suggestParkingFixes(violation, projectData, zoningRules) {
    const suggestions = [];
    const shortage = violation.required_value - violation.actual_value;

    suggestions.push({
      type: 'VIOLATION_FIX',
      violation_type: 'PARKING',
      priority: 'medium',
      confidence: 0.85,
      suggestion: {
        action: 'Increase Parking Provision',
        description: `Add ${shortage} additional parking spaces`,
        options: [
          {
            option: 'Underground parking',
            impact: `Excavate for ${shortage} spaces (≈${shortage * 25} sq m)`,
            trade_offs: 'Higher cost, preserves ground-level open space'
          },
          {
            option: 'Multi-level parking structure',
            impact: `Dedicate ${Math.ceil(shortage / 2)} sq m per level`,
            trade_offs: 'Reduces developable area, lower excavation cost'
          },
          {
            option: 'Reduce floor area',
            impact: `Reduce by ${shortage * 75} sq m to lower parking requirement`,
            trade_offs: 'Reduced development potential, easier approval'
          }
        ]
      }
    });

    return suggestions;
  }

  suggestOpenSpaceFixes(violation, projectData, zoningRules) {
    const suggestions = [];
    const shortfall = violation.required_value - violation.actual_value;
    const additionalSpaceNeeded = (shortfall / 100) * projectData.lot_size;

    suggestions.push({
      type: 'VIOLATION_FIX',
      violation_type: 'OPEN_SPACE',
      priority: 'high',
      confidence: 0.88,
      suggestion: {
        action: 'Increase Open Space',
        description: `Add ${Math.round(additionalSpaceNeeded)} sq m of open space`,
        options: [
          {
            option: 'Reduce building footprint',
            impact: `Smaller building footprint by ${Math.round(additionalSpaceNeeded)} sq m`,
            trade_offs: 'Potentially taller building, same total floor area'
          },
          {
            option: 'Green roof implementation',
            impact: 'Convert roof area to accessible green space',
            trade_offs: 'Additional cost, enhanced building value'
          },
          {
            option: 'Podium design with landscaping',
            impact: 'Create elevated open spaces above parking',
            trade_offs: 'Complex design, higher construction cost'
          }
        ]
      }
    });

    return suggestions;
  }

  suggestHeightFixes(violation, projectData, zoningRules) {
    return [{
      type: 'VIOLATION_FIX',
      violation_type: 'ROAD_WIDTH_HEIGHT',
      priority: 'medium',
      confidence: 0.8,
      suggestion: {
        action: 'Adjust Building Height',
        description: `Reduce height to ${violation.required_value}m or increase setback from road`,
        options: [
          {
            option: 'Reduce building height',
            impact: `Lower by ${Math.round(violation.actual_value - violation.required_value)}m`,
            trade_offs: 'Reduced floor area, simpler approval process'
          },
          {
            option: 'Increase setback from road',
            impact: 'Move building further from road frontage',
            trade_offs: 'Less efficient land use, better streetscape'
          }
        ]
      }
    }];
  }

  suggestHeightReductionFixes(violation, projectData, zoningRules) {
    return [{
      type: 'VIOLATION_FIX',
      violation_type: 'HEIGHT',
      priority: 'high',
      confidence: 0.95,
      suggestion: {
        action: 'Reduce Building Height',
        description: `Reduce height from ${violation.actual_value}m to ${violation.required_value}m`,
        options: [
          {
            option: 'Remove floors',
            impact: `Remove ${Math.ceil((violation.actual_value - violation.required_value) / 3.5)} floors`,
            trade_offs: 'Reduced development potential'
          },
          {
            option: 'Reduce floor-to-floor height',
            impact: 'Optimize structural design for lower ceiling heights',
            trade_offs: 'Potential impact on building functionality'
          }
        ]
      }
    }];
  }

  // Layout generation methods
  generateMaxFARLayout(projectData, zoning) {
    const maxFloorArea = projectData.lot_size * zoning.max_floor_area_ratio;
    const optimalHeight = Math.min(zoning.max_height, maxFloorArea / (projectData.lot_size * 0.4));

    return {
      layout_type: 'Maximum FAR Utilization',
      description: 'Maximizes allowable floor area for highest development potential',
      confidence: 0.85,
      specifications: {
        floor_area: Math.round(maxFloorArea),
        building_height: Math.round(optimalHeight * 10) / 10,
        building_footprint: Math.round(maxFloorArea / Math.ceil(optimalHeight / 3.5)),
        open_space_percentage: Math.round((1 - (maxFloorArea / Math.ceil(optimalHeight / 3.5)) / projectData.lot_size) * 100),
        estimated_floors: Math.ceil(optimalHeight / 3.5)
      },
      advantages: [
        'Maximum development potential',
        'Highest revenue generation',
        'Efficient land use'
      ],
      disadvantages: [
        'Minimal open space',
        'Higher construction complexity',
        'Potential neighborhood impact'
      ]
    };
  }

  generateOpenSpaceOptimizedLayout(projectData, zoning) {
    const targetOpenSpace = 40; // 40% open space
    const maxFootprint = projectData.lot_size * (1 - targetOpenSpace / 100);
    const floorArea = Math.min(
      projectData.lot_size * zoning.max_floor_area_ratio * 0.8,
      maxFootprint * 5 // Max 5 floors
    );

    return {
      layout_type: 'Open Space Optimized',
      description: 'Prioritizes green space and community areas',
      confidence: 0.8,
      specifications: {
        floor_area: Math.round(floorArea),
        building_height: Math.min(zoning.max_height * 0.6, 17.5), // Max 5 floors
        building_footprint: Math.round(maxFootprint),
        open_space_percentage: targetOpenSpace,
        estimated_floors: Math.ceil(floorArea / maxFootprint)
      },
      advantages: [
        'Abundant green space',
        'Better community integration',
        'Enhanced livability'
      ],
      disadvantages: [
        'Lower development density',
        'Reduced revenue potential',
        'Higher cost per unit'
      ]
    };
  }

  generateLowRiseLayout(projectData, zoning) {
    const maxHeight = Math.min(zoning.max_height * 0.4, 14); // Max 4 floors
    const maxFootprint = projectData.lot_size * 0.7;
    const floorArea = maxFootprint * Math.ceil(maxHeight / 3.5);

    return {
      layout_type: 'Low-Rise High Coverage',
      description: 'Lower building with higher ground coverage',
      confidence: 0.75,
      specifications: {
        floor_area: Math.round(floorArea),
        building_height: maxHeight,
        building_footprint: Math.round(maxFootprint),
        open_space_percentage: 30,
        estimated_floors: Math.ceil(maxHeight / 3.5)
      },
      advantages: [
        'Lower construction cost',
        'Better accessibility',
        'Simpler approvals'
      ],
      disadvantages: [
        'Less efficient land use',
        'Higher site coverage',
        'Limited views'
      ]
    };
  }

  generateGreenBuildingLayout(projectData, zoning) {
    const sustainableFloorArea = projectData.lot_size * zoning.max_floor_area_ratio * 0.75;
    const greenHeight = Math.min(zoning.max_height * 0.8, 28); // 8 floors max
    const greenFootprint = sustainableFloorArea / Math.ceil(greenHeight / 3.5);

    return {
      layout_type: 'Sustainable/Green Building',
      description: 'Environmentally optimized design with green features',
      confidence: 0.82,
      specifications: {
        floor_area: Math.round(sustainableFloorArea),
        building_height: Math.round(greenHeight * 10) / 10,
        building_footprint: Math.round(greenFootprint),
        open_space_percentage: 35,
        estimated_floors: Math.ceil(greenHeight / 3.5),
        green_features: [
          'Green roof system',
          'Rainwater harvesting',
          'Solar panel integration',
          'Natural ventilation'
        ]
      },
      advantages: [
        'Environmental benefits',
        'Energy efficiency',
        'Higher market value',
        'Potential tax incentives'
      ],
      disadvantages: [
        'Higher initial cost',
        'Complex building systems',
        'Longer approval process'
      ]
    };
  }

  // Utility methods
  calculateOptimalHeightByEfficiency(lotSize, floorArea) {
    // Efficiency curve peaks around 6-8 floors for most building types
    const optimalFloors = lotSize > 2000 ? 8 : lotSize > 1000 ? 6 : 4;
    return optimalFloors * 3.5;
  }

  estimateCostPerSqm(height, zoningType) {
    const baseCosts = {
      'residential': 1200,
      'commercial': 1500,
      'industrial': 800,
      'mixed_use': 1350
    };
    
    const baseCost = baseCosts[zoningType] || 1200;
    const heightFactor = height > 30 ? 1.3 : height > 15 ? 1.15 : 1.0;
    
    return Math.round(baseCost * heightFactor);
  }

  calculateDevelopmentEfficiency(actualFAR, maxFAR) {
    return Math.round((actualFAR / maxFAR) * 100);
  }

  estimateMarketValue(height, zoningType) {
    const baseMultipliers = {
      'residential': 1.2,
      'commercial': 1.5,
      'industrial': 0.9,
      'mixed_use': 1.35
    };
    
    const baseMultiplier = baseMultipliers[zoningType] || 1.2;
    const heightBonus = height > 20 ? 0.1 : 0;
    
    return baseMultiplier + heightBonus;
  }

  getBaseCostPerSqm(zoningType) {
    const baseCosts = {
      'residential': 1200,
      'commercial': 1500,
      'industrial': 800,
      'mixed_use': 1350,
      'institutional': 1400
    };
    return baseCosts[zoningType] || 1200;
  }

  getHeightCostFactor(height) {
    if (height <= 15) return 1.0;
    if (height <= 30) return 1.15;
    if (height <= 50) return 1.3;
    return 1.5;
  }

  getComplexityFactor(lotSize) {
    if (lotSize < 500) return 1.1; // Small lots are more complex
    if (lotSize > 5000) return 1.05; // Large lots have economies of scale
    return 1.0;
  }

  getRiskMitigationRecommendations(riskLevel, riskFactors) {
    const recommendations = [];

    if (riskLevel === 'High') {
      recommendations.push('Consider significant design modifications to address violations');
      recommendations.push('Engage with planning authorities early in the process');
      recommendations.push('Obtain professional planning consultation');
    } else if (riskLevel === 'Medium') {
      recommendations.push('Address warning items before submission');
      recommendations.push('Prepare detailed justification for any variances');
    } else {
      recommendations.push('Proceed with confidence - low risk of approval issues');
    }

    return recommendations;
  }
}

// Get AI recommendations for a project
router.post('/recommend/:projectId', async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const aiEngine = new AIRecommendationEngine();

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

    // Get zoning rules
    const zoningResult = await query(`
      SELECT z.*,
        ST_Area(ST_Intersection(z.geometry, p.project_area)) / ST_Area(p.project_area) as coverage_ratio
      FROM zoning_layers z, projects p
      WHERE p.id = $1 AND ST_Intersects(z.geometry, p.project_area)
      ORDER BY coverage_ratio DESC
    `, [projectId]);

    if (zoningResult.rows.length === 0) {
      return next(new AppError('No applicable zoning found', 400));
    }

    // Get existing validation results
    const validationResult = await query(
      'SELECT * FROM validation_results WHERE project_id = $1',
      [projectId]
    );

    const zoningRules = zoningResult.rows;
    const validationResults = validationResult.rows;

    // Generate AI recommendations
    const buildingOptimization = await aiEngine.predictOptimalBuilding(project, zoningRules);
    const violationFixes = await aiEngine.flagViolationsAndSuggestFixes(project, zoningRules, validationResults);
    const alternativeLayouts = await aiEngine.suggestAlternativeLayouts(project, zoningRules);
    const costEstimation = aiEngine.calculateDevelopmentCost(project, zoningRules);
    const riskAssessment = aiEngine.assessDevelopmentRisk(validationResults, project);

    res.status(200).json({
      status: 'success',
      data: {
        project_id: projectId,
        ai_recommendations: {
          building_optimization: buildingOptimization,
          violation_fixes: violationFixes,
          alternative_layouts: alternativeLayouts,
          cost_estimation: costEstimation,
          risk_assessment: riskAssessment
        },
        generated_at: new Date().toISOString(),
        confidence_score: 0.85
      }
    });

  } catch (error) {
    logger.error('AI recommendation error:', error);
    next(error);
  }
});

// Get building optimization suggestions
router.post('/optimize/:projectId', async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const { optimization_goals = ['far', 'cost', 'compliance'] } = req.body;
    
    const aiEngine = new AIRecommendationEngine();

    // Get project and zoning data
    const projectResult = await query(`
      SELECT p.*, ST_AsGeoJSON(p.project_area) as project_area_geojson
      FROM projects p WHERE p.id = $1
    `, [projectId]);

    const zoningResult = await query(`
      SELECT z.* FROM zoning_layers z, projects p
      WHERE p.id = $1 AND ST_Intersects(z.geometry, p.project_area)
    `, [projectId]);

    if (projectResult.rows.length === 0 || zoningResult.rows.length === 0) {
      return next(new AppError('Project or zoning data not found', 404));
    }

    const project = projectResult.rows[0];
    const zoningRules = zoningResult.rows;

    // Generate optimized recommendations based on goals
    const optimizations = await aiEngine.predictOptimalBuilding(project, zoningRules);

    res.status(200).json({
      status: 'success',
      data: {
        project_id: projectId,
        optimization_goals: optimization_goals,
        optimized_recommendations: optimizations
      }
    });

  } catch (error) {
    logger.error('Building optimization error:', error);
    next(error);
  }
});

// Analyze market feasibility
router.post('/market-analysis/:projectId', async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const aiEngine = new AIRecommendationEngine();

    // Get project data
    const projectResult = await query(`
      SELECT p.* FROM projects p WHERE p.id = $1
    `, [projectId]);

    if (projectResult.rows.length === 0) {
      return next(new AppError('Project not found', 404));
    }

    const project = projectResult.rows[0];

    // Simplified market analysis
    const marketAnalysis = {
      market_segment: this.determineMarketSegment(project),
      demand_indicators: {
        high_demand_area: true, // Would be based on real market data
        price_trend: 'stable',
        supply_level: 'moderate'
      },
      revenue_projection: {
        estimated_revenue_per_sqm: this.getMarketRatePerSqm(project),
        total_revenue_potential: project.proposed_floor_area * this.getMarketRatePerSqm(project),
        breakeven_timeline: '18-24 months'
      },
      risk_factors: [
        'Market volatility',
        'Construction cost inflation',
        'Regulatory changes'
      ]
    };

    res.status(200).json({
      status: 'success',
      data: {
        project_id: projectId,
        market_analysis: marketAnalysis
      }
    });

  } catch (error) {
    logger.error('Market analysis error:', error);
    next(error);
  }
});

// Utility methods for market analysis
function determineMarketSegment(project) {
  // Simplified logic - would be enhanced with real market data
  if (project.proposed_floor_area > 5000) return 'commercial';
  if (project.proposed_building_height > 30) return 'luxury_residential';
  return 'mid_market_residential';
}

function getMarketRatePerSqm(project) {
  // Simplified pricing - would integrate with real market data APIs
  const baseRates = {
    'commercial': 3500,
    'luxury_residential': 4500,
    'mid_market_residential': 2800
  };
  
  const segment = determineMarketSegment(project);
  return baseRates[segment] || 3000;
}

module.exports = router;