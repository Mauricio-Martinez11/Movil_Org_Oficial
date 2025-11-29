import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE, RUTA_KEY } from './constants';
import { buildGoogleDirectionsUrl } from '../config/api-config';

// Decodifica polyline de Google Maps al array de coordenadas
function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  if (!encoded || encoded.length === 0) return [];
  
  let index = 0, len = encoded.length, lat = 0, lng = 0;
  const coords: { latitude: number; longitude: number }[] = [];
  while (index < len) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1 ? ~(result >> 1) : result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1 ? ~(result >> 1) : result >> 1);
    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coords;
}

async function authHeaders() {
  const token = await AsyncStorage.getItem('token');
  // Log temporal para depuración: solo indicamos si existe token (no lo mostramos)
  console.log('authHeaders: token presente?', !!token);
  if (!token) throw new Error('No autenticado');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getUbicaciones() {
  try {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/ubicaciones/`, { headers });
    if (!res.ok) throw new Error('Error cargando ubicaciones');
    const data = await res.json();
    console.log('📍 Ubicaciones cargadas:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('❌ Error al cargar ubicaciones:', error);
    throw new Error('Error de red al cargar ubicaciones');
  }
}

export async function getRuta(origen: string, destino: string) {
  try {
    // origen y destino vienen como "lng,lat" - convertir a "lat,lng" para Google
    const [origLng, origLat] = origen.split(',').map(Number);
    const [destLng, destLat] = destino.split(',').map(Number);
    
    // Usar la función helper para construir la URL
    const url = buildGoogleDirectionsUrl(`${origLat},${origLng}`, `${destLat},${destLng}`);
    
    console.log('Solicitando ruta de Google Maps:', url);
    
    const res = await fetch(url);
    
    if (!res.ok) {
      console.error('Error en respuesta de Google Maps:', res.status, res.statusText);
      throw new Error('Error obteniendo ruta de Google Maps');
    }
    
    const data = await res.json();
    console.log('Respuesta de Google Maps:', data);
    
    if (data.status !== 'OK') {
      console.error('Error en Google Maps API:', data.status, data.error_message);
      throw new Error(`Google Maps API error: ${data.status}`);
    }
    
    if (!data.routes || data.routes.length === 0) {
      console.warn('No se encontraron rutas');
      return { coordinates: [] };
    }
    
    // Decodificar la polyline
    const route = data.routes[0];
    const polylinePoints = route.overview_polyline?.points;
    
    if (!polylinePoints) {
      console.warn('No se encontró polyline en la respuesta');
      return { coordinates: [] };
    }
    
    // Decodificar y convertir a formato [lng, lat] para mantener compatibilidad
    const decodedCoords = decodePolyline(polylinePoints);
    const coordinates = decodedCoords.map(coord => [coord.longitude, coord.latitude] as [number, number]);
    
    console.log(`Ruta decodificada con ${coordinates.length} puntos`);
    
    return { 
      coordinates,
      distance: route.legs?.[0]?.distance?.value,
      duration: route.legs?.[0]?.duration?.value 
    };
    
  } catch (error) {
    console.error('Error al obtener la ruta:', error);
    throw new Error('Error de red al obtener la ruta');
  }
}

export async function crearEnvio(payload: any) {
  try {
    const headers = await authHeaders();

    console.log('📍 Creando dirección:', payload.loc);

    // Crear dirección
    const resDireccion = await fetch(`${API_BASE}/ubicaciones/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload.loc),
    });

    console.log('📍 Respuesta dirección status:', resDireccion.status);
    
    if (!resDireccion.ok) {
      const contentType = resDireccion.headers.get('content-type');
      let errorMsg = `Error ${resDireccion.status} al crear dirección`;
      
      if (contentType?.includes('application/json')) {
        const errorData = await resDireccion.json();
        errorMsg = errorData.message || errorData.error || JSON.stringify(errorData);
      } else {
        const textResponse = await resDireccion.text();
        console.error('❌ Respuesta HTML/texto del servidor:', textResponse.substring(0, 500));
        errorMsg = `Error ${resDireccion.status}: El servidor devolvió una respuesta no válida`;
      }
      
      throw new Error(errorMsg);
    }

    // Verificar content-type antes de parsear la respuesta aunque el status sea 200
    const ctDireccion = resDireccion.headers.get('content-type') || '';
    if (!ctDireccion.includes('application/json')) {
      const textResponse = await resDireccion.text();
      console.error('❌ Respuesta no JSON al crear dirección:', textResponse.substring(0, 1000));
      throw new Error('El servidor devolvió una respuesta no JSON al crear la dirección');
    }

    const direccionData = await resDireccion.json();
    console.log('✅ Dirección creada:', direccionData);

    const idDireccion = direccionData.id;
    
    if (!idDireccion) {
      throw new Error('El servidor no devolvió un ID de dirección válido');
    }

    console.log('📦 Creando envío completo con dirección ID:', idDireccion);

    // Crear envío completo usando el endpoint POST /api/envios/completo
    const resEnvio = await fetch(`${API_BASE}/envios/completo`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id_direccion: idDireccion,
        particiones: payload.particiones,
      }),
    });

    console.log('📦 Respuesta envío status:', resEnvio.status);

    if (!resEnvio.ok) {
      const contentType = resEnvio.headers.get('content-type');
      let errorMsg = `Error ${resEnvio.status} al crear envío`;
      
      if (contentType?.includes('application/json')) {
        const errorData = await resEnvio.json();
        errorMsg = errorData.mensaje || errorData.error || JSON.stringify(errorData);
      } else {
        const textResponse = await resEnvio.text();
        console.error('❌ Respuesta HTML/texto del servidor:', textResponse.substring(0, 500));
        errorMsg = `Error ${resEnvio.status}: El servidor devolvió una respuesta no válida`;
      }
      
      throw new Error(errorMsg);
    }

    // Verificar content-type antes de parsear la respuesta aunque el status sea 200
    const ctEnvio = resEnvio.headers.get('content-type') || '';
    if (!ctEnvio.includes('application/json')) {
      const textResponse = await resEnvio.text();
      console.error('❌ Respuesta no JSON al crear envío:', textResponse.substring(0, 1000));
      throw new Error('El servidor devolvió una respuesta no JSON al crear el envío');
    }

    const envioData = await resEnvio.json();
    console.log('✅ Envío creado exitosamente:', envioData);

    return envioData;
  } catch (error) {
    console.error('❌ Error en crearEnvio:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error de red al crear el envío');
  }
}

export async function getTiposTransporte() {
  try {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE}/tipotransporte`, { headers });
    if (!res.ok) {
      console.warn('⚠️ Endpoint /tipotransporte no disponible, usando datos por defecto');
      // Datos por defecto mientras se configura el backend
      return [
        { id: 1, nombre: 'Camión Ligero', descripcion: 'Vehículo de carga ligera hasta 3.5 toneladas' },
        { id: 2, nombre: 'Camión Medio', descripcion: 'Vehículo de carga media entre 3.5 y 12 toneladas' },
        { id: 3, nombre: 'Camión Pesado', descripcion: 'Vehículo de carga pesada superior a 12 toneladas' }
      ];
    }
    return res.json();
  } catch (error) {
    console.warn('⚠️ Error al cargar tipos de transporte, usando datos por defecto');
    // Fallback a datos estáticos si hay error de red
    return [
      { id: 1, nombre: 'Camión Ligero', descripcion: 'Vehículo de carga ligera hasta 3.5 toneladas' },
      { id: 2, nombre: 'Camión Medio', descripcion: 'Vehículo de carga media entre 3.5 y 12 toneladas' },
      { id: 3, nombre: 'Camión Pesado', descripcion: 'Vehículo de carga pesada superior a 12 toneladas' }
    ];
  }
}

export default {
  getUbicaciones,
  getRuta,
  crearEnvio,
  getTiposTransporte
};
