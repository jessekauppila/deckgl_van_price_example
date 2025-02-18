'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
//import { Map } from 'react-map-gl/maplibre';
import { Map } from 'react-map-gl';
import { TerrainLayer } from '@deck.gl/geo-layers';

import DeckGL from '@deck.gl/react';
import {
  IconLayer,
  GeoJsonLayer,
  TextLayerPolygonLayer,
} from '@deck.gl/layers';
import { _TerrainExtension as TerrainExtension } from '@deck.gl/extensions';
import type { TerrainLayerProps } from '@deck.gl/geo-layers';
import type { Color, MapViewState, PickingInfo } from '@deck.gl/core';

import type {
  FeatureCollection,
  Feature,
  LineString,
  Geometry,
} from 'geojson';
import { station_data } from './station_data';
import {
  snowDepth_COLOR_SCALE,
  snowDepth_INITIAL_VIEW_STATE,
  snowDepth_MAP_STYLE,
  snowDepth_lightingEffect,
  snowDepth_weatherToGeoJSON,
  snowDepth_getTooltip,
  SnowDepth_BlockProperties,
} from './deckGL/snowDepthChange';

//////////////////////
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN; // eslint-disable-line
const TERRAIN_IMAGE = `https://api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.png?access_token=${MAPBOX_TOKEN}`;
const SURFACE_IMAGE = `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.png?access_token=${MAPBOX_TOKEN}`;

// https://docs.mapbox.com/help/troubleshooting/access-elevation-data/#mapbox-terrain-rgb
// Note - the elevation rendered by this example is greatly exagerated!
const ELEVATION_DECODER: TerrainLayerProps['elevationDecoder'] = {
  rScaler: 6553.6,
  gScaler: 25.6,
  bScaler: 0.1,
  offset: -10000,
};
//////////////////////

type WeatherStation = {
  name: string;
  coordinates: [longitude: number, latitude: number];
  windDirection: string;
  windSpeed: string;
  windSpeedAvg: string;
};

export default function App({
  data = snowDepth_weatherToGeoJSON(station_data),
  mapStyle = snowDepth_MAP_STYLE,
}: {
  data?: {
    type: 'FeatureCollection';
    features: Feature<Geometry, SnowDepth_BlockProperties>[];
  };
  mapStyle?: string;
}) {
  console.log(data);
  const [effects] = useState(() => [snowDepth_lightingEffect]);

  const layers = [
    // only needed when using shadows - a plane for shadows to drop on
    // new PolygonLayer<Position[]>({
    //   id: 'ground',
    //   data: landCover,
    //   stroked: false,
    //   getPolygon: (f) => f,
    //   getFillColor: [0, 0, 0, 0],
    // }),
    new GeoJsonLayer<SnowDepth_BlockProperties>({
      id: 'geojson',
      data: data, // Pass the entire FeatureCollection, not just features
      opacity: 0.8,
      stroked: false,
      filled: true,
      extruded: true,
      wireframe: true,

      getElevation: (f) => {
        const baseHeight = f.properties.totalSnowDepthChange ?? 0;
        //const finalHeight = baseHeight * elevScale;
        return baseHeight; // Layer will apply elevationScale automatically
      },
      elevationRange: [0, 15000],
      elevationScale: 5000,
      getFillColor: (f) => {
        const maxTemp = f.properties.airTempMax;
        return snowDepth_COLOR_SCALE(maxTemp);
      },
      getLineColor: [255, 255, 255],
      pickable: true,
      material: {
        ambient: 0.64,
        diffuse: 0.6,
        shininess: 32,
        specularColor: [51, 51, 51],
      },

      //coverage: 1,
      transitions: {
        elevationScale: 3000,
      },
    }),
    new IconLayer({
      id: 'weather-stations',
      data: data.features,
      getIcon: (f) => {
        if (!f?.properties?.windDirection) {
          return 'default-icon';
        }

        const direction = f.properties.windDirection.toLowerCase();
        const speed = f.properties.windSpeedAvg
          ? parseFloat(f.properties.windSpeedAvg.split(' ')[0])
          : 0;

        let strength = 'calm';
        if (speed <= 0.6) strength = 'calm';
        else if (speed <= 16.2) strength = 'light';
        else if (speed <= 25.5) strength = 'moderate';
        else if (speed <= 37.3) strength = 'strong';
        else strength = 'extreme';

        return `wind-direction-${direction}-${strength}`;
      },
      getPosition: (f) => [
        f.properties.longitude,
        f.properties.latitude,
      ],
      getSize: 40,
      iconAtlas: '/windAtlas/wind_arrows_location_icon_atlas.png',
      iconMapping: '/windAtlas/location-icon-mapping.json',
      pickable: true,
    }),

    // new TerrainLayer({
    //   id: 'terrain',
    //   minZoom: 0,
    //   strategy: 'no-overlap',
    //   elevationDecoder: ELEVATION_DECODER,
    //   elevationData: TERRAIN_IMAGE,
    //   texture: SURFACE_IMAGE,
    //   wireframe: false,
    //   color: [255, 255, 255],
    //   operation: 'terrain+draw',
    // }),
  ];

  return (
    <DeckGL
      layers={layers}
      effects={effects}
      initialViewState={snowDepth_INITIAL_VIEW_STATE}
      controller={true}
      getTooltip={(info) => {
        if (!info.object) return null;

        try {
          // Handle snow depth layer
          if (
            info.layer?.id === 'geojson' &&
            info.object?.properties
          ) {
            return {
              html: `
                <div><b>Snow Depth Change</b></div>
                <div>${info.object.properties.totalSnowDepthChange} in</div>
                <div><b>Station Name</b></div>
                <div>${info.object.properties.stationName}</div>
              `,
            };
          }

          // Handle weather station icons
          if (info.layer?.id === 'weather-stations') {
            return {
              html: `<div>${info.object.name}</div>`,
            };
          }

          return null;
        } catch (error) {
          console.error('Tooltip error:', error);
          return null;
        }
      }}
    >
      {/* <Map reuseMaps mapStyle={mapStyle} attributionControl={true} /> */}
      <Map
        reuseMaps
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={
          process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
        }
      />
    </DeckGL>
  );
}

export function renderToDOM(container: HTMLDivElement) {
  createRoot(container).render(<App />);
}
