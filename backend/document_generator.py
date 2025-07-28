from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from datetime import datetime
import os
import json
from typing import Dict, Any
from models import Project, ComplianceCheck, Document
from sqlalchemy.orm import Session

class DocumentGenerator:
    """Generate PDF reports and documents for building plan approval"""
    
    def __init__(self):
        self.output_dir = "outputs"
        os.makedirs(self.output_dir, exist_ok=True)
        self.styles = getSampleStyleSheet()
        
        # Custom styles
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        self.heading_style = ParagraphStyle(
            'CustomHeading',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=12,
            textColor=colors.darkblue
        )
    
    def generate_project_report(self, project: Project, db: Session) -> str:
        """Generate comprehensive PDF report for the project"""
        
        filename = f"project_report_{project.application_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        filepath = os.path.join(self.output_dir, filename)
        
        doc = SimpleDocTemplate(filepath, pagesize=A4)
        story = []
        
        # Title
        title = Paragraph(f"Building Plan Approval Report<br/>{project.project_title}", self.title_style)
        story.append(title)
        story.append(Spacer(1, 20))
        
        # Project Information Section
        story.append(Paragraph("1. PROJECT INFORMATION", self.heading_style))
        
        project_data = [
            ["Application ID", project.application_id],
            ["Project Title", project.project_title],
            ["Project Type", project.project_type],
            ["Survey Number", project.survey_number],
            ["Location", project.village_taluk_district],
            ["Patta Number", project.patta_number],
            ["EC Number", project.ec_number],
            ["Status", project.status],
            ["Created Date", project.created_at.strftime("%d/%m/%Y") if project.created_at else "N/A"]
        ]
        
        project_table = Table(project_data, colWidths=[2.5*inch, 3.5*inch])
        project_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (1, 0), (1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(project_table)
        story.append(Spacer(1, 20))
        
        # GIS & Location Data Section
        if project.latitude and project.longitude:
            story.append(Paragraph("2. GIS & LOCATION DATA", self.heading_style))
            
            gis_data = [
                ["Latitude", f"{project.latitude:.6f}°"],
                ["Longitude", f"{project.longitude:.6f}°"],
                ["Elevation", f"{project.elevation} m" if project.elevation else "N/A"],
                ["Land Type", project.land_type or "N/A"],
                ["Road Width", f"{project.road_width} m" if project.road_width else "N/A"],
                ["Zoning", project.zoning_classification or "N/A"],
                ["Land Use", project.land_use or "N/A"],
                ["CRZ Classification", project.crz_zones or "No CRZ"],
                ["Water Proximity", f"{project.proximity_to_water} m" if project.proximity_to_water else "N/A"],
                ["Floodplain Distance", f"{project.floodplain_buffer} m" if project.floodplain_buffer else "N/A"]
            ]
            
            gis_table = Table(gis_data, colWidths=[2.5*inch, 3.5*inch])
            gis_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('BACKGROUND', (1, 0), (1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(gis_table)
            story.append(Spacer(1, 20))
        
        # Building Details Section
        if project.building_height:
            story.append(Paragraph("3. BUILDING DETAILS", self.heading_style))
            
            building_data = [
                ["Number of Floors", project.number_of_floors or "N/A"],
                ["Building Height", f"{project.building_height} m" if project.building_height else "N/A"],
                ["Total Built-up Area", f"{project.total_buildup_area} sq.m" if project.total_buildup_area else "N/A"],
                ["Floor Usage", project.floor_usage_type or "N/A"],
                ["Coverage %", f"{project.coverage_percentage}%" if project.coverage_percentage else "N/A"],
                ["FSI Used", f"{project.fsi_used}" if project.fsi_used else "N/A"],
                ["Number of Units", str(project.number_of_units) if project.number_of_units else "N/A"],
                ["Waste Room Area", f"{project.waste_room_area} sq.m" if project.waste_room_area else "N/A"]
            ]
            
            # Add setbacks if available
            if project.setbacks:
                setbacks = json.loads(project.setbacks) if isinstance(project.setbacks, str) else project.setbacks
                setback_text = ", ".join([f"{k}: {v}m" for k, v in setbacks.items()])
                building_data.append(["Setbacks", setback_text])
            
            # Add parking if available
            if project.parking_provided:
                parking = json.loads(project.parking_provided) if isinstance(project.parking_provided, str) else project.parking_provided
                parking_text = ", ".join([f"{k}: {v}" for k, v in parking.items()])
                building_data.append(["Parking", parking_text])
            
            building_table = Table(building_data, colWidths=[2.5*inch, 3.5*inch])
            building_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('BACKGROUND', (1, 0), (1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(building_table)
            story.append(Spacer(1, 20))
        
        # Compliance Results Section
        compliance_checks = db.query(ComplianceCheck).filter(ComplianceCheck.project_id == project.id).all()
        
        if compliance_checks:
            story.append(Paragraph("4. COMPLIANCE CHECK RESULTS", self.heading_style))
            
            compliance_data = [["Rule", "Status", "Details", "Value", "Threshold"]]
            
            for check in compliance_checks:
                status_color = colors.green if check.status == "PASSED" else colors.red if check.status == "FAILED" else colors.orange
                
                compliance_data.append([
                    check.rule_name.replace("_", " ").title(),
                    check.status,
                    check.message[:50] + "..." if len(check.message) > 50 else check.message,
                    str(check.value) if check.value is not None else "N/A",
                    str(check.threshold) if check.threshold is not None else "N/A"
                ])
            
            compliance_table = Table(compliance_data, colWidths=[1.5*inch, 0.8*inch, 2.2*inch, 0.8*inch, 0.8*inch])
            
            # Style the table
            table_style = [
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]
            
            # Color code status column
            for i, check in enumerate(compliance_checks, 1):
                if check.status == "PASSED":
                    table_style.append(('BACKGROUND', (1, i), (1, i), colors.lightgreen))
                elif check.status == "FAILED":
                    table_style.append(('BACKGROUND', (1, i), (1, i), colors.lightcoral))
                else:
                    table_style.append(('BACKGROUND', (1, i), (1, i), colors.lightyellow))
            
            compliance_table.setStyle(TableStyle(table_style))
            story.append(compliance_table)
            story.append(Spacer(1, 20))
        
        # Documents Section
        documents = db.query(Document).filter(Document.project_id == project.id).all()
        
        if documents:
            story.append(Paragraph("5. SUBMITTED DOCUMENTS", self.heading_style))
            
            doc_data = [["Document Type", "File Name", "Upload Date"]]
            
            for doc in documents:
                doc_data.append([
                    doc.document_type,
                    doc.file_name,
                    doc.uploaded_at.strftime("%d/%m/%Y %H:%M") if doc.uploaded_at else "N/A"
                ])
            
            doc_table = Table(doc_data, colWidths=[2*inch, 2.5*inch, 1.5*inch])
            doc_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(doc_table)
            story.append(Spacer(1, 20))
        
        # Summary Section
        story.append(Paragraph("6. SUMMARY & RECOMMENDATIONS", self.heading_style))
        
        overall_status = project.compliance_status or "PENDING"
        status_color = colors.green if overall_status == "PASSED" else colors.red
        
        summary_text = f"""
        <b>Overall Compliance Status:</b> <font color="{status_color.hexval()}">{overall_status}</font><br/><br/>
        
        <b>Application Status:</b> {project.status}<br/><br/>
        
        <b>Generated on:</b> {datetime.now().strftime("%d/%m/%Y at %H:%M:%S")}<br/><br/>
        
        <b>Note:</b> This is an auto-generated report based on the submitted information. 
        Please ensure all compliance issues are resolved before final submission.
        """
        
        story.append(Paragraph(summary_text, self.styles['Normal']))
        
        # Build PDF
        doc.build(story)
        
        return filepath
    
    def generate_cmda_form1(self, project: Project) -> str:
        """Generate CMDA Form-1 (Application for Building Permission)"""
        
        filename = f"cmda_form1_{project.application_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
        filepath = os.path.join(self.output_dir, filename)
        
        doc = SimpleDocTemplate(filepath, pagesize=A4)
        story = []
        
        # Form Header
        header = Paragraph("CHENNAI METROPOLITAN DEVELOPMENT AUTHORITY<br/>APPLICATION FOR BUILDING PERMISSION<br/>(Form-1)", self.title_style)
        story.append(header)
        story.append(Spacer(1, 30))
        
        # Application Details
        form_data = [
            ["Application No.", project.application_id],
            ["Date of Application", datetime.now().strftime("%d/%m/%Y")],
            ["", ""],
            ["1. Name of Applicant", project.project_title],
            ["2. Site Address", project.village_taluk_district],
            ["3. Survey No.", project.survey_number],
            ["4. Patta No.", project.patta_number],
            ["5. Project Type", project.project_type],
            ["6. Proposed Use", project.land_use or "Residential"],
            ["7. Site Area", "2000 sq.m (Demo)"],
            ["8. Built-up Area", f"{project.total_buildup_area} sq.m" if project.total_buildup_area else "N/A"],
            ["9. No. of Floors", project.number_of_floors or "N/A"],
            ["10. Building Height", f"{project.building_height} m" if project.building_height else "N/A"],
            ["11. FSI Proposed", f"{project.fsi_used}" if project.fsi_used else "N/A"],
            ["12. Coverage %", f"{project.coverage_percentage}%" if project.coverage_percentage else "N/A"]
        ]
        
        form_table = Table(form_data, colWidths=[3*inch, 3*inch])
        form_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 3), (-1, -1), 0.5, colors.grey)
        ]))
        
        story.append(form_table)
        story.append(Spacer(1, 30))
        
        # Declaration
        declaration = """
        <b>DECLARATION:</b><br/><br/>
        I hereby declare that the particulars given above are true to the best of my knowledge and belief. 
        I undertake to abide by the provisions of the Tamil Nadu Town and Country Planning Act and Rules 
        made thereunder and the building rules in force.<br/><br/>
        
        Date: {}<br/>
        Place: Chennai<br/><br/>
        
        Signature of Applicant: ___________________<br/><br/>
        
        <b>FOR OFFICE USE ONLY:</b><br/>
        Application received on: ___________<br/>
        Processing fee paid: ___________<br/>
        Scrutiny by: ___________<br/>
        Approved/Rejected on: ___________
        """.format(datetime.now().strftime("%d/%m/%Y"))
        
        story.append(Paragraph(declaration, self.styles['Normal']))
        
        doc.build(story)
        return filepath
    
    def generate_gis_boundary_file(self, project: Project) -> str:
        """Generate GeoJSON file with site boundary"""
        
        if not project.site_boundary_polygon:
            return None
        
        filename = f"site_boundary_{project.application_id}.geojson"
        filepath = os.path.join(self.output_dir, filename)
        
        # Create GeoJSON feature collection
        geojson_data = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "application_id": project.application_id,
                        "project_title": project.project_title,
                        "survey_number": project.survey_number,
                        "area": "2000 sq.m",  # Demo value
                        "generated_on": datetime.now().isoformat()
                    },
                    "geometry": json.loads(project.site_boundary_polygon)
                }
            ]
        }
        
        with open(filepath, 'w') as f:
            json.dump(geojson_data, f, indent=2)
        
        return filepath