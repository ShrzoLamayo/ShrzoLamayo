import requests
import json
from typing import Dict, Optional, Tuple
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import os
from dotenv import load_dotenv

load_dotenv()

class GISService:
    """GIS service for spatial analysis and data extraction"""
    
    def __init__(self):
        self.mapbox_token = os.getenv("MAPBOX_TOKEN", "")
        self.geolocator = Nominatim(user_agent="building_plan_approval")
        
        # Sample data for demonstration - in production, these would come from actual GIS layers
        self.sample_zones = {
            "coimbatore": {
                "zoning": "R2",
                "land_use": "Residential",
                "elevation_range": (400, 450),
                "water_bodies": [
                    {"name": "Noyyal River", "lat": 11.0246, "lon": 77.0011},
                    {"name": "Ukkadam Lake", "lat": 11.0183, "lon": 77.0408}
                ]
            },
            "chennai": {
                "zoning": "R1",
                "land_use": "Residential",
                "elevation_range": (5, 20),
                "water_bodies": [
                    {"name": "Cooum River", "lat": 13.0827, "lon": 80.2707},
                    {"name": "Adyar River", "lat": 13.0067, "lon": 80.2492}
                ]
            }
        }
    
    async def analyze_location(self, location_string: str) -> Dict:
        """
        Perform comprehensive GIS analysis for the given location
        Auto-detects: coordinates, elevation, zoning, land use, CRZ, flood zones, etc.
        """
        try:
            # Geocode the location
            coordinates = await self.geocode_location(location_string)
            if not coordinates:
                raise Exception(f"Could not geocode location: {location_string}")
            
            lat, lon = coordinates
            
            # Get elevation data
            elevation = await self.get_elevation(lat, lon)
            
            # Determine city/region for zone lookup
            city = self.get_city_from_location(location_string.lower())
            zone_info = self.sample_zones.get(city, self.sample_zones["coimbatore"])
            
            # Calculate proximity to water bodies
            proximity_to_water = self.calculate_water_proximity(lat, lon, zone_info["water_bodies"])
            
            # Generate site boundary polygon (sample - in production, this would be drawn by user)
            site_boundary = self.generate_sample_polygon(lat, lon)
            
            # Determine road width (simulated - in production, from vector tiles)
            road_width = self.estimate_road_width(lat, lon)
            
            gis_data = {
                "latitude": lat,
                "longitude": lon,
                "elevation": elevation,
                "site_boundary_polygon": site_boundary,
                "proximity_to_water": proximity_to_water,
                "google_maps_link": f"https://maps.google.com/?q={lat},{lon}",
                "land_type": self.determine_land_type(elevation),
                "road_width": road_width,
                "zoning_classification": zone_info["zoning"],
                "land_use": zone_info["land_use"],
                "crz_zones": self.check_crz_classification(lat, lon, proximity_to_water),
                "floodplain_buffer": self.calculate_floodplain_distance(lat, lon)
            }
            
            return gis_data
            
        except Exception as e:
            raise Exception(f"GIS analysis failed: {str(e)}")
    
    async def geocode_location(self, location: str) -> Optional[Tuple[float, float]]:
        """Convert location string to coordinates"""
        try:
            location_data = self.geolocator.geocode(location)
            if location_data:
                return (location_data.latitude, location_data.longitude)
            return None
        except Exception:
            return None
    
    async def get_elevation(self, lat: float, lon: float) -> float:
        """Get elevation data from DEM (Digital Elevation Model)"""
        # In production, this would query actual DEM services
        # For now, returning simulated elevation based on location
        if 10.0 < lat < 12.0 and 76.0 < lon < 78.0:  # Coimbatore region
            return 420.0 + (lat - 11.0) * 10  # Simulated elevation
        elif 12.5 < lat < 13.5 and 79.5 < lon < 80.5:  # Chennai region
            return 15.0 + (lat - 13.0) * 5
        else:
            return 100.0  # Default elevation
    
    def get_city_from_location(self, location: str) -> str:
        """Extract city from location string"""
        if "coimbatore" in location:
            return "coimbatore"
        elif "chennai" in location:
            return "chennai"
        else:
            return "coimbatore"  # Default
    
    def calculate_water_proximity(self, lat: float, lon: float, water_bodies: list) -> float:
        """Calculate distance to nearest water body"""
        min_distance = float('inf')
        
        for water_body in water_bodies:
            distance = geodesic((lat, lon), (water_body["lat"], water_body["lon"])).meters
            min_distance = min(min_distance, distance)
        
        return round(min_distance, 2)
    
    def generate_sample_polygon(self, lat: float, lon: float) -> str:
        """Generate a sample site boundary polygon (GeoJSON)"""
        # Sample 50m x 40m rectangular plot
        offset_lat = 0.00045  # ~50m
        offset_lon = 0.00036  # ~40m
        
        polygon = {
            "type": "Polygon",
            "coordinates": [[
                [lon - offset_lon/2, lat - offset_lat/2],
                [lon + offset_lon/2, lat - offset_lat/2],
                [lon + offset_lon/2, lat + offset_lat/2],
                [lon - offset_lon/2, lat + offset_lat/2],
                [lon - offset_lon/2, lat - offset_lat/2]
            ]]
        }
        
        return json.dumps(polygon)
    
    def estimate_road_width(self, lat: float, lon: float) -> float:
        """Estimate road width (simulated - in production, from vector data)"""
        # Simulate road width based on location type
        return 9.0  # Default 9m road width
    
    def determine_land_type(self, elevation: float) -> str:
        """Determine land type based on elevation and other factors"""
        if elevation < 50:
            return "Wetland"
        elif elevation < 200:
            return "Nanjai (Wet Land)"
        else:
            return "Punjai (Dry Land)"
    
    def check_crz_classification(self, lat: float, lon: float, water_distance: float) -> str:
        """Check Coastal Regulation Zone classification"""
        # Simplified CRZ check - in production, would use actual CRZ boundaries
        if water_distance < 500:
            if self.is_coastal_area(lat, lon):
                return "CRZ-II"
            else:
                return "Water Buffer Zone"
        return "No CRZ"
    
    def is_coastal_area(self, lat: float, lon: float) -> bool:
        """Check if location is in coastal area"""
        # Chennai coast
        if 12.5 < lat < 13.5 and 80.0 < lon < 80.5:
            return True
        return False
    
    def calculate_floodplain_distance(self, lat: float, lon: float) -> float:
        """Calculate distance to nearest floodplain"""
        # Simulated floodplain calculation
        return 75.0  # Default 75m from flood zone
    
    async def get_mapbox_static_image(self, lat: float, lon: float, zoom: int = 15) -> str:
        """Generate Mapbox static image URL"""
        if not self.mapbox_token:
            return f"https://maps.google.com/maps?q={lat},{lon}&z={zoom}"
        
        return f"https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/pin-s+ff0000({lon},{lat})/{lon},{lat},{zoom}/600x400@2x?access_token={self.mapbox_token}"