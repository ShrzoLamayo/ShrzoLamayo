import os
import uuid
import aiofiles
from fastapi import UploadFile
from typing import Optional
import mimetypes
from pathlib import Path

async def save_upload_file(upload_file: UploadFile, project_id: int, document_type: str) -> str:
    """Save uploaded file to disk and return file path"""
    
    # Create upload directory
    upload_dir = os.path.join("uploads", str(project_id), document_type)
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = Path(upload_file.filename).suffix
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        content = await upload_file.read()
        await f.write(content)
    
    return file_path

def validate_file_type(filename: str, allowed_types: list) -> bool:
    """Validate uploaded file type"""
    file_extension = Path(filename).suffix.lower()
    return file_extension in allowed_types

def get_file_size(file_path: str) -> int:
    """Get file size in bytes"""
    try:
        return os.path.getsize(file_path)
    except OSError:
        return 0

def validate_coordinates(lat: float, lon: float) -> bool:
    """Validate latitude and longitude coordinates"""
    return -90 <= lat <= 90 and -180 <= lon <= 180

def validate_survey_number(survey_number: str) -> bool:
    """Validate survey number format"""
    # Basic validation - can be enhanced based on specific requirements
    return len(survey_number.strip()) >= 3

def validate_patta_number(patta_number: str) -> bool:
    """Validate patta number format"""
    # Basic validation - can be enhanced based on specific requirements
    return len(patta_number.strip()) >= 3

def clean_filename(filename: str) -> str:
    """Clean filename for safe storage"""
    # Remove special characters and spaces
    import re
    filename = re.sub(r'[^\w\s-]', '', filename)
    filename = re.sub(r'[-\s]+', '-', filename)
    return filename.strip('-')

def calculate_area_from_polygon(polygon_geojson: str) -> float:
    """Calculate area from GeoJSON polygon (simplified)"""
    try:
        import json
        from shapely.geometry import shape
        
        polygon_data = json.loads(polygon_geojson)
        polygon = shape(polygon_data)
        
        # Convert to approximate square meters (this is simplified)
        # In production, use proper projection for accurate area calculation
        return abs(polygon.area) * 111320 * 111320  # Very rough approximation
        
    except Exception:
        return 2000.0  # Default demo value

def format_currency(amount: float) -> str:
    """Format currency in Indian Rupees"""
    return f"₹ {amount:,.2f}"

def validate_building_height(height: float, zone: str) -> tuple:
    """Validate building height against zoning rules"""
    height_limits = {
        "R1": 15.0,
        "R2": 18.0,
        "R3": 24.0,
        "C1": 30.0,
        "C2": 50.0
    }
    
    max_height = height_limits.get(zone, 18.0)
    is_valid = height <= max_height
    
    return is_valid, max_height

def calculate_fsi(buildup_area: float, plot_area: float) -> float:
    """Calculate Floor Space Index"""
    if plot_area <= 0:
        return 0.0
    return buildup_area / plot_area

def calculate_coverage(ground_floor_area: float, plot_area: float) -> float:
    """Calculate ground coverage percentage"""
    if plot_area <= 0:
        return 0.0
    return (ground_floor_area / plot_area) * 100

def generate_application_id(project_type: str) -> str:
    """Generate unique application ID"""
    from datetime import datetime
    
    type_prefix = {
        "Residential": "RES",
        "Commercial": "COM",
        "Industrial": "IND",
        "Mixed": "MIX"
    }.get(project_type, "GEN")
    
    year = datetime.now().year
    unique_id = str(uuid.uuid4())[:8].upper()
    
    return f"BP-{type_prefix}-{year}-{unique_id}"

def create_directory_structure(project_id: int):
    """Create directory structure for project files"""
    base_dir = os.path.join("uploads", str(project_id))
    
    subdirs = [
        "documents",
        "drawings", 
        "photos",
        "reports",
        "nocs"
    ]
    
    for subdir in subdirs:
        os.makedirs(os.path.join(base_dir, subdir), exist_ok=True)

def get_mime_type(file_path: str) -> str:
    """Get MIME type of file"""
    mime_type, _ = mimetypes.guess_type(file_path)
    return mime_type or "application/octet-stream"

def is_image_file(filename: str) -> bool:
    """Check if file is an image"""
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'}
    return Path(filename).suffix.lower() in image_extensions

def is_pdf_file(filename: str) -> bool:
    """Check if file is a PDF"""
    return Path(filename).suffix.lower() == '.pdf'

def is_cad_file(filename: str) -> bool:
    """Check if file is a CAD drawing"""
    cad_extensions = {'.dwg', '.dxf', '.dgn'}
    return Path(filename).suffix.lower() in cad_extensions

def validate_project_data(project_data: dict) -> list:
    """Validate project data and return list of errors"""
    errors = []
    
    required_fields = [
        'project_title',
        'project_type', 
        'survey_number',
        'village_taluk_district',
        'patta_number',
        'ec_number'
    ]
    
    for field in required_fields:
        if not project_data.get(field):
            errors.append(f"{field.replace('_', ' ').title()} is required")
    
    # Validate survey number
    if project_data.get('survey_number') and not validate_survey_number(project_data['survey_number']):
        errors.append("Invalid survey number format")
    
    # Validate patta number
    if project_data.get('patta_number') and not validate_patta_number(project_data['patta_number']):
        errors.append("Invalid patta number format")
    
    return errors