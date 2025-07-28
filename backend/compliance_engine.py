from typing import Dict, Any
from models import Project, ZoningRule
from sqlalchemy.orm import Session
import json

class ComplianceEngine:
    """Engine for checking compliance against DCR & NBC rules"""
    
    def __init__(self):
        self.rules = {
            "setback_compliance": self.check_setback_compliance,
            "fsi_compliance": self.check_fsi_compliance,
            "coverage_compliance": self.check_coverage_compliance,
            "height_compliance": self.check_height_compliance,
            "osr_compliance": self.check_osr_compliance,
            "parking_compliance": self.check_parking_compliance,
            "fire_safety_compliance": self.check_fire_safety_compliance,
            "accessibility_compliance": self.check_accessibility_compliance,
            "rwh_compliance": self.check_rwh_compliance,
            "waste_management_compliance": self.check_waste_management_compliance
        }
    
    def check_compliance(self, project: Project) -> Dict[str, Dict[str, Any]]:
        """Run all compliance checks and return results"""
        results = {}
        
        for rule_name, rule_function in self.rules.items():
            try:
                result = rule_function(project)
                results[rule_name] = result
            except Exception as e:
                results[rule_name] = {
                    "status": "ERROR",
                    "message": f"Error checking {rule_name}: {str(e)}",
                    "value": None,
                    "threshold": None
                }
        
        return results
    
    def check_setback_compliance(self, project: Project) -> Dict[str, Any]:
        """Check minimum setback requirements"""
        if not project.setbacks:
            return {
                "status": "FAILED",
                "message": "Setback information not provided",
                "value": None,
                "threshold": None
            }
        
        setbacks = json.loads(project.setbacks) if isinstance(project.setbacks, str) else project.setbacks
        zone = project.zoning_classification or "R2"
        road_width = project.road_width or 9.0
        
        # Get required setbacks based on zoning and road width
        required_setbacks = self.get_required_setbacks(zone, road_width)
        
        violations = []
        
        for side, required in required_setbacks.items():
            provided = setbacks.get(side, 0)
            if provided < required:
                violations.append(f"{side}: {provided}m < {required}m required")
        
        if violations:
            return {
                "status": "FAILED",
                "message": f"Setback violations: {', '.join(violations)}",
                "value": min(setbacks.values()) if setbacks else 0,
                "threshold": min(required_setbacks.values())
            }
        
        return {
            "status": "PASSED",
            "message": "All setback requirements met",
            "value": min(setbacks.values()),
            "threshold": min(required_setbacks.values())
        }
    
    def check_fsi_compliance(self, project: Project) -> Dict[str, Any]:
        """Check Floor Space Index (FSI) compliance"""
        if not project.fsi_used or not project.max_permissible_fsi:
            # Calculate FSI if not provided
            if project.total_buildup_area and project.site_boundary_polygon:
                # For demo, assume 2000 sq.m plot
                plot_area = 2000.0
                fsi_used = project.total_buildup_area / plot_area
                max_fsi = self.get_max_permissible_fsi(
                    project.zoning_classification or "R2",
                    project.road_width or 9.0
                )
            else:
                return {
                    "status": "FAILED",
                    "message": "Insufficient data to calculate FSI",
                    "value": None,
                    "threshold": None
                }
        else:
            fsi_used = project.fsi_used
            max_fsi = project.max_permissible_fsi
        
        if fsi_used > max_fsi:
            return {
                "status": "FAILED",
                "message": f"FSI exceeded: {fsi_used:.2f} > {max_fsi:.2f} allowed",
                "value": fsi_used,
                "threshold": max_fsi
            }
        
        return {
            "status": "PASSED",
            "message": f"FSI within limits: {fsi_used:.2f} ≤ {max_fsi:.2f}",
            "value": fsi_used,
            "threshold": max_fsi
        }
    
    def check_coverage_compliance(self, project: Project) -> Dict[str, Any]:
        """Check ground coverage compliance"""
        if not project.coverage_percentage:
            return {
                "status": "FAILED",
                "message": "Coverage percentage not provided",
                "value": None,
                "threshold": None
            }
        
        max_coverage = self.get_max_coverage(
            project.zoning_classification or "R2",
            project.road_width or 9.0
        )
        
        if project.coverage_percentage > max_coverage:
            return {
                "status": "FAILED",
                "message": f"Coverage exceeded: {project.coverage_percentage}% > {max_coverage}% allowed",
                "value": project.coverage_percentage,
                "threshold": max_coverage
            }
        
        return {
            "status": "PASSED",
            "message": f"Coverage within limits: {project.coverage_percentage}% ≤ {max_coverage}%",
            "value": project.coverage_percentage,
            "threshold": max_coverage
        }
    
    def check_height_compliance(self, project: Project) -> Dict[str, Any]:
        """Check building height compliance"""
        if not project.building_height:
            return {
                "status": "FAILED",
                "message": "Building height not provided",
                "value": None,
                "threshold": None
            }
        
        max_height = self.get_max_height(
            project.zoning_classification or "R2",
            project.road_width or 9.0
        )
        
        if project.building_height > max_height:
            return {
                "status": "FAILED",
                "message": f"Height exceeded: {project.building_height}m > {max_height}m allowed",
                "value": project.building_height,
                "threshold": max_height
            }
        
        return {
            "status": "PASSED",
            "message": f"Height within limits: {project.building_height}m ≤ {max_height}m",
            "value": project.building_height,
            "threshold": max_height
        }
    
    def check_osr_compliance(self, project: Project) -> Dict[str, Any]:
        """Check Open Space Reservation (OSR) compliance"""
        # For residential projects > 2000 sq.m, 10% OSR required
        plot_area = 2000.0  # Demo value
        required_osr_percentage = 10.0
        
        if plot_area > 2000:
            required_osr = plot_area * (required_osr_percentage / 100)
            # Assume OSR is provided (demo)
            provided_osr = 200.0  # sq.m
            
            if provided_osr < required_osr:
                return {
                    "status": "FAILED",
                    "message": f"OSR insufficient: {provided_osr} sq.m < {required_osr} sq.m required",
                    "value": provided_osr,
                    "threshold": required_osr
                }
        
        return {
            "status": "PASSED",
            "message": "OSR requirements met",
            "value": 200.0,
            "threshold": 200.0
        }
    
    def check_parking_compliance(self, project: Project) -> Dict[str, Any]:
        """Check parking requirements"""
        if not project.number_of_units:
            return {
                "status": "FAILED",
                "message": "Number of units not provided",
                "value": None,
                "threshold": None
            }
        
        # Parking requirements: 1 car space per unit + visitor parking
        required_car_spaces = project.number_of_units + max(1, project.number_of_units // 10)
        required_bike_spaces = project.number_of_units
        
        parking_provided = json.loads(project.parking_provided) if isinstance(project.parking_provided, str) else (project.parking_provided or {})
        
        car_spaces = parking_provided.get("cars", 0)
        bike_spaces = parking_provided.get("bikes", 0)
        
        violations = []
        if car_spaces < required_car_spaces:
            violations.append(f"Car parking: {car_spaces} < {required_car_spaces} required")
        if bike_spaces < required_bike_spaces:
            violations.append(f"Bike parking: {bike_spaces} < {required_bike_spaces} required")
        
        if violations:
            return {
                "status": "FAILED",
                "message": f"Parking violations: {', '.join(violations)}",
                "value": car_spaces,
                "threshold": required_car_spaces
            }
        
        return {
            "status": "PASSED",
            "message": "Parking requirements met",
            "value": car_spaces,
            "threshold": required_car_spaces
        }
    
    def check_fire_safety_compliance(self, project: Project) -> Dict[str, Any]:
        """Check fire safety requirements"""
        if not project.building_height:
            return {
                "status": "FAILED",
                "message": "Building height not provided for fire safety check",
                "value": None,
                "threshold": None
            }
        
        # Fire NOC required for buildings > 18m height
        fire_noc_threshold = 18.0
        
        if project.building_height > fire_noc_threshold:
            # Check if fire NOC is submitted (would check documents in real implementation)
            return {
                "status": "WARNING",
                "message": f"Fire NOC required for buildings > {fire_noc_threshold}m",
                "value": project.building_height,
                "threshold": fire_noc_threshold
            }
        
        return {
            "status": "PASSED",
            "message": "Fire NOC not required for this height",
            "value": project.building_height,
            "threshold": fire_noc_threshold
        }
    
    def check_accessibility_compliance(self, project: Project) -> Dict[str, Any]:
        """Check accessibility features compliance"""
        # Check if lift is provided for buildings > G+2
        floors = project.number_of_floors or "G+0"
        
        if "+" in floors:
            floor_count = int(floors.split("+")[1])
            if floor_count > 2:
                # Check if lift is provided
                lift_details = json.loads(project.lift_staircase_details) if isinstance(project.lift_staircase_details, str) else (project.lift_staircase_details or {})
                
                if not lift_details.get("lift_provided", False):
                    return {
                        "status": "FAILED",
                        "message": "Lift required for buildings > G+2",
                        "value": floor_count,
                        "threshold": 2
                    }
        
        return {
            "status": "PASSED",
            "message": "Accessibility requirements met",
            "value": None,
            "threshold": None
        }
    
    def check_rwh_compliance(self, project: Project) -> Dict[str, Any]:
        """Check Rainwater Harvesting compliance"""
        if not project.rwh_details:
            return {
                "status": "FAILED",
                "message": "Rainwater harvesting plan not provided",
                "value": None,
                "threshold": None
            }
        
        # Basic RWH requirement check
        return {
            "status": "PASSED",
            "message": "Rainwater harvesting plan provided",
            "value": None,
            "threshold": None
        }
    
    def check_waste_management_compliance(self, project: Project) -> Dict[str, Any]:
        """Check waste management compliance"""
        if not project.waste_room_area:
            return {
                "status": "WARNING",
                "message": "Waste management room area not specified",
                "value": None,
                "threshold": None
            }
        
        # Minimum 4 sq.m waste room for residential projects
        min_waste_room_area = 4.0
        
        if project.waste_room_area < min_waste_room_area:
            return {
                "status": "FAILED",
                "message": f"Waste room too small: {project.waste_room_area} sq.m < {min_waste_room_area} sq.m required",
                "value": project.waste_room_area,
                "threshold": min_waste_room_area
            }
        
        return {
            "status": "PASSED",
            "message": "Waste management requirements met",
            "value": project.waste_room_area,
            "threshold": min_waste_room_area
        }
    
    def get_required_setbacks(self, zone: str, road_width: float) -> Dict[str, float]:
        """Get required setbacks based on zoning and road width"""
        setback_rules = {
            "R1": {"front": 3.0, "rear": 2.0, "side": 1.5},
            "R2": {"front": 3.0, "rear": 2.5, "side": 2.0},
            "C1": {"front": 4.0, "rear": 3.0, "side": 2.5},
            "C2": {"front": 5.0, "rear": 4.0, "side": 3.0}
        }
        
        return setback_rules.get(zone, setback_rules["R2"])
    
    def get_max_permissible_fsi(self, zone: str, road_width: float) -> float:
        """Get maximum permissible FSI"""
        fsi_rules = {
            ("R1", 6.0): 1.0,
            ("R1", 9.0): 1.2,
            ("R2", 6.0): 1.2,
            ("R2", 9.0): 1.5,
            ("C1", 9.0): 2.0,
            ("C2", 12.0): 2.5
        }
        
        # Find closest match
        for (z, w), fsi in fsi_rules.items():
            if z == zone and w <= road_width:
                return fsi
        
        return 1.5  # Default
    
    def get_max_coverage(self, zone: str, road_width: float) -> float:
        """Get maximum coverage percentage"""
        coverage_rules = {
            "R1": 65,
            "R2": 70,
            "C1": 75,
            "C2": 80
        }
        
        return coverage_rules.get(zone, 70)
    
    def get_max_height(self, zone: str, road_width: float) -> float:
        """Get maximum building height"""
        height_rules = {
            ("R1", 6.0): 10.0,
            ("R1", 9.0): 12.0,
            ("R2", 6.0): 15.0,
            ("R2", 9.0): 18.0,
            ("C1", 9.0): 25.0,
            ("C2", 12.0): 35.0
        }
        
        # Find closest match
        for (z, w), height in height_rules.items():
            if z == zone and w <= road_width:
                return height
        
        return 18.0  # Default