export type LatLng = {
  lat: number;
  lng: number;
};

export type SpatialContext = {
  srid: number; // Database SRID of stored geometries (e.g., 4326 or 3857)
};

export type ZoningInfo = {
  zone_code: string | null;
  zone_name: string | null;
  distance_m?: number | null;
};

export type FloodInfo = {
  flood_zone: string | null;
  within: boolean;
};

export type CRZInfo = {
  crz_zone: string | null;
  within: boolean;
};

export type LandUseInfo = {
  land_use: string | null;
};

export type RoadInfo = {
  nearest_road_name: string | null;
  road_width_m: number | null;
  distance_m: number | null;
};

export type ElevationInfo = {
  elevation_m: number | null;
  resolution_m?: number | null;
};

export type AnalysisResult = {
  input: LatLng;
  zoning: ZoningInfo | null;
  flood: FloodInfo | null;
  crz: CRZInfo | null;
  land_use: LandUseInfo | null;
  road: RoadInfo | null;
  elevation: ElevationInfo | null;
};
