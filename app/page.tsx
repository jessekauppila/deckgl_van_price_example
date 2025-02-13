'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Map } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';

import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { station_data } from './station_data';
import {
  snowDepth_COLOR_SCALE,
  INITIAL_VIEW_STATE,
  MAP_STYLE,
  snowDepth_lightingEffect,
  snowDepth_weatherToGeoJSON,
  snowDepth_getTooltip,
  SnowDepth_BlockProperties,
} from './deckGL/snowDepthChange';

//icon layer

import { MapView } from '@deck.gl/core';
import { IconLayer } from '@deck.gl/layers';
import IconClusterLayer from './deckGL/icon-cluster-layer';
import type { IconClusterLayerPickingInfo } from './deckGL/icon-cluster-layer';
import type { PickingInfo, MapViewState } from '@deck.gl/core';
import type { IconLayerProps } from '@deck.gl/layers';
//end icon layer

//////////////////////

const MAP_VIEW = new MapView({ repeat: true });

// Source data CSV
const DATA_URL =
  'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/icon/meteorites.json'; // eslint-disable-line

type IconWeather = {
  coordinates: [longitude: number, latitude: number];
  name: string;
  class: string;
  mass: number;
  year: number;
};

function renderTooltip(
  info: IconClusterLayerPickingInfo<IconWeather>
) {
  const { object, objects, x, y } = info;

  if (objects) {
    return (
      <div
        className="tooltip interactive"
        style={{ left: x, top: y }}
      >
        {objects.map(({ name, year, mass, class: meteorClass }) => {
          return (
            <div key={name}>
              <h5>{name}</h5>
              <div>Year: {year || 'unknown'}</div>
              <div>Class: {meteorClass}</div>
              <div>Mass: {mass}g</div>
            </div>
          );
        })}
      </div>
    );
  }

  if (!object) {
    return null;
  }

  return 'cluster' in object && object.cluster ? (
    <div className="tooltip" style={{ left: x, top: y }}>
      {object.point_count} records
    </div>
  ) : (
    <div className="tooltip" style={{ left: x, top: y }}>
      {object.name} {object.year ? `(${object.year})` : ''}
    </div>
  );
}

/////////////////

export default function App({
  weatherData = snowDepth_weatherToGeoJSON(station_data),
  iconData = DATA_URL,
  iconMapping = '/exampleData/location-icon-mapping.json',
  iconAtlas = '/exampleData/location-icon-atlas.png',
  showCluster = true,
  mapStyle = MAP_STYLE,
}: {
  weatherData?: FeatureCollection<
    Geometry,
    SnowDepth_BlockProperties
  >;
  iconData?: string;
  iconMapping?: string;
  iconAtlas?: string;
  mapStyle?: string;
  showCluster?: boolean;
}) {
  const [meteorites, setMeteorites] = useState<IconWeather[]>([]);
  const [iconAssetsLoaded, setIconAssetsLoaded] = useState(false);

  useEffect(() => {
    // Check if icon assets are loading
    Promise.all([
      fetch(iconMapping).then((r) => {
        if (!r.ok)
          throw new Error(`Failed to load icon mapping: ${r.status}`);
        return r.json();
      }),
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () =>
          reject(new Error('Failed to load icon atlas'));
        img.src = iconAtlas;
      }),
    ]).then(() => {
      setIconAssetsLoaded(true);
    });

    // Fetch meteorite data
    fetch(iconData)
      .then((r) => r.json())
      .then((data) => setMeteorites(data));
  }, [iconData, iconMapping, iconAtlas]);

  //icon layer
  const [hoverInfo, setHoverInfo] =
    useState<IconClusterLayerPickingInfo<IconWeather> | null>(null);

  const hideTooltip = useCallback(() => {
    setHoverInfo(null);
  }, []);
  const expandTooltip = useCallback((info: PickingInfo) => {
    if (info.picked && showCluster) {
      setHoverInfo(info);
    } else {
      setHoverInfo(null);
    }
  }, []);

  const layerProps: IconLayerProps<IconWeather> = {
    id: 'icon',
    data: meteorites,
    pickable: true,
    getPosition: (d) => d.coordinates,
    iconAtlas,
    iconMapping,
    getIcon: (d) => {
      console.log('Getting icon for:', d);
      return 'marker';
    },
    sizeScale: 20,
    sizeMinPixels: 6,
    // Add onError callback to catch any layer errors
    onError: (error) => {
      console.error('Icon Layer Error:', error);
    },
    // Add updateTriggers to ensure layer updates
    updateTriggers: {
      getIcon: meteorites,
      getPosition: meteorites,
    },
  };

  console.log('Layer Props:', layerProps);

  if (hoverInfo === null || !hoverInfo.objects) {
    layerProps.onHover = setHoverInfo;
  }
  //end icon layer

  //snowDepthlayer

  const [effects] = useState(() => [snowDepth_lightingEffect]);
  const elevScale = 5000;

  const layers = [
    // only needed when using shadows - a plane for shadows to drop on
    // new PolygonLayer<Position[]>({
    //   id: 'ground',
    //   data: landCover,
    //   stroked: false,
    //   getPolygon: (f) => f,
    //   getFillColor: [0, 0, 0, 0],
    // }),

    //snow depth change layer
    new GeoJsonLayer<SnowDepth_BlockProperties>({
      id: 'geojson',
      data: weatherData,
      opacity: 0.8,
      stroked: false,
      filled: true,
      extruded: true,
      wireframe: true,
      getElevation: (f) => {
        const baseHeight = f.properties.totalSnowDepthChange ?? 0;
        return baseHeight;
      },
      elevationScale: 5000,
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

    // Only add icon layer when we have data and assets
    ...(meteorites.length > 0 && iconAssetsLoaded
      ? [
          showCluster
            ? new IconClusterLayer<IconWeather>({
                ...layerProps,
                id: 'icon-cluster',
                sizeScale: 40,
                getPosition: (d) => {
                  console.log('Cluster position:', d.coordinates);
                  return d.coordinates;
                },
                radiusScale: 60,
                radiusMinPixels: 20,
                radiusMaxPixels: 100,
                onAfterUpdate: ({ layer }) => {
                  console.log('Cluster layer updated:', layer.props);
                },
              })
            : new IconLayer({
                ...layerProps,
                id: 'icon',
                getIcon: (d) => 'marker',
                sizeUnits: 'pixels',
                sizeScale: 20,
                sizeMinPixels: 10,
                onAfterUpdate: ({ layer }) => {
                  console.log('Icon layer updated:', layer.props);
                },
              }),
        ]
      : []),
  ];

  console.log('Final Layers:', layers);

  return (
    <DeckGL
      layers={layers}
      views={MAP_VIEW}
      effects={effects}
      initialViewState={INITIAL_VIEW_STATE}
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

          // Handle meteorite cluster layer
          if (
            info.layer?.id === 'icon-cluster' &&
            info.object?.properties
          ) {
            return {
              html: `
                <div>${
                  (info as IconClusterLayerPickingInfo<IconWeather>)
                    .objects?.length
                } meteorites in this area</div>
              `,
            };
          }

          // Handle individual meteorite
          if (
            (info.layer?.id === 'icon-cluster' ||
              info.layer?.id === 'icon') &&
            info.object
          ) {
            return {
              html: `
                <div><b>${info.object.name || 'Unknown'}</b></div>
                <div>Year: ${info.object.year || 'Unknown'}</div>
                <div>Class: ${info.object.class || 'Unknown'}</div>
                <div>Mass: ${info.object.mass || 'Unknown'}g</div>
              `,
            };
          }
        } catch (error) {
          console.error('Tooltip error:', error);
          return null;
        }

        return null;
      }}
    >
      <Map reuseMaps mapStyle={mapStyle} />

      {hoverInfo && renderTooltip(hoverInfo)}
    </DeckGL>
  );
}

export function renderToDOM(container: HTMLDivElement) {
  createRoot(container).render(<App />);
}
