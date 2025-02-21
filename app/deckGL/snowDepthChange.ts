import type {
  Color,
  Position,
  PickingInfo,
  MapViewState,
} from '@deck.gl/core';
import type {
  TooltipProps,
  TooltipContent,
} from '@deck.gl/core/typed';
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
  .domain([31, 34])
  .range([
    [255, 255, 255], // White (below 31°F)
    [30, 144, 255], // DodgerBlue (31-34°F)
    [150, 255, 150], // Pastel green (above 34°F)
  ] as Color[]);

export const INITIAL_VIEW_STATE: MapViewState = {
  latitude: 48.863017,
  longitude: -121.67785,
  zoom: 6,
  maxZoom: 16,
  pitch: 35,
  bearing: 0,
};

export const snowDepth_MAP_STYLE =
  //dark
  //'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';
  //light
  //'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json';
  //for use with
  'mapbox://styles/mapbox/dark-v11'; //for use with terrain!

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0,
});

const dirLight = new SunLight({
  timestamp: Date.UTC(2019, 7, 1, 22),
  color: [255, 255, 255],
  intensity: 1.0, // Increase light brightness
  _shadow: true,
});

export const snowDepth_lightingEffect = new LightingEffect({
  ambientLight,
  dirLight,
});

// Set shadow color
snowDepth_lightingEffect.shadowColor = [0, 0, 0, 0.3];

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

  const getWindStrengthColor = (speed: number) => {
    if (speed <= 0.6) return 'rgb(255, 255, 255)';
    else if (speed <= 16.2) return 'rgb(255, 255, 180)';
    else if (speed <= 25.5) return 'rgb(255, 218, 185)';
    else if (speed <= 37.3) return 'rgb(255, 182, 193)';
    else return 'rgb(220, 20, 60)';
  };

  const getTempConditionColor = (temp: number) => {
    if (temp <= 31) return 'rgb(255, 255, 255)';
    else if (temp <= 34) return 'rgb(135, 206, 235)';
    else return 'rgb(150, 255, 150)';
  };

  const getTempConditionWithRange = (temp: number) => {
    if (temp <= 31) return '<b>Snow</b> (< 31°F)';
    else if (temp <= 34)
      return '<b>Mixed Precipitation</b> (31-34°F)';
    else return '<b>Rain</b> (> 34°F)';
  };

  const getWindStrengthWithRange = (speed: number) => {
    if (speed <= 0.6) return '"<b>Calm</b> (≤ 0.6 mph)"';
    else if (speed <= 16.2) return '<b>Light</b> (0.6-16.2 mph)';
    else if (speed <= 25.5) return '<b>Moderate</b> (16.2-25.5 mph)';
    else if (speed <= 37.3) return '<b>Strong</b> (25.5-37.3 mph)';
    else return '<b>Extreme</b> (> 37.3 mph)';
  };

  return object
    ? {
        html: `\
      <div style="text-decoration: underline; font-size: 1.2em;"><b>${
        object.properties.stationName
      }</b></div>
      <div style="text-decoration: underline;"><b>Snow Depth Change</b></div>
      <div>${object.properties.totalSnowDepthChange} in</div>
      <div style="text-decoration: underline;"><b>Temperature Conditions</b></div>
      <div style="display: flex; align-items: center; gap: 8px;">
        ${getTempConditionWithRange(
          parseFloat(object.properties.airTempMax)
        )} 
        <div style="width: 20px; height: 20px; background-color: ${getTempConditionColor(
          parseFloat(object.properties.airTempMax)
        )}; border: 1px solid black; display: inline-block;"></div>
        (<b>${object.properties.airTempMax} °F</b>)
      </div>
      <div style="text-decoration: underline;"><b>Wind Information</b></div>
      <div style="display: flex; align-items: center; gap: 8px;">
        ${getWindStrengthWithRange(
          parseFloat(object.properties.curWindSpeed)
        )} 
        <div style="width: 20px; height: 20px; background-color: ${getWindStrengthColor(
          parseFloat(object.properties.curWindSpeed)
        )}; border: 1px solid black; display: inline-block;"></div>
        (<b>${object.properties.curWindSpeed}</b>)
      </div>
      <div style="text-decoration: underline;"><b>Wind Direction</b></div>
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
