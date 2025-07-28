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