import type {
  Color,
  Position,
  PickingInfo,
  MapViewState,
} from '@deck.gl/core';
import type { TooltipProps } from '@deck.gl/core/typed';
import type { Feature, Geometry } from 'geojson';
import { scaleThreshold } from 'd3-scale';
import {
  LightingEffect,
  AmbientLight,
  PointLight,
  _SunLight as SunLight,
} from '@deck.gl/core';

export type SnowDepth_BlockProperties = {
  stationName: string;
  totalSnowDepthChange: number | null;
  maxWindGust: string;
  curWindSpeed: string;
  relativeHumidity: string;
  windDirection: string;
  airTempMax: string;
  airTempMin: string;
  precipAccumOneHour: string;
  totalSnowDepth: string;
  windSpeedAvg: string;
};

export const snowDepth_COLOR_SCALE = scaleThreshold<number, Color>()
  .domain([0, 10, 20, 28, 31, 32, 33, 34, 35])
  .range([
    [150, 200, 255], // Deep blue-white (below 0°F)
    [170, 210, 255], // Less deep blue-white (0-10°F)
    [190, 220, 255], // Lighter blue-white (10-20°F)
    [210, 230, 255], // Very light blue-white (20-28°F)
    [230, 240, 255], // Nearly white (28-31°F)
    [250, 250, 255], // Pure white (31-32°F)
    [128, 0, 128], // Purple (32-33°F)
    [180, 0, 90], // Purple-orange transition (33-34°F)
    [255, 100, 0], // Bright orange (34-35°F)
    [255, 50, 0], // Red-orange (above 35°F)
  ] as Color[]);

export const snowDepth_INITIAL_VIEW_STATE: MapViewState = {
  latitude: 48.863017,
  longitude: -121.67785,
  zoom: 6,
  maxZoom: 16,
  pitch: 35,
  bearing: 0,
};

export const snowDepth_MAP_STYLE =
  //dark
  'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';
//light
//'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json';

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0,
});

const dirLight = new SunLight({
  timestamp: Date.UTC(2019, 7, 1, 22),
  color: [255, 255, 255],
  intensity: 0.1, // Increase light brightness
  _shadow: true,
});

export const snowDepth_lightingEffect = new LightingEffect({
  ambientLight,
  dirLight,
});

// Set shadow color
snowDepth_lightingEffect.shadowColor = [0, 0, 0, 0.1];

// set plane for shadow
export const snowDepth_landCover: Position[][] = [
  [
    [-125.0, 42.0], // Southwest (Southern Oregon)
    [-125.0, 55.0], // Northwest (Northern BC)
    [-115.0, 55.0], // Northeast (Northern BC)
    [-115.0, 42.0], // Southeast (Southern Oregon)
    [-125.0, 42.0], // Close the polygon
  ],
];

export function snowDepth_getTooltip(
  info: PickingInfo
): TooltipContent {
  const object = info.object as Feature<
    Geometry,
    SnowDepth_BlockProperties
  >;
  return object
    ? {
        html: `\
      <div><b>Station Name</b></div>
      <div>${object.properties.stationName}</div>
      <div><b>Snow Depth</b></div>
      <div>${object.properties.totalSnowDepth} in</div>
      <div><b>Snow Depth Change</b></div>
      <div>${object.properties.totalSnowDepthChange} in</div>
      <div><b>1 Hour Precipitation</b></div>
      <div>${object.properties.precipAccumOneHour}</div>
      <div><b>Current Air Temperature</b></div>
      <div>${object.properties.curAirTemp} °F</div>
      <div><b>Current Wind Speed</b></div>
      <div>${object.properties.curWindSpeed}</div>
      <div><b>Wind Direction</b></div>
      <div>${object.properties.windDirection}</div>
    `,
      }
    : null;
}

interface WeatherStation {
  Station: string;
  Latitude: string;
  Longitude: string;
  Elevation: string;
  Stid: string;
  'Total Snow Depth': string;
  'Total Snow Depth Change': string;
  '24h Snow Accumulation': string;
  'Cur Air Temp': string;
  'Cur Wind Speed': string;
  'Max Wind Gust': string;
  'Wind Direction': string;
  'Wind Speed Avg': string;
  'Relative Humidity': string;
  'Api Fetch Time': string;
  'Air Temp Max': string;
}

export function snowDepth_weatherToGeoJSON(
  weatherData: WeatherStation[]
) {
  const parseValue = (value: string) => {
    if (value === '-') return null;
    const num = parseFloat(value.split(' ')[0]);
    return isNaN(num) ? null : num;
  };

  // Function to create a circular polygon
  const createCircle = (
    longitude: number,
    latitude: number,
    radius: number,
    numPoints: number = 32
  ) => {
    const coordinates = [];
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI; // Distribute points evenly
      const dx = radius * Math.cos(angle);
      const dy = radius * Math.sin(angle);
      coordinates.push([longitude + dx, latitude + dy]);
    }
    coordinates.push(coordinates[0]); // Close the polygon
    return [coordinates]; // GeoJSON expects an array of rings
  };

  return {
    type: 'FeatureCollection' as const,
    features: weatherData.map((station) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: createCircle(
          parseFloat(station['Longitude']),
          parseFloat(station['Latitude']),
          0.03, // Adjust radius as needed
          8 // Adjust number of points as needed
        ),
      },
      properties: {
        stationName: station['Station'],
        latitude: parseFloat(station['Latitude']),
        longitude: parseFloat(station['Longitude']),
        totalSnowDepth: parseValue(station['Total Snow Depth']),
        totalSnowDepthChange: parseValue(
          station['Total Snow Depth Change']
        ),
        snowAccumulation24h: parseValue(
          station['24h Snow Accumulation']
        ),
        curAirTemp: parseValue(station['Cur Air Temp']),
        curWindSpeed: station['Cur Wind Speed'],
        maxWindGust: station['Max Wind Gust'],
        windDirection: station['Wind Direction'],
        windSpeedAvg: station['Wind Speed Avg'],
        elevation: parseValue(station['Elevation']),
        relativeHumidity: parseValue(station['Relative Humidity']),
        fetchTime: station['Api Fetch Time'],
        airTempMax: parseValue(station['Air Temp Max']),
      },
    })),
  };
}
