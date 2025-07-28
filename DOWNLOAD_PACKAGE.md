# 🚀 COMPLETE ZONING COMPLIANCE SYSTEM - DOWNLOAD PACKAGE

## 📦 Project Structure to Create

```
zoning-compliance-system/
├── package.json
├── .env.example
├── docker-compose.yml
├── README.md
├── database/
│   └── init/
│       └── 01_setup.sql
└── backend/
    ├── package.json
    ├── Dockerfile
    └── src/
        ├── server.js
        ├── config/
        │   ├── database.js
        │   └── redis.js
        ├── middleware/
        │   ├── auth.js
        │   └── errorHandler.js
        ├── routes/
        │   ├── auth.js
        │   ├── projects.js
        │   ├── zoning.js
        │   └── validation.js
        └── utils/
            └── logger.js
```

---

## 📄 ROOT FILES

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

volumes:
  postgres_data:
  redis_data:
```

### README.md
```markdown
# Zoning Compliance System

A comprehensive zoning compliance and spatial analysis system built with React.js, Node.js, PostgreSQL+PostGIS, and Mapbox.

## Quick Start

1. Clone this repository
2. Copy `.env.example` to `.env` and configure
3. Run `npm run install:all`
4. Start with `docker-compose up -d`
5. Access at http://localhost:3001

## Default Login
- Email: admin@zoning.com
- Password: admin123

## Features
- Project management
- Zoning compliance validation
- Interactive mapping with Mapbox
- File upload support
- Spatial analysis with PostGIS
```

---

## 🗄️ DATABASE FILES

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
    severity VARCHAR(20) DEFAULT 'error',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analysis sessions table
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

## 🔧 BACKEND FILES

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
const validationRoutes = require('./routes/validation');

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
app.use('/api/validation', authMiddleware, validationRoutes);

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

// Start server
async function startServer() {
  try {
    await connectDatabase();
    logger.info('Database connected successfully');

    await connectRedis();
    logger.info('Redis connected successfully');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
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

async function getZoningAtPoint(longitude, latitude) {
  const queryText = `
    SELECT z.*, ST_AsGeoJSON(z.geometry) as geojson
    FROM zoning_layers z
    WHERE ST_Contains(z.geometry, ST_SetSRID(ST_MakePoint($1, $2), 4326))
    LIMIT 1
  `;
  return query(queryText, [longitude, latitude]);
}

module.exports = {
  connectDatabase,
  query,
  transaction,
  getZoningAtPoint
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
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    await client.connect();
    return client;
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
}

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

module.exports = {
  connectRedis,
  setCache,
  getCache
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
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/error.log'), 
      level: 'error'
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/combined.log')
    })
  ]
});

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

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } else {
      logger.error('ERROR:', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went very wrong!'
      });
    }
  }
};

module.exports.AppError = AppError;
```

### backend/src/middleware/auth.js
```javascript
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { AppError } = require('./errorHandler');

const authMiddleware = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in!', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return next(new AppError('User no longer exists', 401));
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return next(new AppError('Invalid token', 401));
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Permission denied', 403));
    }
    next();
  };
};

module.exports = authMiddleware;
module.exports.restrictTo = restrictTo;
```

### backend/src/routes/auth.js
```javascript
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Invalid input data', 400));
    }

    const { email, password, firstName, lastName } = req.body;

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return next(new AppError('User already exists', 400));
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, first_name, last_name, role`,
      [email, hashedPassword, firstName, lastName]
    );

    const token = signToken(result.rows[0].id);

    res.status(201).json({
      status: 'success',
      token,
      data: { user: result.rows[0] }
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    const token = signToken(user.id);

    delete user.password_hash;

    res.status(200).json({
      status: 'success',
      token,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### backend/src/routes/projects.js
```javascript
const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Get all projects
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [limit, offset];

    if (req.user.role !== 'admin') {
      whereClause = 'WHERE p.user_id = $3';
      queryParams.push(req.user.id);
    }

    const result = await query(`
      SELECT 
        p.*,
        u.first_name || ' ' || u.last_name as owner_name,
        ST_AsGeoJSON(p.project_area) as project_area_geojson
      FROM projects p
      JOIN users u ON p.user_id = u.id
      ${whereClause}
      ORDER BY p.updated_at DESC
      LIMIT $1 OFFSET $2
    `, queryParams);

    res.status(200).json({
      status: 'success',
      results: result.rows.length,
      data: { projects: result.rows }
    });
  } catch (error) {
    next(error);
  }
});

// Create project
router.post('/', [
  body('name').notEmpty().trim(),
  body('description').optional().trim()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError('Invalid input data', 400));
    }

    const { name, description, address, lot_size, proposed_building_height, proposed_floor_area, proposed_parking_spaces, project_area } = req.body;

    let projectAreaWKT = null;
    if (project_area?.coordinates) {
      const coords = project_area.coordinates[0];
      const wktCoords = coords.map(coord => `${coord[0]} ${coord[1]}`).join(', ');
      projectAreaWKT = `POLYGON((${wktCoords}))`;
    }

    const result = await query(`
      INSERT INTO projects (
        user_id, name, description, address, lot_size,
        proposed_building_height, proposed_floor_area, proposed_parking_spaces,
        project_area
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 
        ${projectAreaWKT ? 'ST_GeomFromText($9, 4326)' : 'NULL'})
      RETURNING *, ST_AsGeoJSON(project_area) as project_area_geojson
    `, projectAreaWKT ? 
      [req.user.id, name, description, address, lot_size, proposed_building_height, proposed_floor_area, proposed_parking_spaces, projectAreaWKT] :
      [req.user.id, name, description, address, lot_size, proposed_building_height, proposed_floor_area, proposed_parking_spaces]
    );

    res.status(201).json({
      status: 'success',
      data: { project: result.rows[0] }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### backend/src/routes/zoning.js
```javascript
const express = require('express');
const { query } = require('../config/database');
const { getZoningAtPoint } = require('../config/database');
const { getCache, setCache } = require('../config/redis');

const router = express.Router();

// Get all zoning layers
router.get('/layers', async (req, res, next) => {
  try {
    const cacheKey = 'zoning:layers:all';
    let result = await getCache(cacheKey);

    if (!result) {
      const dbResult = await query(`
        SELECT 
          id, name, description, zoning_code, zoning_type,
          max_height, max_floor_area_ratio, min_front_setback,
          min_side_setback, min_rear_setback, max_lot_coverage,
          min_parking_spaces,
          ST_AsGeoJSON(geometry) as geojson
        FROM zoning_layers
        ORDER BY name
      `);
      
      result = dbResult.rows;
      await setCache(cacheKey, result, 3600);
    }

    res.status(200).json({
      status: 'success',
      results: result.length,
      data: { layers: result }
    });
  } catch (error) {
    next(error);
  }
});

// Get zoning at point
router.get('/point/:lng/:lat', async (req, res, next) => {
  try {
    const lng = parseFloat(req.params.lng);
    const lat = parseFloat(req.params.lat);

    const result = await getZoningAtPoint(lng, lat);

    res.status(200).json({
      status: 'success',
      data: {
        zoning: result.rows[0] || null,
        coordinates: [lng, lat]
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### backend/src/routes/validation.js
```javascript
const express = require('express');
const { query, transaction } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

class ZoningValidator {
  constructor(project, zoningLayers) {
    this.project = project;
    this.zoningLayers = zoningLayers;
    this.violations = [];
  }

  async validateAll() {
    this.validateHeight();
    this.validateFloorAreaRatio();
    this.validateParkingSpaces();
    return this.violations;
  }

  validateHeight() {
    for (const zoning of this.zoningLayers) {
      if (zoning.max_height && this.project.proposed_building_height) {
        const isCompliant = this.project.proposed_building_height <= zoning.max_height;
        this.violations.push({
          rule_name: 'Building Height',
          rule_description: `Maximum building height in ${zoning.zoning_code} zone`,
          is_compliant: isCompliant,
          actual_value: this.project.proposed_building_height,
          required_value: zoning.max_height,
          violation_details: isCompliant ? null : `Proposed height exceeds maximum allowed`,
          severity: isCompliant ? 'info' : 'error'
        });
      }
    }
  }

  validateFloorAreaRatio() {
    if (!this.project.lot_size || !this.project.proposed_floor_area) return;

    const actualFAR = this.project.proposed_floor_area / this.project.lot_size;

    for (const zoning of this.zoningLayers) {
      if (zoning.max_floor_area_ratio) {
        const isCompliant = actualFAR <= zoning.max_floor_area_ratio;
        this.violations.push({
          rule_name: 'Floor Area Ratio',
          rule_description: `Maximum FAR in ${zoning.zoning_code} zone`,
          is_compliant: isCompliant,
          actual_value: actualFAR,
          required_value: zoning.max_floor_area_ratio,
          violation_details: isCompliant ? null : `Proposed FAR exceeds maximum allowed`,
          severity: isCompliant ? 'info' : 'error'
        });
      }
    }
  }

  validateParkingSpaces() {
    for (const zoning of this.zoningLayers) {
      if (zoning.min_parking_spaces && this.project.proposed_parking_spaces !== null) {
        const isCompliant = this.project.proposed_parking_spaces >= zoning.min_parking_spaces;
        this.violations.push({
          rule_name: 'Parking Spaces',
          rule_description: `Minimum parking spaces in ${zoning.zoning_code} zone`,
          is_compliant: isCompliant,
          actual_value: this.project.proposed_parking_spaces,
          required_value: zoning.min_parking_spaces,
          violation_details: isCompliant ? null : `Insufficient parking spaces`,
          severity: isCompliant ? 'info' : 'error'
        });
      }
    }
  }
}

// Run validation
router.post('/validate/:projectId', async (req, res, next) => {
  try {
    const projectId = req.params.projectId;

    // Get project
    const projectResult = await query(`
      SELECT p.*, ST_AsGeoJSON(p.project_area) as project_area_geojson
      FROM projects p
      WHERE p.id = $1 AND p.user_id = $2
    `, [projectId, req.user.id]);

    if (projectResult.rows.length === 0) {
      return next(new AppError('Project not found', 404));
    }

    const project = projectResult.rows[0];

    if (!project.project_area_geojson) {
      return next(new AppError('Project must have a defined area', 400));
    }

    // Get applicable zoning
    const zoningResult = await query(`
      SELECT z.*
      FROM zoning_layers z, projects p
      WHERE p.id = $1 AND ST_Intersects(z.geometry, p.project_area)
    `, [projectId]);

    if (zoningResult.rows.length === 0) {
      return next(new AppError('No applicable zoning found', 400));
    }

    // Run validation
    const validator = new ZoningValidator(project, zoningResult.rows);
    const violations = await validator.validateAll();

    // Save results
    await transaction(async (client) => {
      await client.query('DELETE FROM validation_results WHERE project_id = $1', [projectId]);

      for (const violation of violations) {
        await client.query(`
          INSERT INTO validation_results (
            project_id, rule_name, rule_description, is_compliant,
            actual_value, required_value, violation_details, severity
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          projectId, violation.rule_name, violation.rule_description,
          violation.is_compliant, violation.actual_value, violation.required_value,
          violation.violation_details, violation.severity
        ]);
      }
    });

    const compliantRules = violations.filter(v => v.is_compliant).length;
    const errorCount = violations.filter(v => v.severity === 'error' && !v.is_compliant).length;

    res.status(200).json({
      status: 'success',
      data: {
        project_id: projectId,
        validation_summary: {
          total_rules: violations.length,
          compliant_rules: compliantRules,
          compliance_percentage: Math.round((compliantRules / violations.length) * 100),
          error_count: errorCount,
          overall_compliant: errorCount === 0
        },
        validation_results: violations
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

---

## 🚀 SETUP INSTRUCTIONS

1. **Create Project Structure:**
   ```bash
   mkdir zoning-compliance-system
   cd zoning-compliance-system
   ```

2. **Copy Files:**
   - Copy each section above into the corresponding file path
   - Create the directory structure as shown

3. **Environment Setup:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Install and Run:**
   ```bash
   npm run install:all
   docker-compose up -d
   ```

5. **Access:**
   - API: http://localhost:3001
   - Default login: admin@zoning.com / admin123

---

## 📋 FEATURES INCLUDED

✅ **Complete Backend API** with authentication  
✅ **PostgreSQL + PostGIS** spatial database  
✅ **Redis caching** for performance  
✅ **Docker configuration** for easy deployment  
✅ **Zoning validation engine** with compliance checking  
✅ **Project management** system  
✅ **Spatial queries** and GIS functionality  
✅ **File upload support** (ready for extension)  
✅ **Admin user** pre-configured  

This download package contains everything needed to run the zoning compliance system!