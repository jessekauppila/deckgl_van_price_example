'use client';

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Map } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, PolygonLayer } from '@deck.gl/layers';
import { IconLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';

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

type WeatherStation = {
  name: string;
  coordinates: [longitude: number, latitude: number];
  windDirection: string;
  windSpeed: string;
};

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
        // console.log(`Station: ${f.properties.stationName}`);
        // console.log(
        //   `Snow Change: ${f.properties.totalSnowDepthChange}`
        // );
        // console.log(`Base Height (before scale): ${baseHeight}`);
        // console.log(`Elevation Scale: ${elevScale}`);
        // console.log(`Final Height (after scale): ${finalHeight}`);
        // console.log(`Avg Wind Speed: ${f.properties.windSpeedAvg}`);
        // console.log(`Wind Direction: ${f.properties.windDirection}`);
        // console.log(`Max Wind Gust: ${f.properties.maxWindGust}`);
        // console.log(`Cur Wind Speed: ${f.properties.curWindSpeed}`);
        // console.log(
        //   `Relative Humidity: ${f.properties.relativeHumidity}`
        // );
        // console.log(`Air Temp Max: ${f.properties.airTempMax}`);
        // console.log(`Air Temp Min: ${f.properties.airTempMin}`);
        // console.log(
        //   `Precip Accum One Hour: ${f.properties.precipAccumOneHour}`
        // );
        // console.log(
        //   `Total Snow Depth: ${f.properties.totalSnowDepth}`
        // );
        //console.log(`Total Snow Depth Change: ${f.properties.totalSnowDepthChange}`);

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
    new IconLayer<WeatherStation>({
      id: 'weather-stations',
      data: station_data.map((station) => ({
        name: station.Station,
        coordinates: [station.Longitude, station.Latitude],
        windDirection: station.windDirection,
        windSpeed: station.windSpeed,
      })),
      getIcon: (d) => {
        const direction = d.windDirection.toLowerCase();
        const speed = parseFloat(d.windSpeed.split(' ')[0]);

        let strength = 'calm';
        if (speed <= 0.6) strength = 'calm';
        else if (speed <= 16.2) strength = 'light';
        else if (speed <= 25.5) strength = 'moderate';
        else if (speed <= 37.3) strength = 'strong';
        else strength = 'extreme';

        return `wind-direction-${direction}-${strength}`;
      },
      getPosition: (d) => d.coordinates,
      getSize: 100,
      iconAtlas: '/windAtlas/wind_arrows_location_icon_atlas.png',
      iconMapping: '/windAtlas/location-icon-mapping.json',
      pickable: true,
    }),
  ];

  return (
    <DeckGL
      layers={snowDepth_layer}
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
      <Map reuseMaps mapStyle={mapStyle} attributionControl={true} />
    </DeckGL>
  );
}

export function renderToDOM(container: HTMLDivElement) {
  createRoot(container).render(<App />);
}
