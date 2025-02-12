'use client';

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Map } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, PolygonLayer } from '@deck.gl/layers';

import type { Feature, Geometry } from 'geojson';
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

export default function App({
  data = snowDepth_weatherToGeoJSON(station_data),
  mapStyle = snowDepth_MAP_STYLE,
}: {
  data?: string | Feature<Geometry, SnowDepth_BlockProperties>[];
  mapStyle?: string;
}) {
  const [effects] = useState(() => [snowDepth_lightingEffect]);

  const elevScale = 5000;

  const snowDepth_layer = [
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
      data,
      opacity: 0.8,
      stroked: false,
      filled: true,
      extruded: true,
      wireframe: true,

      getElevation: (f) => {
        const baseHeight = f.properties.totalSnowDepthChange ?? 0;
        const finalHeight = baseHeight * elevScale;
        console.log(`Station: ${f.properties.stationName}`);
        console.log(
          `Snow Change: ${f.properties.totalSnowDepthChange}`
        );
        console.log(`Base Height (before scale): ${baseHeight}`);
        console.log(`Elevation Scale: ${elevScale}`);
        console.log(`Final Height (after scale): ${finalHeight}`);
        console.log('-------------------');
        return baseHeight; // Layer will apply elevationScale automatically
      },
      elevationRange: [0, 15000],
      elevationScale: elevScale,
      getFillColor: (f) =>
        snowDepth_COLOR_SCALE(f.properties.totalSnowDepthChange ?? 0),
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
  ];

  return (
    <DeckGL
      layers={snowDepth_layer}
      effects={effects}
      initialViewState={snowDepth_INITIAL_VIEW_STATE}
      controller={true}
      getTooltip={snowDepth_getTooltip}
    >
      <Map reuseMaps mapStyle={mapStyle} />
    </DeckGL>
  );
}

export function renderToDOM(container: HTMLDivElement) {
  createRoot(container).render(<App />);
}
