#!/usr/bin/env bash
set -euo pipefail

DB_URL=${DATABASE_URL:-postgres://postgres:postgres@localhost:5433/urban_planning}
SCHEMA=${SCHEMA_NAME:-public}
GEOM=${GEOMETRY_COLUMN:-geom}

function load_layer() {
  local dir="$1"; shift
  local table="$1"; shift
  local shp=$(ls -1 "$dir"/*.shp | head -n1 || true)
  if [[ -z "$shp" ]]; then
    echo "Skipping $table: no shapefile found in $dir"
    return
  fi
  echo "Loading $table from $shp"
  ogr2ogr -f PostgreSQL "PG:$DB_URL" "$shp" -nln "$SCHEMA.$table" -nlt PROMOTE_TO_MULTI -lco GEOMETRY_NAME=$GEOM -lco FID=gid -lco SPATIAL_INDEX=GIST -lco PRECISION=NO -overwrite
}

# Ensure schema exists and spatial index later
psql "$DB_URL" -v ON_ERROR_STOP=1 <<SQL
CREATE SCHEMA IF NOT EXISTS $SCHEMA;
SQL

load_layer "data/zoning" "zoning"
load_layer "data/flood" "flood_zones"
load_layer "data/crz" "crz"
load_layer "data/land_use" "land_use"
load_layer "data/roads" "roads"

psql "$DB_URL" -v ON_ERROR_STOP=1 <<SQL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = '$SCHEMA' AND indexname = 'zoning_geom_gix'
  ) THEN
    EXECUTE 'CREATE INDEX zoning_geom_gix ON '||quote_ident('$SCHEMA')||'.'||quote_ident('zoning')||' USING GIST ('||quote_ident('$GEOM')||')';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = '$SCHEMA' AND indexname = 'flood_geom_gix'
  ) THEN
    EXECUTE 'CREATE INDEX flood_geom_gix ON '||quote_ident('$SCHEMA')||'.'||quote_ident('flood_zones')||' USING GIST ('||quote_ident('$GEOM')||')';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = '$SCHEMA' AND indexname = 'crz_geom_gix'
  ) THEN
    EXECUTE 'CREATE INDEX crz_geom_gix ON '||quote_ident('$SCHEMA')||'.'||quote_ident('crz')||' USING GIST ('||quote_ident('$GEOM')||')';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = '$SCHEMA' AND indexname = 'land_use_geom_gix'
  ) THEN
    EXECUTE 'CREATE INDEX land_use_geom_gix ON '||quote_ident('$SCHEMA')||'.'||quote_ident('land_use')||' USING GIST ('||quote_ident('$GEOM')||')';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = '$SCHEMA' AND indexname = 'roads_geom_gix'
  ) THEN
    EXECUTE 'CREATE INDEX roads_geom_gix ON '||quote_ident('$SCHEMA')||'.'||quote_ident('roads')||' USING GIST ('||quote_ident('$GEOM')||')';
  END IF;
END$$;
SQL

echo "Import completed."
