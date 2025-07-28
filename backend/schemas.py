from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
from datetime import datetime

class ProjectCreate(BaseModel):
    """Schema for creating a new project - only 6 required fields"""
    project_title: str = Field(..., description="Project name/title")
    project_type: str = Field(..., description="Residential, Commercial, Industrial, etc.")
    survey_number: str = Field(..., description="Survey number from revenue records")
    village_taluk_district: str = Field(..., description="Village/Taluk/District location")
    patta_number: str = Field(..., description="Patta number from land records")
    ec_number: str = Field(..., description="Encumbrance Certificate number")

class ProjectResponse(BaseModel):
    """Schema for project response"""
    id: int
    application_id: str
    project_title: str
    project_type: str
    survey_number: str
    village_taluk_district: str
    patta_number: str
    ec_number: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class GISData(BaseModel):
    """Schema for GIS analysis results"""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    elevation: Optional[float] = None
    site_boundary_polygon: Optional[str] = None
    proximity_to_water: Optional[float] = None
    land_type: Optional[str] = None
    road_width: Optional[float] = None
    zoning_classification: Optional[str] = None
    land_use: Optional[str] = None
    crz_zones: Optional[str] = None
    floodplain_buffer: Optional[float] = None
    google_maps_link: Optional[str] = None

class BuildingDetails(BaseModel):
    """Schema for building design details"""
    number_of_floors: Optional[str] = None
    building_height: Optional[float] = None
    floor_wise_buildup_area: Optional[Dict[str, float]] = None
    total_buildup_area: Optional[float] = None
    floor_usage_type: Optional[str] = None
    coverage_percentage: Optional[float] = None
    fsi_used: Optional[float] = None
    setbacks: Optional[Dict[str, float]] = None
    number_of_units: Optional[int] = None
    balcony_projections: Optional[Dict[str, Any]] = None
    basement_details: Optional[Dict[str, Any]] = None
    lift_staircase_details: Optional[Dict[str, Any]] = None
    parking_provided: Optional[Dict[str, int]] = None
    utilities: Optional[Dict[str, Any]] = None

class ComplianceResult(BaseModel):
    """Schema for individual compliance check result"""
    rule_name: str
    status: str  # PASSED, FAILED, WARNING
    message: str
    value: Optional[float] = None
    threshold: Optional[float] = None

class ComplianceResults(BaseModel):
    """Schema for all compliance check results"""
    project_id: int
    overall_status: str
    results: List[ComplianceResult]
    checked_at: datetime

class DocumentUpload(BaseModel):
    """Schema for document upload response"""
    document_id: int
    document_type: str
    file_name: str
    file_path: str
    status: str

class ProjectSummary(BaseModel):
    """Schema for project summary with all auto-computed fields"""
    # User Inputs (6 fields)
    project_title: str
    project_type: str
    survey_number: str
    village_taluk_district: str
    patta_number: str
    ec_number: str
    
    # Auto-detected GIS Data
    gis_data: Optional[GISData] = None
    
    # Building Details
    building_details: Optional[BuildingDetails] = None
    
    # Compliance Status
    compliance_status: Optional[str] = None
    compliance_results: Optional[List[ComplianceResult]] = None
    
    # Generated Outputs
    application_id: str
    status: str
    created_at: datetime
    submitted_at: Optional[datetime] = None

class SubmissionResponse(BaseModel):
    """Schema for project submission response"""
    application_id: str
    status: str
    submission_date: datetime
    cmda_reference: Optional[str] = None
    pdf_report_url: Optional[str] = None
    gis_boundary_file_url: Optional[str] = None
    form1_pdf_url: Optional[str] = None