from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Project(Base):
    __tablename__ = "projects"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(String, unique=True, index=True)
    
    # 6 Required User Inputs
    project_title = Column(String, nullable=False)
    project_type = Column(String, nullable=False)  # Residential, Commercial, etc.
    survey_number = Column(String, nullable=False)
    village_taluk_district = Column(String, nullable=False)
    patta_number = Column(String, nullable=False)
    ec_number = Column(String, nullable=False)  # Encumbrance Certificate
    
    # Auto-detected GIS & Masterplan Data
    latitude = Column(Float)
    longitude = Column(Float)
    site_boundary_polygon = Column(Text)  # GeoJSON
    proximity_to_water = Column(Float)  # Distance in meters
    elevation = Column(Float)  # From DEM
    google_maps_link = Column(String)
    land_type = Column(String)  # Punjai, Wetland, etc.
    road_width = Column(Float)
    zoning_classification = Column(String)  # R1, R2, C1, etc.
    land_use = Column(String)  # Residential, Commercial, etc.
    crz_zones = Column(String)  # CRZ classification
    floodplain_buffer = Column(Float)  # Distance from flood zone
    
    # Building & Design Details
    number_of_floors = Column(String)  # G+3, etc.
    building_height = Column(Float)
    floor_wise_buildup_area = Column(JSON)  # {floor: area}
    total_buildup_area = Column(Float)
    floor_usage_type = Column(String)
    coverage_percentage = Column(Float)
    fsi_used = Column(Float)
    max_permissible_fsi = Column(Float)
    setbacks = Column(JSON)  # {front, rear, sides}
    number_of_units = Column(Integer)
    balcony_projections = Column(JSON)
    basement_details = Column(JSON)
    lift_staircase_details = Column(JSON)
    refuge_area = Column(JSON)
    parking_provided = Column(JSON)  # {cars, bikes}
    ramp_gradient = Column(Float)
    transformer_room = Column(Boolean)
    waste_room_area = Column(Float)
    rwh_details = Column(JSON)  # Rainwater harvesting
    
    # Utilities & Infrastructure
    water_supply_source = Column(String)
    sewerage_system = Column(String)
    electricity_source = Column(String)
    solar_panel_provision = Column(String)
    power_backup = Column(String)
    firefighting_equipment = Column(JSON)
    utilities = Column(JSON)
    
    # Status & Compliance
    status = Column(String, default="DRAFT")  # DRAFT, SUBMITTED, APPROVED, REJECTED
    compliance_status = Column(String)  # PASSED, FAILED, PENDING
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    submitted_at = Column(DateTime)
    
    # Relationships
    compliance_checks = relationship("ComplianceCheck", back_populates="project")
    documents = relationship("Document", back_populates="project")

class ComplianceCheck(Base):
    __tablename__ = "compliance_checks"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    
    rule_name = Column(String, nullable=False)
    status = Column(String, nullable=False)  # PASSED, FAILED, WARNING
    message = Column(Text)
    value = Column(Float)  # Actual value
    threshold = Column(Float)  # Required threshold
    
    checked_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="compliance_checks")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    
    document_type = Column(String, nullable=False)  # EC, DRAWINGS, PHOTOS, NOC, etc.
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer)
    
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="documents")

class ZoningRule(Base):
    __tablename__ = "zoning_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    zone_type = Column(String, nullable=False)  # R1, R2, C1, etc.
    road_width = Column(Float, nullable=False)
    
    max_fsi = Column(Float, nullable=False)
    max_coverage = Column(Float, nullable=False)
    min_front_setback = Column(Float, nullable=False)
    min_rear_setback = Column(Float, nullable=False)
    min_side_setback = Column(Float, nullable=False)
    max_height = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)