/**
 * Configuración de APIs
 * Aquí se encuentran todas las API keys y configuraciones de servicios externos
 */

// Google Maps API Configuration
export const GOOGLE_MAPS_CONFIG = {
  API_KEY: 'AIzaSyDWZ8gPQxndwhbuX4mu1Gm9PXdo3klcF74',
  DIRECTIONS_API_URL: 'https://maps.googleapis.com/maps/api/directions/json',
  GEOCODING_API_URL: 'https://maps.googleapis.com/maps/api/geocode/json',
  PLACES_API_URL: 'https://maps.googleapis.com/maps/api/place',
};

// OpenRouteService API Configuration
export const OPENROUTESERVICE_CONFIG = {
  API_KEY: '5b3ce3597851110001cf6248dbff311ed4d34185911c2eb9e6c50080',
  DIRECTIONS_API_URL: 'https://api.openrouteservice.org/v2/directions',
  GEOCODING_API_URL: 'https://api.openrouteservice.org/geocode',
  REVERSE_GEOCODING_API_URL: 'https://api.openrouteservice.org/geocode/reverse',
};

// API Configuration
export const BACKEND_CONFIG = {
  API_BASE: 'http://192.168.0.11:8000/api',
};

// Función helper para obtener la API key de Google Maps
export const getGoogleMapsApiKey = (): string => {
  return GOOGLE_MAPS_CONFIG.API_KEY;
};

// Función helper para obtener la API key de OpenRouteService
export const getOpenRouteServiceApiKey = (): string => {
  return OPENROUTESERVICE_CONFIG.API_KEY;
};

// Función helper para obtener la URL base del backend
export const getBackendApiBase = (): string => {
  return BACKEND_CONFIG.API_BASE;
};

// Función helper para construir URL de Google Directions
export const buildGoogleDirectionsUrl = (origin: string, destination: string): string => {
  return `${GOOGLE_MAPS_CONFIG.DIRECTIONS_API_URL}?origin=${origin}&destination=${destination}&key=${GOOGLE_MAPS_CONFIG.API_KEY}`;
};

// Función helper para construir URL de OpenRouteService Directions
export const buildOpenRouteServiceDirectionsUrl = (start: string, end: string): string => {
  return `${OPENROUTESERVICE_CONFIG.DIRECTIONS_API_URL}/driving-car?api_key=${OPENROUTESERVICE_CONFIG.API_KEY}&start=${start}&end=${end}`;
};

// Función helper para construir URL de OpenRouteService Reverse Geocoding
export const buildOpenRouteServiceReverseGeocodingUrl = (lat: number, lng: number): string => {
  return `${OPENROUTESERVICE_CONFIG.REVERSE_GEOCODING_API_URL}?api_key=${OPENROUTESERVICE_CONFIG.API_KEY}&point.lat=${lat}&point.lon=${lng}&size=1`;
};

// Exportar configuración completa para casos especiales
export const API_CONFIG = {
  GOOGLE_MAPS: GOOGLE_MAPS_CONFIG,
  OPENROUTESERVICE: OPENROUTESERVICE_CONFIG,
  BACKEND: BACKEND_CONFIG,
};

export default API_CONFIG;
