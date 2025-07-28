# 🏗️ Building Plan Approval System

A comprehensive automated building plan approval system with GIS integration, compliance checking, and document generation. This system streamlines the building permit application process by requiring only **6 user inputs** while auto-detecting all other necessary information.

## ✨ Key Features

### 🔑 **Minimal User Input (Only 6 Fields Required)**
- Project Title/Name
- Project Type (Residential/Commercial/etc.)
- Survey Number
- Village/Taluk/District
- Patta Number
- Encumbrance Certificate (EC) Number

### 🤖 **Auto-Detection & Computation**
- **GIS Analysis**: Coordinates, elevation, zoning, land use, CRZ, flood zones
- **Spatial Data**: Site boundary, proximity to water bodies, road width
- **Compliance Calculations**: FSI, coverage, setbacks, parking requirements
- **Rule Validation**: Automated DCR & NBC compliance checking

### 📊 **Comprehensive Output**
- Interactive project dashboard
- Detailed compliance reports
- Auto-generated CMDA forms
- GIS boundary files (GeoJSON)
- PDF reports with all validations

## 🏛️ Architecture

```
Frontend (React)     Backend (FastAPI)     Database (PostgreSQL + PostGIS)
     │                       │                           │
     ├─ Project Dashboard    ├─ API Endpoints           ├─ Projects
     ├─ Form Wizard         ├─ GIS Service             ├─ Compliance Checks
     ├─ Building Designer   ├─ Compliance Engine       ├─ Documents
     ├─ Compliance Checker  ├─ Document Generator      ├─ Zoning Rules
     └─ GIS Map            └─ File Management         └─ Spatial Data
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### 1. Clone Repository
```bash
git clone <repository-url>
cd building-plan-approval-system
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 3. Run with Docker
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🗃️ Database Schema

### Projects Table
```sql
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR UNIQUE,
    
    -- User Inputs (6 required fields)
    project_title VARCHAR NOT NULL,
    project_type VARCHAR NOT NULL,
    survey_number VARCHAR NOT NULL,
    village_taluk_district VARCHAR NOT NULL,
    patta_number VARCHAR NOT NULL,
    ec_number VARCHAR NOT NULL,
    
    -- Auto-detected GIS Data
    latitude DECIMAL,
    longitude DECIMAL,
    elevation DECIMAL,
    land_type VARCHAR,
    road_width DECIMAL,
    zoning_classification VARCHAR,
    land_use VARCHAR,
    crz_zones VARCHAR,
    proximity_to_water DECIMAL,
    
    -- Building Details
    building_height DECIMAL,
    total_buildup_area DECIMAL,
    coverage_percentage DECIMAL,
    fsi_used DECIMAL,
    number_of_units INTEGER,
    setbacks JSONB,
    parking_provided JSONB,
    
    -- Status & Timestamps
    status VARCHAR DEFAULT 'DRAFT',
    compliance_status VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    submitted_at TIMESTAMP
);
```

## 📋 API Endpoints

### Project Management
```
POST   /api/projects                    # Create new project
GET    /api/projects                    # List all projects
GET    /api/projects/{id}               # Get project details
PUT    /api/projects/{id}               # Update project
```

### GIS & Analysis
```
POST   /api/projects/{id}/gis-analysis      # Run GIS analysis
POST   /api/projects/{id}/building-details  # Update building details
POST   /api/projects/{id}/compliance-check  # Run compliance validation
```

### Documents & Reports
```
POST   /api/projects/{id}/documents/upload  # Upload documents
POST   /api/projects/{id}/generate-report   # Generate PDF report
GET    /api/download/{filename}             # Download files
```

### Submission
```
POST   /api/projects/{id}/submit            # Submit to CMDA
```

## 🧮 Compliance Rules Engine

The system automatically validates against:

### DCR (Development Control Rules)
- ✅ Minimum setbacks based on zoning
- ✅ Maximum FSI limits
- ✅ Ground coverage restrictions
- ✅ Building height limits
- ✅ Open Space Reservation (OSR)

### NBC (National Building Code)
- ✅ Fire safety requirements
- ✅ Accessibility features
- ✅ Parking provisions
- ✅ Waste management
- ✅ Rainwater harvesting

### Zoning Rules
```javascript
const zoningRules = {
  "R1": { maxFSI: 1.2, maxCoverage: 65, minSetback: { front: 3, rear: 2, side: 1.5 } },
  "R2": { maxFSI: 1.5, maxCoverage: 70, minSetback: { front: 3, rear: 2.5, side: 2 } },
  "C1": { maxFSI: 2.0, maxCoverage: 75, minSetback: { front: 4, rear: 3, side: 2.5 } }
};
```

## 🗺️ GIS Integration

### Spatial Analysis
- Geocoding location strings to coordinates
- DEM-based elevation extraction
- Proximity analysis to water bodies
- CRZ (Coastal Regulation Zone) classification
- Flood zone buffer calculations

### Mapping Services
- Mapbox GL for interactive maps
- Site boundary polygon drawing
- Satellite imagery overlay
- Vector tile integration for road networks

## 📄 Document Generation

### Auto-Generated Documents
1. **Project Report** - Comprehensive PDF with all details
2. **CMDA Form-1** - Official building permission application
3. **GIS Boundary File** - GeoJSON format for spatial reference
4. **Compliance Summary** - Pass/fail status for all rules

### Sample Output Structure
```
📁 Project_BP-RES-2025-A1B2C3D4/
├── 📄 project_report.pdf
├── 📄 cmda_form1.pdf
├── 📄 site_boundary.geojson
├── 📄 compliance_summary.pdf
└── 📁 uploads/
    ├── 📄 ec_certificate.pdf
    ├── 📄 architectural_drawings.dwg
    └── 📁 site_photos/
```

## 🔧 Development Setup

### Backend Development
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Development
```bash
npm install
npm start
```

### Database Setup
```bash
# Install PostgreSQL with PostGIS
sudo apt-get install postgresql postgis

# Create database
createdb building_plans
psql building_plans -c "CREATE EXTENSION postgis;"
```

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
pytest tests/ -v
```

### Run Frontend Tests
```bash
npm test
```

### Integration Tests
```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d

# Run full test suite
npm run test:integration
```

## 🚀 Deployment

### Production Environment
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables (Production)
```env
DATABASE_URL=postgresql://user:pass@db:5432/building_plans
MAPBOX_TOKEN=pk.your_production_token
SECRET_KEY=your-super-secret-production-key
DEBUG=False
CMDA_API_ENDPOINT=https://api.cmda.gov.in
```

## 📈 Monitoring & Logging

### Health Checks
- `/health` - API health status
- `/metrics` - Prometheus metrics
- Database connection monitoring

### Logging
```python
# Structured logging with correlation IDs
logger.info("Project created", extra={
    "project_id": project.id,
    "user_id": user.id,
    "application_id": project.application_id
})
```

## 🔒 Security

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- API rate limiting

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- File upload restrictions
- CORS configuration

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📜 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

## 📞 Support

- 📧 Email: support@buildingplanapp.com
- 📱 Phone: +91-XXXX-XXXX-XX
- 🌐 Documentation: https://docs.buildingplanapp.com

---

## 🎯 Roadmap

### Phase 1 ✅
- [x] Basic project creation with 6 input fields
- [x] GIS integration and auto-detection
- [x] Compliance rule engine
- [x] PDF report generation

### Phase 2 🚧
- [ ] Integration with actual CMDA APIs
- [ ] Mobile app development
- [ ] Advanced GIS features
- [ ] Multi-language support

### Phase 3 📋
- [ ] AI/ML for plan review
- [ ] Blockchain for document verification
- [ ] IoT integration for real-time monitoring
- [ ] Advanced analytics dashboard

---

**Built with ❤️ for simplifying building plan approvals**

