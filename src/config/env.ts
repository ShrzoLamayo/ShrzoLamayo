import dotenv from 'dotenv';

dotenv.config();

function parseBoolean(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on', 'require', 'enabled'].includes(value.toLowerCase());
}

const schema = process.env.SCHEMA_NAME || 'public';
const geometryColumn = process.env.GEOMETRY_COLUMN || 'geom';

export const config = {
  server: {
    port: Number(process.env.PORT || 8080),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  db: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5433/urban_planning',
    ssl: parseBoolean(process.env.PGSSLMODE),
  },
  google: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },
  spatial: {
    schema,
    geometryColumn,
    zoningTable: process.env.ZONING_TABLE || 'zoning',
    floodTable: process.env.FLOOD_TABLE || 'flood_zones',
    crzTable: process.env.CRZ_TABLE || 'crz',
    landUseTable: process.env.LAND_USE_TABLE || 'land_use',
    roadsTable: process.env.ROADS_TABLE || 'roads',
    roadSearchRadiusMeters: Number(process.env.ROAD_SEARCH_RADIUS_METERS || 150),
  },
} as const;
