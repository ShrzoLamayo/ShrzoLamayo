import axios from 'axios';
import { config } from '../config/env.js';
import type { ElevationInfo, LatLng } from '../types/spatial.js';

export async function getElevation({ lat, lng }: LatLng): Promise<ElevationInfo | null> {
  const apiKey = config.google.apiKey;
  if (!apiKey) return null;

  const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${apiKey}`;
  const { data } = await axios.get(url, { timeout: 8000 });
  if (data.status !== 'OK' || !data.results?.length) return null;
  const result = data.results[0];
  return {
    elevation_m: typeof result.elevation === 'number' ? result.elevation : null,
    resolution_m: typeof result.resolution === 'number' ? result.resolution : null,
  };
}
