-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create custom types
CREATE TYPE zoning_type AS ENUM (
    'residential', 'commercial', 'industrial', 'mixed_use', 
    'agricultural', 'recreational', 'institutional', 'transportation'
);

CREATE TYPE file_type AS ENUM ('dwg', 'pdf', 'zip', 'geojson', 'shapefile');

CREATE TYPE project_status AS ENUM (
    'draft', 'under_review', 'approved', 'rejected', 'requires_revision'
);

-- Users table
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

-- Zoning layers table
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

-- Create spatial index for zoning layers
CREATE INDEX idx_zoning_layers_geom ON zoning_layers USING GIST(geometry);

-- Roads table
CREATE TABLE roads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    road_type VARCHAR(100),
    width DECIMAL(10,2),
    speed_limit INTEGER,
    geometry GEOMETRY(LINESTRING, 4326) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_roads_geom ON roads USING GIST(geometry);

-- Land use table
CREATE TABLE land_use (
    id SERIAL PRIMARY KEY,
    use_type VARCHAR(100) NOT NULL,
    description TEXT,
    geometry GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_land_use_geom ON land_use USING GIST(geometry);

-- Projects table
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

CREATE INDEX idx_projects_geom ON projects USING GIST(project_area);
CREATE INDEX idx_projects_user ON projects(user_id);

-- Project files table
CREATE TABLE project_files (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_type file_type NOT NULL,
    file_size BIGINT NOT NULL,
    s3_key VARCHAR(500),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Zoning validation results table
CREATE TABLE validation_results (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    rule_description TEXT,
    is_compliant BOOLEAN NOT NULL,
    actual_value DECIMAL(15,4),
    required_value DECIMAL(15,4),
    violation_details TEXT,
    severity VARCHAR(20) DEFAULT 'error', -- error, warning, info
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analysis sessions table (for tracking 3D analysis sessions)
CREATE TABLE analysis_sessions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    session_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample zoning data
INSERT INTO zoning_layers (name, description, zoning_code, zoning_type, max_height, max_floor_area_ratio, min_front_setback, min_side_setback, min_rear_setback, max_lot_coverage, min_parking_spaces, geometry) VALUES
('Residential Low Density', 'Single family residential with low density', 'R-1', 'residential', 35.0, 0.5, 25.0, 10.0, 20.0, 0.4, 2, ST_GeomFromText('MULTIPOLYGON(((-74.006 40.712, -74.005 40.712, -74.005 40.713, -74.006 40.713, -74.006 40.712)))', 4326)),
('Commercial District', 'Mixed commercial and office use', 'C-1', 'commercial', 150.0, 3.0, 15.0, 5.0, 10.0, 0.8, 1, ST_GeomFromText('MULTIPOLYGON(((-74.005 40.713, -74.004 40.713, -74.004 40.714, -74.005 40.714, -74.005 40.713)))', 4326)),
('Industrial Light', 'Light industrial and manufacturing', 'I-1', 'industrial', 60.0, 1.5, 30.0, 15.0, 25.0, 0.6, 1, ST_GeomFromText('MULTIPOLYGON(((-74.007 40.711, -74.006 40.711, -74.006 40.712, -74.007 40.712, -74.007 40.711)))', 4326));

-- Insert sample roads
INSERT INTO roads (name, road_type, width, speed_limit, geometry) VALUES
('Main Street', 'arterial', 12.0, 35, ST_GeomFromText('LINESTRING(-74.008 40.710, -74.002 40.710)', 4326)),
('Oak Avenue', 'residential', 8.0, 25, ST_GeomFromText('LINESTRING(-74.006 40.710, -74.006 40.715)', 4326)),
('Industrial Blvd', 'collector', 10.0, 30, ST_GeomFromText('LINESTRING(-74.008 40.711, -74.004 40.711)', 4326));

-- Insert sample land use
INSERT INTO land_use (use_type, description, geometry) VALUES
('park', 'Public green space and recreation', ST_GeomFromText('MULTIPOLYGON(((-74.007 40.713, -74.006 40.713, -74.006 40.714, -74.007 40.714, -74.007 40.713)))', 4326)),
('school', 'Educational institution', ST_GeomFromText('MULTIPOLYGON(((-74.004 40.712, -74.003 40.712, -74.003 40.713, -74.004 40.713, -74.004 40.712)))', 4326));

-- Create admin user (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
('admin@zoning.com', '$2b$10$rOxRZMnRBhM4wH7kzQjW7eT6yGLlM9LTtRr3K5K6qUYRkZyOUaZA2', 'Admin', 'User', 'admin');

-- Update triggers for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_zoning_layers_updated_at BEFORE UPDATE ON zoning_layers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();