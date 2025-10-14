Place official shapefiles (.shp, .shx, .dbf, .prj) under /data in subfolders:
- /data/zoning
- /data/flood
- /data/crz
- /data/land_use
- /data/roads

Use the helper script to load into PostGIS (requires GDAL/ogr2ogr):

```
./scripts/import/load_shapefiles.sh
```
