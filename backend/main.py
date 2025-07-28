from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import os
from datetime import datetime
import uuid

from database import get_db, engine
from models import Base, Project, ComplianceCheck, Document
from schemas import ProjectCreate, ProjectResponse, ComplianceResult
from gis_service import GISService
from compliance_engine import ComplianceEngine
from document_generator import DocumentGenerator
from utils import save_upload_file

app = FastAPI(title="Building Plan Approval System", version="1.0.0")

# Create tables
Base.metadata.create_all(bind=engine)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
gis_service = GISService()
compliance_engine = ComplianceEngine()
document_generator = DocumentGenerator()

@app.get("/")
async def root():
    return {"message": "Building Plan Approval System API"}

@app.post("/api/projects", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new building plan project with the 6 required user inputs"""
    
    # Generate unique application ID
    app_id = f"BP-{project.project_type[:3].upper()}-{datetime.now().strftime('%Y')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Create project in database
    db_project = Project(
        application_id=app_id,
        project_title=project.project_title,
        project_type=project.project_type,
        survey_number=project.survey_number,
        village_taluk_district=project.village_taluk_district,
        patta_number=project.patta_number,
        ec_number=project.ec_number,
        created_at=datetime.utcnow(),
        status="DRAFT"
    )
    
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    return ProjectResponse(
        id=db_project.id,
        application_id=app_id,
        project_title=project.project_title,
        project_type=project.project_type,
        survey_number=project.survey_number,
        village_taluk_district=project.village_taluk_district,
        patta_number=project.patta_number,
        ec_number=project.ec_number,
        status="DRAFT",
        created_at=db_project.created_at
    )

@app.post("/api/projects/{project_id}/gis-analysis")
async def perform_gis_analysis(project_id: int, db: Session = Depends(get_db)):
    """Auto-detect GIS and masterplan data for the project"""
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        # Perform GIS analysis
        gis_data = await gis_service.analyze_location(project.village_taluk_district)
        
        # Update project with GIS data
        project.latitude = gis_data.get("latitude")
        project.longitude = gis_data.get("longitude")
        project.elevation = gis_data.get("elevation")
        project.land_type = gis_data.get("land_type")
        project.road_width = gis_data.get("road_width")
        project.zoning_classification = gis_data.get("zoning")
        project.land_use = gis_data.get("land_use")
        project.crz_zones = gis_data.get("crz_zones")
        project.proximity_to_water = gis_data.get("proximity_to_water")
        project.floodplain_buffer = gis_data.get("floodplain_buffer")
        
        db.commit()
        
        return {
            "status": "success",
            "gis_data": gis_data,
            "message": "GIS analysis completed successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GIS analysis failed: {str(e)}")

@app.post("/api/projects/{project_id}/building-details")
async def update_building_details(
    project_id: int,
    building_data: dict,
    db: Session = Depends(get_db)
):
    """Update building and design details"""
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update building details
    project.number_of_floors = building_data.get("number_of_floors")
    project.building_height = building_data.get("building_height")
    project.total_buildup_area = building_data.get("total_buildup_area")
    project.floor_usage_type = building_data.get("floor_usage_type")
    project.coverage_percentage = building_data.get("coverage_percentage")
    project.fsi_used = building_data.get("fsi_used")
    project.setbacks = json.dumps(building_data.get("setbacks", {}))
    project.number_of_units = building_data.get("number_of_units")
    project.parking_provided = json.dumps(building_data.get("parking_provided", {}))
    project.utilities = json.dumps(building_data.get("utilities", {}))
    
    db.commit()
    
    return {"status": "success", "message": "Building details updated successfully"}

@app.post("/api/projects/{project_id}/compliance-check")
async def run_compliance_check(project_id: int, db: Session = Depends(get_db)):
    """Run automated compliance checks against DCR & NBC rules"""
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        # Run compliance checks
        compliance_results = compliance_engine.check_compliance(project)
        
        # Save compliance results
        for rule_name, result in compliance_results.items():
            compliance_check = ComplianceCheck(
                project_id=project_id,
                rule_name=rule_name,
                status=result["status"],
                message=result["message"],
                value=result.get("value"),
                threshold=result.get("threshold"),
                checked_at=datetime.utcnow()
            )
            db.add(compliance_check)
        
        # Update project status
        all_passed = all(result["status"] == "PASSED" for result in compliance_results.values())
        project.compliance_status = "PASSED" if all_passed else "FAILED"
        
        db.commit()
        
        return {
            "status": "success",
            "compliance_status": project.compliance_status,
            "results": compliance_results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compliance check failed: {str(e)}")

@app.post("/api/projects/{project_id}/documents/upload")
async def upload_document(
    project_id: int,
    file: UploadFile = File(...),
    document_type: str = Form(...),
    db: Session = Depends(get_db)
):
    """Upload project documents (EC, drawings, photos, etc.)"""
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        # Save uploaded file
        file_path = await save_upload_file(file, project_id, document_type)
        
        # Save document record
        document = Document(
            project_id=project_id,
            document_type=document_type,
            file_name=file.filename,
            file_path=file_path,
            uploaded_at=datetime.utcnow()
        )
        db.add(document)
        db.commit()
        
        return {
            "status": "success",
            "document_id": document.id,
            "file_path": file_path,
            "message": f"{document_type} uploaded successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document upload failed: {str(e)}")

@app.post("/api/projects/{project_id}/generate-report")
async def generate_project_report(project_id: int, db: Session = Depends(get_db)):
    """Generate comprehensive PDF report with all project details"""
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        # Generate PDF report
        report_path = document_generator.generate_project_report(project, db)
        
        return {
            "status": "success",
            "report_path": report_path,
            "download_url": f"/api/download/{os.path.basename(report_path)}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

@app.post("/api/projects/{project_id}/submit")
async def submit_project(project_id: int, db: Session = Depends(get_db)):
    """Submit project to CMDA API (simulation)"""
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if all requirements are met
    if project.compliance_status != "PASSED":
        raise HTTPException(status_code=400, detail="Project must pass compliance checks before submission")
    
    # Simulate CMDA submission
    project.status = "SUBMITTED"
    project.submitted_at = datetime.utcnow()
    db.commit()
    
    return {
        "status": "success",
        "application_id": project.application_id,
        "submission_date": project.submitted_at,
        "message": "Project submitted successfully to CMDA"
    }

@app.get("/api/projects/{project_id}")
async def get_project(project_id: int, db: Session = Depends(get_db)):
    """Get complete project details"""
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get compliance checks
    compliance_checks = db.query(ComplianceCheck).filter(
        ComplianceCheck.project_id == project_id
    ).all()
    
    # Get documents
    documents = db.query(Document).filter(Document.project_id == project_id).all()
    
    return {
        "project": project,
        "compliance_checks": compliance_checks,
        "documents": documents
    }

@app.get("/api/download/{filename}")
async def download_file(filename: str):
    """Download generated files"""
    file_path = os.path.join("outputs", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='application/octet-stream'
    )

@app.get("/api/projects")
async def list_projects(db: Session = Depends(get_db)):
    """List all projects"""
    projects = db.query(Project).all()
    return {"projects": projects}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)