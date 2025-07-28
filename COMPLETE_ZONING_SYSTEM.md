# Zoning Compliance and Spatial Analysis System

## Overview

This is a comprehensive **Zoning Compliance and Spatial Analysis System** built with a modern tech stack including React.js, Node.js, PostgreSQL with PostGIS, Mapbox GL JS, and Three.js. The system allows developers, architects, and planning officials to manage development projects and automatically validate zoning compliance.

## Features

### Core Functionality
- **Project Management** - Create and manage development projects with location data
- **Zoning Compliance Validation** - Automatic compliance checking against local regulations
- **Interactive Mapping** - Visualize zoning layers and project locations using Mapbox
- **File Management** - Upload and manage CAD files (.dwg), PDFs, and other documents
- **3D Visualization** - Basic 3D preview using Three.js for height analysis
- **Spatial Analysis** - PostGIS-powered spatial queries and analysis

### User Roles
- **Developers/Architects** - Submit projects and get compliance reports
- **Planning Officials** - Review and approve/reject projects
- **Public Users** - Explore zoning maps and view approved projects

## Tech Stack

### Frontend
- **React.js** with React Router for navigation
- **Mapbox GL JS** for interactive mapping
- **Three.js** for 3D visualization
- **Material-UI** or **Tailwind CSS** for UI components
- **Axios** for API communication

### Backend
- **Node.js + Express** for REST API
- **PostgreSQL + PostGIS** for spatial data storage
- **Redis** for caching
- **JWT** for authentication
- **Multer + AWS S3** for file handling
- **Winston** for logging

### DevOps
- **Docker** and **Docker Compose** for containerization
- **nginx** for reverse proxy (production)

## Project Structure

```
zoning-compliance-system/
├── frontend/                 # React.js frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API services
│   │   ├── utils/           # Utility functions
│   │   └── styles/          # CSS/styling files
│   ├── public/
│   └── package.json
├── backend/                  # Node.js backend
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── config/          # Database and Redis config
│   │   ├── utils/           # Utility functions
│   │   └── scripts/         # Database scripts
│   ├── logs/                # Application logs
│   └── package.json
├── database/
│   └── init/                # Database initialization scripts
├── docker-compose.yml       # Docker services configuration
├── .env.example            # Environment variables template
└── README.md
```

## Installation and Setup

### Prerequisites
- **Node.js** (v18+)
- **Docker** and **Docker Compose**
- **Git**

### 1. Clone the Repository
```bash
git clone <repository-url>
cd zoning-compliance-system
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your actual values
```

### 3. Install Dependencies
```bash
npm run install:all
```

### 4. Start with Docker (Recommended)
```bash
docker-compose up -d
```

### 5. Manual Setup (Alternative)
```bash
# Start PostgreSQL with PostGIS
# Start Redis
# Start Backend
cd backend && npm run dev

# Start Frontend (in new terminal)
cd frontend && npm run dev
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://zoning_user:zoning_password@localhost:5432/zoning_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET=zoning-files

# Mapbox (for frontend mapping)
REACT_APP_MAPBOX_TOKEN=your_mapbox_access_token

# API URLs
REACT_APP_API_URL=http://localhost:3001

# Environment
NODE_ENV=development
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PATCH /api/auth/update-profile` - Update user profile
- `PATCH /api/auth/change-password` - Change password

### Projects
- `GET /api/projects` - Get all projects (with pagination)
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create new project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Zoning
- `GET /api/zoning/layers` - Get all zoning layers
- `GET /api/zoning/layers/:id` - Get zoning layer by ID
- `GET /api/zoning/point/:lng/:lat` - Get zoning at specific point
- `GET /api/zoning/nearby/:lng/:lat` - Get nearby zoning features
- `POST /api/zoning/search` - Search zoning by area
- `GET /api/zoning/rules/:projectId` - Get zoning rules for project
- `POST /api/zoning/layers` - Create zoning layer (admin only)
- `PATCH /api/zoning/layers/:id` - Update zoning layer (admin only)
- `DELETE /api/zoning/layers/:id` - Delete zoning layer (admin only)

### Validation
- `POST /api/validation/validate/:projectId` - Run validation for project
- `GET /api/validation/results/:projectId` - Get validation results
- `GET /api/validation` - Get all validation results

### Files
- `POST /api/files/upload/:projectId` - Upload files for project
- `GET /api/files/:projectId` - Get files for project
- `DELETE /api/files/:fileId` - Delete file

### GIS
- `GET /api/gis/roads` - Get road network data
- `GET /api/gis/landuse` - Get land use data
- `POST /api/gis/buffer` - Create buffer around geometry
- `POST /api/gis/intersect` - Find intersecting features

## Database Schema

### Core Tables

#### users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### zoning_layers
```sql
CREATE TABLE zoning_layers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    zoning_code VARCHAR(50) NOT NULL,
    zoning_type zoning_type NOT NULL,
    max_height DECIMAL(10,2),
    max_floor_area_ratio DECIMAL(5,2),
    min_front_setback DECIMAL(10,2),
    min_side_setback DECIMAL(10,2),
    min_rear_setback DECIMAL(10,2),
    max_lot_coverage DECIMAL(5,2),
    min_parking_spaces INTEGER,
    geometry GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### projects
```sql
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status project_status DEFAULT 'draft',
    project_area GEOMETRY(POLYGON, 4326),
    address TEXT,
    lot_size DECIMAL(15,2),
    proposed_building_height DECIMAL(10,2),
    proposed_floor_area DECIMAL(15,2),
    proposed_parking_spaces INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### validation_results
```sql
CREATE TABLE validation_results (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    rule_description TEXT,
    is_compliant BOOLEAN NOT NULL,
    actual_value DECIMAL(15,4),
    required_value DECIMAL(15,4),
    violation_details TEXT,
    severity VARCHAR(20) DEFAULT 'error',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Validation Rules Engine

The system includes an automated validation engine that checks:

1. **Building Height** - Ensures proposed height doesn't exceed zoning limits
2. **Floor Area Ratio (FAR)** - Validates total floor area against lot size
3. **Setbacks** - Checks minimum distances from property boundaries
4. **Lot Coverage** - Ensures building footprint doesn't exceed limits
5. **Parking Requirements** - Validates minimum parking space requirements

### Example Validation
```javascript
// Building height check
if (proposedHeight > zoningMaxHeight) {
    violations.push({
        rule_name: 'Building Height',
        is_compliant: false,
        actual_value: proposedHeight,
        required_value: zoningMaxHeight,
        violation_details: `Proposed height exceeds maximum allowed`,
        severity: 'error'
    });
}
```

## Frontend Components

### Key React Components
- **MapContainer** - Main map interface with Mapbox GL JS
- **ProjectForm** - Form for creating/editing projects
- **FileUpload** - Drag-and-drop file upload component
- **ValidationResults** - Display compliance check results
- **ZoningLayers** - Manage and display zoning overlays
- **ThreeViewer** - 3D visualization component

### Map Features
- Interactive zoning layer visualization
- Drawing tools for project boundaries
- Click-to-query zoning information
- Spatial search and filtering
- Real-time updates

## Deployment

### Docker Production
```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment
1. Set up PostgreSQL with PostGIS extension
2. Configure Redis instance
3. Set up AWS S3 bucket for file storage
4. Configure nginx reverse proxy
5. Set production environment variables
6. Deploy backend and frontend applications

## API Usage Examples

### Create a New Project
```javascript
const project = await fetch('/api/projects', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        name: 'Downtown Mixed Use Development',
        description: 'Mixed residential and commercial project',
        address: '123 Main Street',
        lot_size: 5000,
        proposed_building_height: 45,
        proposed_floor_area: 15000,
        proposed_parking_spaces: 75,
        project_area: {
            type: 'Polygon',
            coordinates: [[
                [-74.006, 40.712],
                [-74.005, 40.712],
                [-74.005, 40.713],
                [-74.006, 40.713],
                [-74.006, 40.712]
            ]]
        }
    })
});
```

### Run Zoning Validation
```javascript
const validation = await fetch(`/api/validation/validate/${projectId}`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`
    }
});

const results = await validation.json();
console.log('Compliance:', results.data.validation_summary.overall_compliant);
```

### Query Zoning at Point
```javascript
const response = await fetch(`/api/zoning/point/-74.006/40.712`);
const zoning = await response.json();
console.log('Zoning Code:', zoning.data.zoning.zoning_code);
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation and API reference

---

**Note**: This system is designed for educational and demonstration purposes. For production use, additional security measures, performance optimizations, and compliance with local regulations should be implemented.