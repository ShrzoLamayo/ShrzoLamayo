import type { Request, Response } from 'express';
import { z } from 'zod';
import type { AnalysisResult } from '../types/spatial.js';
import { getElevation } from '../services/elevationService.js';
import { getZoning, getFlood, getCRZ, getLandUse, getNearestRoad } from '../services/spatialService.js';

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export async function analyze(req: Request, res: Response) {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: { message: 'Invalid lat/lng', details: parsed.error.flatten() } });
  }

  const { lat, lng } = parsed.data;

  const [zoning, flood, crz, landUse, road, elevation] = await Promise.all([
    getZoning({ lat, lng }),
    getFlood({ lat, lng }),
    getCRZ({ lat, lng }),
    getLandUse({ lat, lng }),
    getNearestRoad({ lat, lng }),
    getElevation({ lat, lng }),
  ]);

  const result: AnalysisResult = {
    input: { lat, lng },
    zoning: zoning ?? null,
    flood: flood ?? null,
    crz: crz ?? null,
    land_use: landUse ?? null,
    road: road ?? null,
    elevation: elevation ?? null,
  };

  return res.json(result);
}
