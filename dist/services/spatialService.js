import { query } from '../db/pool.js';
import { config } from '../config/env.js';
function pointWKT(lat, lng) {
    return `SRID=4326;POINT(${lng} ${lat})`;
}
export async function getZoning(latlng) {
    const { zoningTable, schema, geometryColumn } = config.spatial;
    const sql = `
    SELECT zone_code, zone_name,
           ST_Distance(
             ST_Transform(ST_GeomFromText($1), 3857),
             ST_Transform(${geometryColumn}, 3857)
           ) AS distance_m
    FROM ${schema}.${zoningTable}
    WHERE ST_DWithin(
      ST_Transform(ST_GeomFromText($1), 3857),
      ST_Transform(${geometryColumn}, 3857),
      200
    )
    ORDER BY distance_m ASC
    LIMIT 1;
  `;
    const { rows } = await query(sql, [pointWKT(latlng.lat, latlng.lng)]);
    return rows[0] ?? null;
}
export async function getFlood(latlng) {
    const { floodTable, schema, geometryColumn } = config.spatial;
    const sql = `
    SELECT flood_zone,
           ST_Intersects(
             ST_SetSRID(ST_MakePoint($2, $1), 4326),
             ${geometryColumn}
           ) AS within
    FROM ${schema}.${floodTable}
    WHERE ST_DWithin(
      ST_Transform(ST_SetSRID(ST_MakePoint($2, $1), 4326), 3857),
      ST_Transform(${geometryColumn}, 3857),
      500
    )
    ORDER BY within DESC
    LIMIT 1;
  `;
    const { rows } = await query(sql, [latlng.lat, latlng.lng]);
    return rows[0] ?? null;
}
export async function getCRZ(latlng) {
    const { crzTable, schema, geometryColumn } = config.spatial;
    const sql = `
    SELECT crz_zone,
           ST_Intersects(
             ST_SetSRID(ST_MakePoint($2, $1), 4326),
             ${geometryColumn}
           ) AS within
    FROM ${schema}.${crzTable}
    WHERE ST_DWithin(
      ST_Transform(ST_SetSRID(ST_MakePoint($2, $1), 4326), 3857),
      ST_Transform(${geometryColumn}, 3857),
      2000
    )
    ORDER BY within DESC
    LIMIT 1;
  `;
    const { rows } = await query(sql, [latlng.lat, latlng.lng]);
    return rows[0] ?? null;
}
export async function getLandUse(latlng) {
    const { landUseTable, schema, geometryColumn } = config.spatial;
    const sql = `
    SELECT land_use
    FROM ${schema}.${landUseTable}
    WHERE ST_Intersects(
      ST_SetSRID(ST_MakePoint($2, $1), 4326),
      ${geometryColumn}
    )
    LIMIT 1;
  `;
    const { rows } = await query(sql, [latlng.lat, latlng.lng]);
    return rows[0] ?? null;
}
export async function getNearestRoad(latlng) {
    const { roadsTable, schema, geometryColumn, roadSearchRadiusMeters } = config.spatial;
    const sql = `
    WITH p AS (
      SELECT ST_Transform(ST_SetSRID(ST_MakePoint($2, $1), 4326), 3857) AS g
    )
    SELECT r.road_name AS nearest_road_name,
           COALESCE(r.road_width_m, r.width_m, r.ROW_width, NULL) AS road_width_m,
           ST_Distance(p.g, ST_Transform(${geometryColumn}, 3857)) AS distance_m
    FROM ${schema}.${roadsTable} r, p
    WHERE ST_DWithin(p.g, ST_Transform(${geometryColumn}, 3857), $3)
    ORDER BY distance_m ASC
    LIMIT 1;
  `;
    const { rows } = await query(sql, [latlng.lat, latlng.lng, roadSearchRadiusMeters]);
    return rows[0] ?? null;
}
//# sourceMappingURL=spatialService.js.map