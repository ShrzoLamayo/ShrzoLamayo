import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Note: In production, you would set your Mapbox token here
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || 'your-mapbox-token-here';

const GISMap = ({ latitude, longitude, sitePolygon, onPolygonChange }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [longitude, latitude],
      zoom: 16
    });

    // Add navigation control
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add marker for site location
    new mapboxgl.Marker({ color: 'red' })
      .setLngLat([longitude, latitude])
      .setPopup(new mapboxgl.Popup().setHTML('<p>Project Site</p>'))
      .addTo(map.current);

    // Add site boundary polygon if provided
    if (sitePolygon) {
      try {
        const polygonData = JSON.parse(sitePolygon);
        
        map.current.on('load', () => {
          // Add polygon source
          map.current.addSource('site-boundary', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: polygonData
            }
          });

          // Add polygon fill layer
          map.current.addLayer({
            id: 'site-boundary-fill',
            type: 'fill',
            source: 'site-boundary',
            paint: {
              'fill-color': '#ff0000',
              'fill-opacity': 0.3
            }
          });

          // Add polygon outline layer
          map.current.addLayer({
            id: 'site-boundary-line',
            type: 'line',
            source: 'site-boundary',
            paint: {
              'line-color': '#ff0000',
              'line-width': 2
            }
          });

          // Fit map to polygon bounds
          const coordinates = polygonData.coordinates[0];
          const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
          }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

          map.current.fitBounds(bounds, { padding: 50 });
        });
      } catch (error) {
        console.error('Error parsing site polygon:', error);
      }
    }

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [latitude, longitude, sitePolygon]);

  // Fallback to OpenStreetMap if Mapbox token is not available
  if (!mapboxgl.accessToken || mapboxgl.accessToken === 'your-mapbox-token-here') {
    return (
      <div 
        ref={mapContainer} 
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#f0f0f0',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}
      >
        <div style={{ textAlign: 'center', color: '#666' }}>
          <h3>Map Preview</h3>
          <p>Location: {latitude?.toFixed(6)}°, {longitude?.toFixed(6)}°</p>
          <p style={{ fontSize: '12px' }}>
            To display interactive map, please set REACT_APP_MAPBOX_TOKEN in environment variables
          </p>
          <a 
            href={`https://maps.google.com/?q=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1976d2' }}
          >
            View on Google Maps
          </a>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapContainer} 
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default GISMap;