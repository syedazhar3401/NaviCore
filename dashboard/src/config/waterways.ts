import type { StrategicWaterway } from '@/types/trade';

export const STRATEGIC_WATERWAYS: StrategicWaterway[] = [
  { id: 'taiwan_strait',    chokepointId: 'taiwan_strait',    name: 'TAIWAN STRAIT',      lat: 24.0,   lon: 119.5,  description: 'Critical shipping lane, PLA activity' },
  { id: 'malacca_strait',   chokepointId: 'malacca_strait',   name: 'MALACCA STRAIT',     lat: 2.5,    lon: 101.5,  description: 'Major oil shipping route' },
  { id: 'hormuz_strait',    chokepointId: 'hormuz_strait',    name: 'STRAIT OF HORMUZ',   lat: 26.5,   lon: 56.5,   description: 'Oil chokepoint, Iran control' },
  { id: 'bosphorus',        chokepointId: 'bosphorus',        name: 'BOSPHORUS STRAIT',   lat: 41.1,   lon: 29.0,   description: 'Black Sea access, Turkey control' },
  { id: 'suez',             chokepointId: 'suez',             name: 'SUEZ CANAL',         lat: 30.5,   lon: 32.3,   description: 'Europe-Asia shipping' },
  { id: 'panama',           chokepointId: 'panama',           name: 'PANAMA CANAL',       lat: 9.1,    lon: -79.7,  description: 'Americas shipping route' },
  { id: 'gibraltar',        chokepointId: 'gibraltar',        name: 'STRAIT OF GIBRALTAR',lat: 35.9,   lon: -5.6,   description: 'Mediterranean access, NATO control' },
  { id: 'bab_el_mandeb',    chokepointId: 'bab_el_mandeb',    name: 'BAB EL-MANDEB',      lat: 12.5,   lon: 43.3,   description: 'Red Sea chokepoint, Houthi attacks' },
  { id: 'cape_of_good_hope',chokepointId: 'cape_of_good_hope',name: 'CAPE OF GOOD HOPE',  lat: -34.36, lon: 18.49,  description: 'Suez bypass route, tanker traffic' },
  { id: 'dover_strait',     chokepointId: 'dover_strait',     name: 'DOVER STRAIT',       lat: 51.0,   lon: 1.5,    description: 'English Channel narrows, busiest shipping lane' },
  { id: 'korea_strait',     chokepointId: 'korea_strait',     name: 'KOREA STRAIT',       lat: 34.0,   lon: 129.0,  description: 'Japan-Korea shipping lane' },
  { id: 'kerch_strait',     chokepointId: 'kerch_strait',     name: 'KERCH STRAIT',       lat: 45.3,   lon: 36.6,   description: 'Black Sea-Azov access, Russia-Ukraine flashpoint' },
  { id: 'lombok_strait',    chokepointId: 'lombok_strait',    name: 'LOMBOK STRAIT',      lat: -8.5,   lon: 115.7,  description: 'Malacca bypass for deep-draft vessels' },
];
