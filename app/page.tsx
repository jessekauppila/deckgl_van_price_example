'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useState, useEffect, useMemo } from 'react';
import type {
  Color,
  MapViewState,
  PickingInfo,
  _SunLight as SunLight,
  Position,
  Deck,
  Widget,
} from '@deck.gl/core';
import DeckGL, { useWidget } from '@deck.gl/react'; //, { CompassWidget }
import {
  IconLayer,
  GeoJsonLayer,
  TextLayerPolygonLayer,
  PolygonLayer,
} from '@deck.gl/layers';
import { createPortal } from 'react-dom';
import { _TerrainExtension as TerrainExtension } from '@deck.gl/extensions';
import type { TerrainLayerProps } from '@deck.gl/geo-layers';
import { createRoot } from 'react-dom/client';
//import { Map } from 'react-map-gl/maplibre';
import { Map } from 'react-map-gl';
import { TerrainLayer } from '@deck.gl/geo-layers';
import type {
  FeatureCollection,
  Feature,
  LineString,
  Geometry,
} from 'geojson';
import { station_data } from './station_data';
import forecastZonesData from './data/forecastZones.json';
import {
  snowDepth_COLOR_SCALE,
  INITIAL_VIEW_STATE,
  snowDepth_MAP_STYLE, // Make sure this is exported
  snowDepth_lightingEffect,
  snowDepth_weatherToGeoJSON,
  snowDepth_getTooltip,
  SnowDepth_BlockProperties,
} from './deckGL/snowDepthChange';
import {
  Switch,
  FormGroup,
  FormControlLabel,
  Typography,
} from '@mui/material';

interface LayersWidgetProps {
  element: HTMLDivElement;
  toggleLayer: (id: string) => void;
  layersState: Record<string, boolean>;
}

class LayersWidget implements Widget {
  id: string;
  props: LayersWidgetProps;

  constructor(props: LayersWidgetProps) {
    this.id = 'my-widget';
    this.props = { ...props };
  }

  onAdd(): HTMLDivElement {
    return this.props.element;
  }

  setProps(props: Partial<LayersWidgetProps>): void {
    this.props = { ...this.props, ...props };
  }
}

const MyReactWidget: React.FC<{
  toggleLayer: (id: string) => void;
  layersState: Record<string, boolean>;
}> = ({ toggleLayer, layersState }) => {
  const element = useMemo(() => document.createElement('div'), []);
  const _widget = useWidget(LayersWidget, {
    element,
    toggleLayer,
    layersState,
  });

  return createPortal(
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        width: '200px',
        background: 'rgb(0, 0, 0, .2)',
        padding: '8px',
        borderRadius: '5px',
        //boxShadow: '0px 4px 6px rgba(0,0,0,0)',
        pointerEvents: 'auto',
        zIndex: 1,
        color: '#e0e0e0',
      }}
    >
      <Typography
        variant="h6"
        sx={{ fontSize: '1rem', mb: 1, color: 'inherit' }}
      >
        {/* Layers */}
      </Typography>
      <FormGroup>
        <FormControlLabel
          sx={formControlStyle(layersState.forecastZones)}
          control={
            <Switch
              size="small"
              checked={layersState.forecastZones}
              onChange={() => toggleLayer('forecastZones')}
              sx={switchStyle}
            />
          }
          label="Forecast Zones"
        />
        {/* <FormControlLabel
          sx={formControlStyle(layersState.ground_for_shadow)}
          control={
            <Switch
              size="small"
              checked={layersState.ground_for_shadow}
              onChange={() => toggleLayer('ground_for_shadow')}
              sx={switchStyle}
            />
          }
          label="Ground for Shadows"
        /> */}
        <FormControlLabel
          sx={formControlStyle(layersState.windArrows)}
          control={
            <Switch
              size="small"
              checked={layersState.windArrows}
              onChange={() => toggleLayer('windArrows')}
              sx={switchStyle}
            />
          }
          label="Wind Arrows"
        />
        <FormControlLabel
          sx={formControlStyle(layersState.snowDepthChange)}
          control={
            <Switch
              size="small"
              checked={layersState.snowDepthChange}
              onChange={() => toggleLayer('snowDepthChange')}
              sx={switchStyle}
            />
          }
          label="Snow Depth Change"
        />
        <FormControlLabel
          sx={formControlStyle(layersState.terrain)}
          control={
            <Switch
              size="small"
              checked={layersState.terrain}
              onChange={() => toggleLayer('terrain')}
              sx={switchStyle}
            />
          }
          label="Terrain"
        />
      </FormGroup>
    </div>,
    element
  );
};

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

const landCover: Position[][] = [
  [
    [-139.848974, 30.543541], // Southwest corner (1000 miles SW)
    [-139.848974, 64.002494], // Northwest corner (1000 miles NW)
    [-101.916071, 64.002494], // Northeast corner (1000 miles NE)
    [-101.916071, 30.543541], // Southeast corner (1000 miles SE)
    [-139.848974, 30.543541], // Close the polygon by repeating first point
  ],
];

type ForecastZones = {
  name: string;
  contour: [number, number][];
};

const switchStyle = {
  '& .MuiSwitch-switchBase': {
    color: '#424242', // dark grey when unchecked
    '&.Mui-checked': {
      color: '#9e9e9e', // medium grey when checked (instead of white)
      '& + .MuiSwitch-track': {
        backgroundColor: '#757575', // slightly darker grey track when checked
      },
    },
  },
  '& .MuiSwitch-track': {
    backgroundColor: '#616161', // dark grey track when unchecked
  },
};

const formControlStyle = (isChecked: boolean) => ({
  '& .MuiTypography-root': {
    color: isChecked ? '#9e9e9e' : '#424242',
    fontSize: '0.75rem',
  },
});

export default function App({
  data = snowDepth_weatherToGeoJSON(station_data),
}: {
  data?: {
    type: 'FeatureCollection';
    features: Feature<Geometry, SnowDepth_BlockProperties>[];
  };
  mapStyle?: string;
  showCluster?: boolean;
}) {
  console.log(data);
  const [effects] = useState(() => [snowDepth_lightingEffect]);

  // Store layer visibility in state
  const [layersState, setLayersState] = useState({
    forecastZones: true,
    ground_for_shadow: true,
    windArrows: true,
    snowDepthChange: true,
    terrain: false,
  });

  // Function to toggle a layer's visibility
  const toggleLayer = (id: string) => {
    setLayersState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const layers = [
    // only needed when using shadows - a plane for shadows to drop on
    layersState.forecastZones &&
      new PolygonLayer<ForecastZones>({
        id: 'forecast-zones',
        data: forecastZonesData.forecastZones,
        stroked: true,
        filled: false,
        getPolygon: (d) => d.contour,
        getLineColor: [100, 0, 100, 200], // Light purple, more opaque
        getLineWidth: 2000,
        pickable: true,
      }),

    layersState.ground_for_shadow &&
      new PolygonLayer<Position[]>({
        id: 'ground_for_shadow',
        data: landCover,
        stroked: false,
        filled: true,
        getPolygon: (f) => f,
        getFillColor: [0, 0, 0, 0], // Just transparent, no white or opacity setting
      }),

    layersState.windArrows &&
      new IconLayer({
        id: 'windArrows',
        data: data.features,
        billboard: false,
        autoHighlight: true,
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
        getSize: 100,
        getAngle: 0,
        angleAlignment: 'map',
        iconAtlas: '/windAtlas/wind_arrows_location_icon_atlas.png',
        iconMapping: '/windAtlas/location-icon-mapping.json',
        pickable: true,
        shadowEnabled: false,
        alphaCutoff: 0.05,
        sizeScale: 1,
      }),

    layersState.snowDepthChange &&
      new GeoJsonLayer<SnowDepth_BlockProperties>({
        id: 'snowDepthChange',
        data: data,
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
        elevationScale: 2500,
        getFillColor: (f) => {
          const maxTemp = f.properties.airTempMax;
          return snowDepth_COLOR_SCALE(maxTemp);
        },
        getLineColor: (f) => {
          const maxTemp = f.properties.airTempMax;
          return snowDepth_COLOR_SCALE(maxTemp);
        },
        pickable: true,
        shadowEnabled: true,
        material: {
          ambient: 0.64,
          diffuse: 0.6,
          shininess: 32,
          specularColor: [51, 51, 51],
        },
        transitions: {
          geometry: {
            duration: 3000,
            type: 'spring',
          },
        },
      }),

    layersState.terrain &&
      new TerrainLayer({
        id: 'terrain',
        minZoom: 0,
        maxZoom: 15,
        strategy: 'no-overlap',
        elevationDecoder: ELEVATION_DECODER,
        elevationData: TERRAIN_IMAGE,
        texture: SURFACE_IMAGE,
        wireframe: false,
        color: [255, 255, 255],
        material: {
          diffuse: 1,
        },
        operation: 'terrain+draw',
        loadOptions: {
          fetch: {
            mode: 'cors',
          },
        },
      }),
  ];

  return (
    <DeckGL
      layers={layers}
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
            return snowDepth_getTooltip(info);
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
      <Map
        reuseMaps
        mapStyle={snowDepth_MAP_STYLE}
        mapboxAccessToken={
          process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
        }
      />
      <MyReactWidget
        toggleLayer={toggleLayer}
        layersState={layersState}
      />
    </DeckGL>
  );
}

export function renderToDOM(container: HTMLDivElement) {
  createRoot(container).render(<App />);
}
