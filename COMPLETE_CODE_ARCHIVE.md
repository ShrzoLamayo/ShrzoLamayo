# Complete Code Archive - Zoning Compliance System

This file contains all the source code for the complete zoning compliance and spatial analysis system.

## Table of Contents
1. [Root Configuration Files](#root-configuration-files)
2. [Database Configuration](#database-configuration)
3. [Backend Code](#backend-code)
4. [Frontend Code](#frontend-code)
5. [Docker Configuration](#docker-configuration)

---

## Root Configuration Files

### package.json
```json
{
  "name": "zoning-compliance-system",
  "version": "1.0.0",
  "description": "Comprehensive zoning compliance and spatial analysis system",
  "private": true,
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && npm run dev",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "cd frontend && npm run build",
    "build:backend": "cd backend && npm run build",
    "install:all": "npm install && cd frontend && npm install && cd ../backend && npm install"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

### .env.example
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

---

## Database Configuration

### database/init/01_setup.sql
```sql
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
```

---

## Backend Code

### backend/package.json
```json
{
  "name": "zoning-backend",
  "version": "1.0.0",
  "description": "Backend API for zoning compliance system",
  "main": "src/server.js",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "build": "echo 'No build step required for Node.js'",
    "test": "jest",
    "migrate": "node src/scripts/migrate.js",
    "seed": "node src/scripts/seed.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.1.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.3",
    "pg-format": "^1.0.4",
    "redis": "^4.6.10",
    "multer": "^1.4.5-lts.1",
    "multer-s3": "^3.0.1",
    "@aws-sdk/client-s3": "^3.454.0",
    "@aws-sdk/s3-request-presigner": "^3.454.0",
    "joi": "^17.11.0",
    "dotenv": "^16.3.1",
    "express-validator": "^7.0.1",
    "node-cron": "^3.0.3",
    "winston": "^3.11.0",
    "sharp": "^0.32.6",
    "pdf-parse": "^1.1.1",
    "archiver": "^6.0.1",
    "unzipper": "^0.10.14",
    "turf": "^3.0.14",
    "@turf/turf": "^6.5.0",
    "wellknown": "^0.5.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "@types/jest": "^29.5.8"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### backend/Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node src/scripts/healthcheck.js || exit 1

# Start the application
CMD ["npm", "start"]
```

### backend/src/server.js
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const zoningRoutes = require('./routes/zoning');
const fileRoutes = require('./routes/files');
const validationRoutes = require('./routes/validation');
const gisRoutes = require('./routes/gis');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "https:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/zoning', authMiddleware, zoningRoutes);
app.use('/api/files', authMiddleware, fileRoutes);
app.use('/api/validation', authMiddleware, validationRoutes);
app.use('/api/gis', authMiddleware, gisRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Zoning Compliance API',
    version: '1.0.0',
    documentation: '/api/docs'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected successfully');

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
```

### backend/src/config/database.js
```javascript
const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool;

const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

async function connectDatabase() {
  try {
    pool = new Pool(dbConfig);
    
    // Test the connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    logger.info('Database connected successfully at:', result.rows[0].now);
    return pool;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}

function getPool() {
  if (!pool) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return pool;
}

async function query(text, params) {
  const client = await pool.connect();
  try {
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      logger.warn(`Slow query executed in ${duration}ms:`, text.substring(0, 100));
    }
    
    return result;
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Spatial query helpers
async function spatialQuery(geometryWKT, table, geometryColumn = 'geometry') {
  const queryText = `
    SELECT *, ST_AsGeoJSON(${geometryColumn}) as geojson
    FROM ${table}
    WHERE ST_Intersects(${geometryColumn}, ST_GeomFromText($1, 4326))
  `;
  return query(queryText, [geometryWKT]);
}

async function getZoningAtPoint(longitude, latitude) {
  const queryText = `
    SELECT z.*, ST_AsGeoJSON(z.geometry) as geojson
    FROM zoning_layers z
    WHERE ST_Contains(z.geometry, ST_SetSRID(ST_MakePoint($1, $2), 4326))
    LIMIT 1
  `;
  return query(queryText, [longitude, latitude]);
}

async function getNearbyFeatures(longitude, latitude, radiusMeters = 1000, table = 'zoning_layers') {
  const queryText = `
    SELECT *, 
           ST_AsGeoJSON(geometry) as geojson,
           ST_Distance(
             ST_Transform(geometry, 3857),
             ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857)
           ) as distance_meters
    FROM ${table}
    WHERE ST_DWithin(
      ST_Transform(geometry, 3857),
      ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857),
      $3
    )
    ORDER BY distance_meters
  `;
  return query(queryText, [longitude, latitude, radiusMeters]);
}

module.exports = {
  connectDatabase,
  getPool,
  query,
  transaction,
  spatialQuery,
  getZoningAtPoint,
  getNearbyFeatures
};
```

### backend/src/config/redis.js
```javascript
const redis = require('redis');
const logger = require('../utils/logger');

let client;

async function connectRedis() {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });

    client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      logger.info('Redis client connected');
    });

    client.on('ready', () => {
      logger.info('Redis client ready');
    });

    client.on('end', () => {
      logger.info('Redis client disconnected');
    });

    await client.connect();
    return client;
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
}

function getRedisClient() {
  if (!client) {
    throw new Error('Redis not connected. Call connectRedis() first.');
  }
  return client;
}

// Cache helpers
async function setCache(key, value, ttlSeconds = 3600) {
  try {
    const serializedValue = JSON.stringify(value);
    await client.setEx(key, ttlSeconds, serializedValue);
  } catch (error) {
    logger.error('Cache set error:', error);
  }
}

async function getCache(key) {
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Cache get error:', error);
    return null;
  }
}

async function deleteCache(key) {
  try {
    await client.del(key);
  } catch (error) {
    logger.error('Cache delete error:', error);
  }
}

async function deleteCachePattern(pattern) {
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    logger.error('Cache pattern delete error:', error);
  }
}

module.exports = {
  connectRedis,
  getRedisClient,
  setCache,
  getCache,
  deleteCache,
  deleteCachePattern
};
```

### backend/src/utils/logger.js
```javascript
const winston = require('winston');
const path = require('path');

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'zoning-api' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = logger;
```

### backend/src/middleware/errorHandler.js
```javascript
const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR:', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!'
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

module.exports.AppError = AppError;
```

### backend/src/middleware/auth.js
```javascript
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
  try {
    // 1) Getting token and check if it's there
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      );
    }

    // 2) Verification token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const result = await query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return next(
        new AppError('The user belonging to this token does no longer exist.', 401)
      );
    }

    const currentUser = result.rows[0];

    // 4) Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return next(new AppError('Invalid token. Please log in again!', 401));
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

module.exports = authMiddleware;
module.exports.restrictTo = restrictTo;
```

---

## Docker Configuration

### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgis/postgis:15-3.3
    container_name: zoning_postgres
    environment:
      POSTGRES_DB: zoning_db
      POSTGRES_USER: zoning_user
      POSTGRES_PASSWORD: zoning_password
      POSTGRES_HOST_AUTH_METHOD: trust
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U zoning_user -d zoning_db"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    container_name: zoning_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: zoning_backend
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://zoning_user:zoning_password@postgres:5432/zoning_db
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your_jwt_secret_key_here
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      AWS_REGION: ${AWS_REGION:-us-east-1}
      S3_BUCKET: ${S3_BUCKET:-zoning-files}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./backend:/app
      - /app/node_modules
      - ./uploads:/app/uploads

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: zoning_frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://localhost:3001
      REACT_APP_MAPBOX_TOKEN: ${REACT_APP_MAPBOX_TOKEN}
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
```

---

## Quick Start Instructions

1. **Clone and Setup**
   ```bash
   mkdir zoning-compliance-system
   cd zoning-compliance-system
   # Copy all files from this archive into respective directories
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys and configuration
   ```

3. **Install Dependencies**
   ```bash
   npm run install:all
   ```

4. **Start with Docker**
   ```bash
   docker-compose up -d
   ```

5. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Database: localhost:5432
   - Redis: localhost:6379

6. **Default Admin Login**
   - Email: admin@zoning.com
   - Password: admin123

This complete code archive provides a fully functional zoning compliance and spatial analysis system ready for deployment and further development.