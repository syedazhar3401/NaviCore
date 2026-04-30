import type { WeatherAlert } from '@/types/weather';

export const MOCK_WEATHER_ALERTS: WeatherAlert[] = [
  // Hurricane in Gulf of Mexico
  {
    id: 'hurricane-milton-001',
    event: 'Hurricane Warning',
    severity: 'Extreme',
    headline: 'Hurricane Milton approaching Florida Gulf Coast',
    description: 'Life-threatening storm surge and destructive winds expected. Storm surge 10-15 feet possible. Maximum sustained winds 140 mph.',
    areaDesc: 'Tampa Bay, Sarasota, Fort Myers',
    onset: new Date(Date.now() - 1000 * 60 * 60 * 6),
    expires: new Date(Date.now() + 1000 * 60 * 60 * 48),
    coordinates: [
      [-83.5, 27.5], [-82.5, 27.5], [-82.0, 26.5], [-82.0, 25.5],
      [-82.5, 25.0], [-83.0, 25.0], [-83.5, 25.5], [-83.5, 27.5]
    ],
    centroid: [-82.5, 26.5],
  },
  // Tornado outbreak
  {
    id: 'tornado-outbreak-001',
    event: 'Tornado Warning',
    severity: 'Severe',
    headline: 'Multiple tornadoes confirmed in Oklahoma',
    description: 'Radar indicated tornadoes with damage reported. Take shelter immediately in interior room on lowest floor.',
    areaDesc: 'Oklahoma City metro area',
    onset: new Date(Date.now() - 1000 * 60 * 30),
    expires: new Date(Date.now() + 1000 * 60 * 60),
    coordinates: [
      [-97.8, 35.6], [-97.2, 35.6], [-97.2, 35.2], [-97.8, 35.2], [-97.8, 35.6]
    ],
    centroid: [-97.5, 35.4],
  },
  // Flood warning
  {
    id: 'flood-texas-001',
    event: 'Flood Warning',
    severity: 'Moderate',
    headline: 'Flash flooding reported in Houston area',
    description: 'Excessive rainfall causing flash flooding. Roads may be impassable. Do not attempt to cross flooded roadways.',
    areaDesc: 'Harris County, Texas',
    onset: new Date(Date.now() - 1000 * 60 * 60 * 2),
    expires: new Date(Date.now() + 1000 * 60 * 60 * 12),
    coordinates: [
      [-95.8, 30.2], [-95.0, 30.2], [-95.0, 29.5], [-95.8, 29.5], [-95.8, 30.2]
    ],
    centroid: [-95.4, 29.85],
  },
  // Winter storm
  {
    id: 'winter-storm-001',
    event: 'Winter Storm Warning',
    severity: 'Severe',
    headline: 'Major winter storm affecting Northeast',
    description: 'Heavy snow 12-18 inches expected. Blizzard conditions with wind gusts 40-50 mph. Travel will be very difficult to impossible.',
    areaDesc: 'Upstate New York, Vermont, New Hampshire',
    onset: new Date(Date.now() + 1000 * 60 * 60 * 12),
    expires: new Date(Date.now() + 1000 * 60 * 60 * 48),
    coordinates: [
      [-75.0, 45.0], [-71.0, 45.0], [-71.0, 43.0], [-75.0, 43.0], [-75.0, 45.0]
    ],
    centroid: [-73.0, 44.0],
  },
  // Heat advisory
  {
    id: 'heat-az-001',
    event: 'Excessive Heat Warning',
    severity: 'Moderate',
    headline: 'Dangerous heat wave continues in Arizona',
    description: 'Heat index up to 115°F expected. Heat stroke and heat exhaustion likely with prolonged outdoor exposure.',
    areaDesc: 'Phoenix metro area',
    onset: new Date(Date.now() - 1000 * 60 * 60 * 4),
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    coordinates: [
      [-112.8, 34.0], [-111.5, 34.0], [-111.5, 33.0], [-112.8, 33.0], [-112.8, 34.0]
    ],
    centroid: [-112.15, 33.5],
  },
  // Severe thunderstorm
  {
    id: 'thunderstorm-midwest-001',
    event: 'Severe Thunderstorm Warning',
    severity: 'Moderate',
    headline: 'Damaging winds and large hail expected',
    description: 'Severe thunderstorms with 70 mph wind gusts and quarter size hail. Damage to roofs and vehicles possible.',
    areaDesc: 'Central Illinois',
    onset: new Date(Date.now() - 1000 * 60 * 15),
    expires: new Date(Date.now() + 1000 * 60 * 90),
    coordinates: [
      [-90.5, 40.5], [-88.0, 40.5], [-88.0, 39.5], [-90.5, 39.5], [-90.5, 40.5]
    ],
    centroid: [-89.25, 40.0],
  },
  // Wildfire
  {
    id: 'wildfire-ca-001',
    event: 'Red Flag Warning',
    severity: 'Severe',
    headline: 'Critical fire weather conditions',
    description: 'Low humidity and gusty winds creating critical fire danger. Any fires that develop will spread rapidly.',
    areaDesc: 'Southern California coastal areas',
    onset: new Date(Date.now()),
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    coordinates: [
      [-118.5, 34.5], [-117.5, 34.5], [-117.5, 33.5], [-118.5, 33.5], [-118.5, 34.5]
    ],
    centroid: [-118.0, 34.0],
  },
  // Tsunami
  {
    id: 'tsunami-pacific-001',
    event: 'Tsunami Warning',
    severity: 'Extreme',
    headline: 'Tsunami warning for Pacific Coast',
    description: 'Tsunami waves expected. Move to high ground immediately. Do not return until all-clear given.',
    areaDesc: 'California, Oregon, Washington coasts',
    onset: new Date(Date.now() + 1000 * 60 * 30),
    expires: new Date(Date.now() + 1000 * 60 * 60 * 6),
    coordinates: [
      [-125.0, 42.0], [-120.0, 42.0], [-120.0, 32.0], [-125.0, 32.0], [-125.0, 42.0]
    ],
    centroid: [-122.5, 37.0],
  },
  // Typhoon in Pacific
  {
    id: 'typhoon-japan-001',
    event: 'Typhoon Warning',
    severity: 'Extreme',
    headline: 'Super Typhoon approaching Okinawa',
    description: 'Maximum sustained winds 150 mph. Storm surge 4-6 meters. Complete all preparations immediately.',
    areaDesc: 'Okinawa Prefecture, Japan',
    onset: new Date(Date.now()),
    expires: new Date(Date.now() + 1000 * 60 * 60 * 36),
    coordinates: [
      [128.0, 27.0], [129.0, 27.0], [129.0, 26.0], [128.0, 26.0], [128.0, 27.0]
    ],
    centroid: [128.5, 26.5],
  },
  // Cyclone in Indian Ocean
  {
    id: 'cyclone-india-001',
    event: 'Cyclone Warning',
    severity: 'Severe',
    headline: 'Severe cyclonic storm in Bay of Bengal',
    description: 'Winds 100-110 kmph gusting to 120 kmph. Heavy rainfall and storm surge expected.',
    areaDesc: 'Odisha and West Bengal coasts, India',
    onset: new Date(Date.now() + 1000 * 60 * 60 * 6),
    expires: new Date(Date.now() + 1000 * 60 * 60 * 48),
    coordinates: [
      [88.0, 21.0], [89.0, 21.0], [89.0, 19.5], [88.0, 19.5], [88.0, 21.0]
    ],
    centroid: [88.5, 20.25],
  },
];
