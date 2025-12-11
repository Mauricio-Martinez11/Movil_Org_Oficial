import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import tw from 'twrnc';
import { useFocusEffect } from '@react-navigation/native';
import { getGoogleMapsApiKey, getBackendApiBase } from '../config/api-config';

const { width } = Dimensions.get('window');

type Transportista = {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  ci?: string;
};

type Vehiculo = {
  placa?: string;
  tipo?: string;
  capacidad?: number;
};

type TipoTransporte = {
  nombre?: string;
  descripcion?: string;
};

type RecogidaEntrega = {
  fecha_recogida?: string;
  hora_recogida?: string;
  hora_entrega?: string;
  instrucciones_recogida?: string;
  instrucciones_entrega?: string;
};

type Carga = {
  categoria?: string;
  producto?: string;
  peso?: number;
  cantidad?: number;
  tipo_empaque?: string;
};

type Particion = {
  estado: string;
  transportista?: Transportista;
  vehiculo?: Vehiculo;
  tipoTransporte?: TipoTransporte;
  recogidaEntrega?: RecogidaEntrega;
  cargas?: Carga[];
};

type Envio = {
  id: number;
  nombre_origen?: string;
  nombre_destino?: string;
  coordenadas_origen?: [number, number];
  coordenadas_destino?: [number, number];
  rutaGeoJSON?: any;
  particiones: Particion[];
};

export default function SeguimientoEnvio() {
  const [envio, setEnvio] = useState<Envio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rutaCoordinates, setRutaCoordinates] = useState<{ [key: number]: any[] }>({});
  const [cargandoRutas, setCargandoRutas] = useState<{ [key: number]: boolean }>({});
  const [mapaCompleto, setMapaCompleto] = useState<{ visible: boolean, index: number | null }>({ visible: false, index: null });
  const [camionAnimado, setCamionAnimado] = useState<{ [key: number]: { latitude: number, longitude: number, rotation: number } }>({});
  const animacionRefs = useRef<{ [key: number]: Animated.Value }>({});
  const mapRefs = useRef<{ [key: number]: MapView | null }>({});
  const [copied, setCopied] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      cargarDatosEnvio();

      // Limpiar animaciones al desmontar
      return () => {
        Object.keys(animacionRefs.current).forEach(key => {
          const index = parseInt(key);
          if (animacionRefs.current[index]) {
            animacionRefs.current[index].stopAnimation();
          }
        });
      };
    }, [])
  );

  // Auto-zoom map when envio data is loaded
  useEffect(() => {
    if (envio && envio.coordenadas_origen && envio.coordenadas_destino) {
      envio.particiones.forEach((_, index) => {
        setTimeout(() => {
          const map = mapRefs.current[index];
          if (map && envio.coordenadas_origen && envio.coordenadas_destino) {
            const coords = [
              { latitude: envio.coordenadas_origen[0], longitude: envio.coordenadas_origen[1] },
              { latitude: envio.coordenadas_destino[0], longitude: envio.coordenadas_destino[1] },
            ];
            map.fitToCoordinates(coords, {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            });
          }
        }, 1000); // Delay to ensure map is ready
      });
    }
  }, [envio]);

  // Efecto para iniciar animaciones cuando cambien las rutas
  useEffect(() => {
    if (envio && Object.keys(rutaCoordinates).length > 0) {
      envio.particiones.forEach((particion, index) => {
        const estado = particion.estado?.toLowerCase();

        if (estado === 'en curso' && rutaCoordinates[index]) {
          // Pequeño delay para asegurar que el mapa esté renderizado
          setTimeout(() => {
            animarCamion(index, rutaCoordinates[index]);
          }, 2000);
        } else {
          // Detener animación si el estado no es "en curso" (pendiente, entregado, etc.)
          if (animacionRefs.current[index]) {
            animacionRefs.current[index].stopAnimation();
            setCamionAnimado(prev => {
              const newState = { ...prev };
              delete newState[index];
              return newState;
            });
          }
        }
      });
    }
  }, [rutaCoordinates, envio]);

  // Función para animar el camión a lo largo de la ruta
  const animarCamion = (particionIndex: number, ruta: any[]) => {
    if (ruta.length < 2) return;

    // Detener animación anterior si existe
    if (animacionRefs.current[particionIndex]) {
      animacionRefs.current[particionIndex].stopAnimation();
    }

    // Crear nueva referencia de animación
    animacionRefs.current[particionIndex] = new Animated.Value(0);
    const animacion = animacionRefs.current[particionIndex];

    // Función para calcular la posición del camión
    const calcularPosicionCamion = (progress: number) => {
      const totalDistance = ruta.length - 1;
      const currentIndex = progress * totalDistance;

      const index1 = Math.floor(currentIndex);
      const index2 = Math.min(index1 + 1, ruta.length - 1);
      const fraction = currentIndex - index1;

      const point1 = ruta[index1];
      const point2 = ruta[index2];

      const latitude = point1.latitude + (point2.latitude - point1.latitude) * fraction;
      const longitude = point1.longitude + (point2.longitude - point1.longitude) * fraction;

      // Calcular rotación basada en la dirección del movimiento
      const deltaLat = point2.latitude - point1.latitude;
      const deltaLng = point2.longitude - point1.longitude;
      const rotation = Math.atan2(deltaLng, deltaLat) * (180 / Math.PI) + 180; // +180 para girar más hacia la derecha

      return { latitude, longitude, rotation };
    };

    // Actualizar posición del camión durante la animación
    const listener = animacion.addListener(({ value }) => {
      const posicion = calcularPosicionCamion(value);
      setCamionAnimado(prev => ({
        ...prev,
        [particionIndex]: posicion
      }));
    });

    // Iniciar animación con easing suave
    Animated.loop(
      Animated.timing(animacion, {
        toValue: 1,
        duration: 45000, // 45 segundos para completar la ruta
        useNativeDriver: false,
      })
    ).start();

    // Retornar función de limpieza
    return () => {
      animacion.removeListener(listener);
    };
  };

  // Función para obtener ruta de Google Maps
  const obtenerRuta = async (origen: [number, number], destino: [number, number], particionIndex: number) => {
    try {
      setCargandoRutas(prev => ({ ...prev, [particionIndex]: true }));

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origen[0]},${origen[1]}&destination=${destino[0]},${destino[1]}&key=${getGoogleMapsApiKey()}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const points = data.routes[0].overview_polyline.points;
        const decodedPoints = decodePolyline(points);

        setRutaCoordinates(prev => ({
          ...prev,
          [particionIndex]: decodedPoints
        }));

        // Iniciar animación del camión si el estado es "en curso"
        setTimeout(() => {
          const particion = envio?.particiones[particionIndex];
          if (particion?.estado?.toLowerCase() === 'en curso') {
            animarCamion(particionIndex, decodedPoints);
          }
        }, 1000); // Pequeño delay para asegurar que los datos estén cargados
      }
    } catch (error) {
      console.error('Error obteniendo ruta:', error);
    } finally {
      setCargandoRutas(prev => ({ ...prev, [particionIndex]: false }));
    }
  };

  // Función para decodificar polyline de Google Maps
  const decodePolyline = (encoded: string) => {
    const points = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let shift = 0;
      let result = 0;
      let byte;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += deltaLat;

      shift = 0;
      result = 0;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += deltaLng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  };

  const cargarDatosEnvio = async () => {
    try {
      const idEnvio = await AsyncStorage.getItem('envioEnSeguimiento');
      const token = await AsyncStorage.getItem('token');

      if (!idEnvio || !token) {
        Alert.alert('Error', 'No se encontró el envío o el token');
        router.back();
        return;
      }

      const res = await fetch(`${getBackendApiBase()}/envios/${idEnvio}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      console.log('📦 Envío recibido (API):', JSON.stringify(data, null, 2));

      if (!res.ok) {
        throw new Error(data.error || 'Error al obtener envío');
      }

      // Normalizar propiedades de coordenadas para asegurar formato [latitude, longitude]
      const normalized: any = { ...data };

      // Si el backend devuelve origen_lat / origen_lng, convertir a coordenadas_origen
      if ((!normalized.coordenadas_origen || !normalized.coordenadas_destino) && (normalized.origen_lat !== undefined || normalized.origen_lng !== undefined || normalized.destino_lat !== undefined || normalized.destino_lng !== undefined)) {
        normalized.coordenadas_origen = normalized.coordenadas_origen || (
          (normalized.origen_lat !== undefined && normalized.origen_lng !== undefined) ? [Number(normalized.origen_lat), Number(normalized.origen_lng)] : null
        );
        normalized.coordenadas_destino = normalized.coordenadas_destino || (
          (normalized.destino_lat !== undefined && normalized.destino_lng !== undefined) ? [Number(normalized.destino_lat), Number(normalized.destino_lng)] : null
        );
      }

      // También admitir campos con nombres camelCase que puedan venir de otros endpoints
      if ((!normalized.coordenadas_origen || !normalized.coordenadas_destino) && (normalized.coordenadasOrigen || normalized.coordenadasDestino)) {
        normalized.coordenadas_origen = normalized.coordenadas_origen || (Array.isArray(normalized.coordenadasOrigen) ? [Number(normalized.coordenadasOrigen[0]), Number(normalized.coordenadasOrigen[1])] : null);
        normalized.coordenadas_destino = normalized.coordenadas_destino || (Array.isArray(normalized.coordenadasDestino) ? [Number(normalized.coordenadasDestino[0]), Number(normalized.coordenadasDestino[1])] : null);
      }

      // Si las coordenadas vienen como objetos { lat, lng } convertir a arrays [lat, lng]
      if (normalized.coordenadas_origen && !Array.isArray(normalized.coordenadas_origen) && typeof normalized.coordenadas_origen === 'object') {
        const o = normalized.coordenadas_origen as any;
        if (o.lat !== undefined && o.lng !== undefined) {
          normalized.coordenadas_origen = [Number(o.lat), Number(o.lng)];
        } else if (o.latitude !== undefined && o.longitude !== undefined) {
          normalized.coordenadas_origen = [Number(o.latitude), Number(o.longitude)];
        }
      }
      if (normalized.coordenadas_destino && !Array.isArray(normalized.coordenadas_destino) && typeof normalized.coordenadas_destino === 'object') {
        const d = normalized.coordenadas_destino as any;
        if (d.lat !== undefined && d.lng !== undefined) {
          normalized.coordenadas_destino = [Number(d.lat), Number(d.lng)];
        } else if (d.latitude !== undefined && d.longitude !== undefined) {
          normalized.coordenadas_destino = [Number(d.latitude), Number(d.longitude)];
        }
      }

      // Detectar si el array está en orden [lng, lat] y corregir a [lat, lng]
      const fixOrder = (arr: any[] | null) => {
        if (!Array.isArray(arr) || arr.length < 2) return arr;
        const a = Number(arr[0]);
        const b = Number(arr[1]);
        // si el primer valor está fuera del rango de latitudes, probablemente es lng
        if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
          return [b, a];
        }
        return [a, b];
      };

      normalized.coordenadas_origen = fixOrder(normalized.coordenadas_origen);
      normalized.coordenadas_destino = fixOrder(normalized.coordenadas_destino);

      // Si el backend ya proporciona rutaGeoJSON (o en direccion.rutageojson), usarla y convertir coordenadas
      const rutaString = normalized.rutaGeoJSON || normalized.rutageojson || (normalized.direccion && normalized.direccion.rutageojson);
      let rutaFromServer: { latitude: number; longitude: number }[] | null = null;
      if (rutaString) {
        try {
          const rutaObj = typeof rutaString === 'string' ? JSON.parse(rutaString) : rutaString;
          const coords = rutaObj.coordinates || (rutaObj.features && rutaObj.features[0] && rutaObj.features[0].geometry && rutaObj.features[0].geometry.coordinates);
          if (Array.isArray(coords)) {
            rutaFromServer = coords.map((c: any) => {
              // coords coming from server are [lng, lat]
              const lng = Number(c[0]);
              const lat = Number(c[1]);
              return { latitude: lat, longitude: lng };
            });
          }
        } catch (e) {
          console.warn('No se pudo parsear rutaGeoJSON del servidor:', e);
        }
      }

      setEnvio(normalized);

      // Si tenemos una ruta provista por el servidor, usarla para todos los índices
      if (rutaFromServer && rutaFromServer.length > 0) {
        // asignar la misma ruta a todas las particiones
        const newRutaCoords: any = {};
        normalized.particiones.forEach((_: Particion, index: number) => {
          newRutaCoords[index] = rutaFromServer as any[];
        });
        setRutaCoordinates(prev => ({ ...prev, ...newRutaCoords }));
        // iniciar animación si corresponde
        normalized.particiones.forEach((particion: Particion, index: number) => {
          if (particion.estado?.toLowerCase() === 'en curso') {
            animarCamion(index, rutaFromServer as any[]);
          }
        });
      } else if (normalized.coordenadas_origen && normalized.coordenadas_destino) {
        // Obtener rutas por Google sólo si no hay ruta local
        normalized.particiones.forEach((particion: Particion, index: number) => {
          obtenerRuta(normalized.coordenadas_origen, normalized.coordenadas_destino, index);
        });
      } else {
        console.warn('⚠️ Coordenadas origen/destino no presentes en la respuesta del servidor:', Object.keys(normalized));
      }
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      Alert.alert('Error', 'Ocurrió un error al cargar el seguimiento');
    } finally {
      setLoading(false);
    }
  };

  // Función para renderizar el marcador del camión
  const renderCamionMarker = (particionIndex: number) => {
    const camion = camionAnimado[particionIndex];
    const particion = envio?.particiones[particionIndex];

    // Solo mostrar camión si está en curso
    if (!camion || !particion || particion.estado?.toLowerCase() !== 'en curso') {
      return null;
    }

    return (
      <Marker
        coordinate={{
          latitude: camion.latitude,
          longitude: camion.longitude,
        }}
        title="Camión en ruta"
        description="Transportando carga"
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <Animated.View
          style={{
            transform: [{ rotate: `${camion.rotation}deg` }],
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            source={require('../../assets/camion_ligero.png')}
            style={{ width: 40, height: 40, resizeMode: 'contain' }}
          />
          {/* Indicador de movimiento */}
          <View style={tw`absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white`} />
        </Animated.View>
      </Marker>
    );
  };

  const resumenCargas = (particion: Particion) => {
    return (particion.cargas || [])
      .map(c => {
        const cat = c.categoria || 'Sin categoría';
        const prod = c.producto || 'Sin producto';
        const peso = c.peso ? `(${c.peso} kg)` : '';
        return `${cat} - ${prod} ${peso}`;
      })
      .join(' | ');
  };

  const formatearFecha = (fechaIso?: string) => {
    if (!fechaIso) return '—';
    const fecha = new Date(fechaIso);
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const año = fecha.getFullYear();
    return `${dia}/${mes}/${año}`;
  };

  const formatearHora = (hora?: string) => {
    if (!hora) return '—';
    // Si viene como HH:MM:SS
    if (hora.includes(':') && hora.length >= 5) {
      return hora.substring(0, 5);
    }
    // Si viene como ISO string
    const date = new Date(hora);
    if (isNaN(date.getTime())) return hora; // Fallback

    const horas = String(date.getUTCHours()).padStart(2, '0');
    const minutos = String(date.getUTCMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
  };

  const handleCopyCodigo = async (code?: string) => {
    const theCode = code || (envio as any)?.codigo_acceso;
    if (!theCode) return;
    try {
      await Clipboard.setStringAsync(theCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      Alert.alert('Error', 'No se pudo copiar el código');
    }
  };

  if (loading) {
    return (
      <View style={tw`flex-1 bg-gray-100 justify-center items-center`}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#0140CD" />
        <Text style={tw`text-gray-600 mt-4`}>Cargando seguimiento...</Text>
      </View>
    );
  }

  if (error || !envio) {
    return (
      <View style={tw`flex-1 bg-gray-100 justify-center items-center p-4`}>
        <StatusBar barStyle="dark-content" />
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={tw`text-red-600 text-lg font-semibold mt-4 mb-2`}>Error al cargar</Text>
        <Text style={tw`text-gray-600 text-center mb-6`}>{error}</Text>
        <TouchableOpacity
          style={tw`bg-blue-600 px-6 py-3 rounded-lg`}
          onPress={() => router.push('/')}
        >
          <Text style={tw`text-white font-medium`}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-100`}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={tw`flex-row items-center pt-14 px-4 pb-4 bg-white`}>
        <TouchableOpacity onPress={() => router.push('/envio')}>
          <Ionicons name="arrow-back" size={28} color="#212529" />
        </TouchableOpacity>
        <View style={tw`flex-1 items-center`}>
          <Text style={tw`text-xl font-bold text-[#212529]`}>
            Seguimiento del envío
          </Text>
        </View>
        <View style={tw`w-7`} />
      </View>

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-4`}>
        {envio.particiones.map((particion, index) => (
          <View key={index} style={tw`bg-white rounded-2xl p-6 mb-6 shadow-sm`}>
            {/* Título de la partición */}
            <View style={tw`flex-row items-center mb-4`}>
              <View style={tw`w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3`}>
                <Text style={tw`text-blue-600 font-bold`}>{index + 1}</Text>
              </View>
              <Text style={tw`text-xl font-semibold text-gray-900`}>
                Partición {index + 1}
              </Text>
              <View style={tw`ml-auto flex-row items-center`}>
                {/* Indicador de camión en movimiento */}
                {particion.estado?.toLowerCase() === 'en curso' && camionAnimado[index] && (
                  <View style={tw`flex-row items-center mr-3`}>
                    <View style={tw`w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse`} />
                    <Image
                      source={require('../../assets/camion_ligero.png')}
                      style={{ width: 16, height: 16, resizeMode: 'contain' }}
                    />
                  </View>
                )}
                <View style={tw`bg-blue-100 px-3 py-1 rounded-full`}>
                  <Text style={tw`text-blue-800 text-sm font-medium`}>
                    {particion.estado}
                  </Text>
                </View>
              </View>
            </View>

            {/* Mapa */}
            <View style={tw`mb-6`}>
              <TouchableOpacity onPress={() => setMapaCompleto({ visible: true, index })} activeOpacity={0.9}>
                <View style={[tw`rounded-xl overflow-hidden`, { height: 200 }]}>
                  <MapView
                    ref={ref => { mapRefs.current[index] = ref; }}
                    style={{ flex: 1 }}
                    initialRegion={{
                      latitude: envio.coordenadas_origen?.[0] || -17.7833,
                      longitude: envio.coordenadas_origen?.[1] || -63.1821,
                      latitudeDelta: 0.1,
                      longitudeDelta: 0.1,
                    }}
                    mapType="standard"
                  >
                    {/* Marcador de origen */}
                    {envio.coordenadas_origen && (
                      <Marker
                        coordinate={{
                          latitude: envio.coordenadas_origen[0],
                          longitude: envio.coordenadas_origen[1],
                        }}
                        title="Origen"
                        description={envio.nombre_origen || 'Punto de origen'}
                        pinColor="green"
                      />
                    )}

                    {/* Marcador de destino */}
                    {envio.coordenadas_destino && (
                      <Marker
                        coordinate={{
                          latitude: envio.coordenadas_destino[0],
                          longitude: envio.coordenadas_destino[1],
                        }}
                        title="Destino"
                        description={envio.nombre_destino || 'Punto de destino'}
                        pinColor="red"
                      />
                    )}

                    {/* Ruta real de Google Maps */}
                    {rutaCoordinates[index] && rutaCoordinates[index].length > 0 ? (
                      <Polyline
                        coordinates={rutaCoordinates[index]}
                        strokeColor="#0077b6"
                        strokeWidth={4}
                      />
                    ) : (
                      /* Línea recta como fallback */
                      envio.coordenadas_origen && envio.coordenadas_destino && (
                        <Polyline
                          coordinates={[
                            {
                              latitude: envio.coordenadas_origen[0],
                              longitude: envio.coordenadas_origen[1],
                            },
                            {
                              latitude: envio.coordenadas_destino[0],
                              longitude: envio.coordenadas_destino[1],
                            }
                          ]}
                          strokeColor="#0077b6"
                          strokeWidth={3}
                        />
                      )
                    )}

                    {renderCamionMarker(index)}
                  </MapView>

                  {/* Indicador de carga de ruta */}
                  {cargandoRutas[index] && (
                    <View style={tw`absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-md`}>
                      <ActivityIndicator size="small" color="#0077b6" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Código de acceso (centrado debajo del mapa) */}
            {((particion as any)?.codigo_acceso || (envio as any)?.codigo_acceso) ? (
              <View style={tw`items-center mb-4`}>
                <Text style={tw`text-base text-black font-bold mb-2`}>Código de acceso</Text>
                <View style={tw`flex-row items-center justify-center`}>
                  <Text selectable style={tw`self-start text-lg font-bold text-black py-1 px-3 rounded-md border border-black bg-white`}>{(particion as any)?.codigo_acceso || (envio as any).codigo_acceso}</Text>
                  <TouchableOpacity onPress={() => handleCopyCodigo((particion as any)?.codigo_acceso || (envio as any).codigo_acceso)} style={tw`ml-3 p-2 bg-white rounded-full border border-gray-200`}>
                    <Ionicons name="copy-outline" size={20} color="#212529" />
                  </TouchableOpacity>
                </View>
                {copied && <Text style={tw`text-sm text-green-600 mt-2`}>Copiado al portapapeles</Text>}
              </View>
            ) : null}

            {/* Información del Transportista */}
            <View style={tw`mb-6`}>
              <View style={tw`flex-row items-center mb-3`}>
                <Ionicons name="person-outline" size={20} color="#0140CD" />
                <Text style={tw`text-lg font-semibold text-gray-800 ml-2`}>
                  Transportista
                </Text>
              </View>
              <View style={tw`bg-gray-50 p-4 rounded-xl`}>
                <Text style={tw`text-gray-700 mb-1`}>
                  <Text style={tw`font-medium`}>Nombre: </Text>
                  {particion.transportista?.nombre || '—'} {particion.transportista?.apellido || ''}
                </Text>
                <Text style={tw`text-gray-700 mb-1`}>
                  <Text style={tw`font-medium`}>Teléfono: </Text>
                  {particion.transportista?.telefono || '—'}
                </Text>
                <Text style={tw`text-gray-700`}>
                  <Text style={tw`font-medium`}>CI: </Text>
                  {particion.transportista?.ci || '—'}
                </Text>
              </View>
            </View>

            {/* Información del Vehículo Combinada */}
            <View style={tw`mb-6`}>
              <View style={tw`flex-row items-center mb-3`}>
                <Ionicons name="car-outline" size={20} color="#0140CD" />
                <Text style={tw`text-lg font-semibold text-gray-800 ml-2`}>
                  Vehículo y Transporte
                </Text>
              </View>
              <View style={tw`bg-gray-50 p-4 rounded-xl`}>
                <Text style={tw`text-gray-700 mb-1`}>
                  <Text style={tw`font-medium`}>Placa: </Text>
                  {particion.vehiculo?.placa || '—'}
                </Text>
                <Text style={tw`text-gray-700 mb-1`}>
                  <Text style={tw`font-medium`}>Tipo de Vehículo: </Text>
                  {particion.vehiculo?.tipo || particion.tipoTransporte?.nombre || '—'}
                </Text>
                {particion.vehiculo?.capacidad && (
                  <Text style={tw`text-gray-700`}>
                    <Text style={tw`font-medium`}>Capacidad: </Text>
                    {particion.vehiculo.capacidad} kg
                  </Text>
                )}
              </View>
            </View>

            {/* Cronograma de Entrega */}
            <View style={tw`mb-0`}>
              <View style={tw`flex-row items-center mb-4`}>
                <Ionicons name="time-outline" size={20} color="#0140CD" />
                <Text style={tw`text-lg font-semibold text-gray-800 ml-2`}>
                  Cronograma
                </Text>
              </View>

              {/* Recogida */}
              <View style={tw`mb-4`}>
                <View style={tw`flex-row items-center mb-2`}>
                  <View style={tw`w-3 h-3 bg-green-500 rounded-full mr-3`} />
                  <Text style={tw`text-sm font-medium text-gray-600`}>
                    Recogida: {formatearFecha(particion.recogidaEntrega?.fecha_recogida)} - {formatearHora(particion.recogidaEntrega?.hora_recogida)}
                  </Text>
                </View>
                <View style={tw`bg-green-50 p-4 rounded-xl ml-6`}>
                  <Text style={tw`font-semibold text-gray-900 mb-1`}>
                    Origen: {envio.nombre_origen || '—'}
                  </Text>
                  <Text style={tw`text-gray-700 mb-2`}>
                    Recogida de: {resumenCargas(particion)}
                  </Text>
                  <Text style={tw`text-gray-600 text-sm`}>
                    {particion.recogidaEntrega?.instrucciones_recogida || 'Sin instrucciones'}
                  </Text>
                </View>
              </View>

              {/* Línea conectora */}
              <View style={tw`ml-1.5 w-0.5 h-6 bg-gray-300 mb-4`} />

              {/* Entrega */}
              <View>
                <View style={tw`flex-row items-center mb-2`}>
                  <View style={tw`w-3 h-3 bg-gray-500 rounded-full mr-3`} />
                  <Text style={tw`text-sm font-medium text-gray-600`}>
                    Entrega: {formatearFecha(particion.recogidaEntrega?.fecha_recogida)} - {formatearHora(particion.recogidaEntrega?.hora_entrega)}
                  </Text>
                </View>
                <View style={tw`bg-gray-50 p-4 rounded-xl ml-6`}>
                  <Text style={tw`font-semibold text-gray-900 mb-1`}>
                    Destino: {envio.nombre_destino || '—'}
                  </Text>
                  <Text style={tw`text-gray-700 mb-2`}>
                    Entrega de: {resumenCargas(particion)}
                  </Text>
                  <Text style={tw`text-gray-600 text-sm`}>
                    {particion.recogidaEntrega?.instrucciones_entrega || 'Sin instrucciones'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}

        {/* Espacio adicional al final */}
        <View style={tw`h-6`} />
      </ScrollView>

      {mapaCompleto.visible && (
        <View style={tw`absolute top-0 left-0 right-0 bottom-0 bg-white z-50`}>
          <MapView
            style={{ flex: 1 }}
            initialRegion={{
              latitude: envio.coordenadas_origen?.[0] || -17.7833,
              longitude: envio.coordenadas_origen?.[1] || -63.1821,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
            mapType="standard"
          >
            {/* Marcador de origen */}
            {envio.coordenadas_origen && (
              <Marker
                coordinate={{
                  latitude: envio.coordenadas_origen[0],
                  longitude: envio.coordenadas_origen[1],
                }}
                title="Origen"
                description={envio.nombre_origen || 'Punto de origen'}
                pinColor="green"
              />
            )}
            {/* Marcador de destino */}
            {envio.coordenadas_destino && (
              <Marker
                coordinate={{
                  latitude: envio.coordenadas_destino[0],
                  longitude: envio.coordenadas_destino[1],
                }}
                title="Destino"
                description={envio.nombre_destino || 'Punto de destino'}
                pinColor="red"
              />
            )}
            {/* Ruta real de Google Maps */}
            {mapaCompleto.index !== null && rutaCoordinates[mapaCompleto.index] && rutaCoordinates[mapaCompleto.index].length > 0 ? (
              <Polyline
                coordinates={rutaCoordinates[mapaCompleto.index]}
                strokeColor="#0077b6"
                strokeWidth={4}
              />
            ) : (
              envio.coordenadas_origen && envio.coordenadas_destino && (
                <Polyline
                  coordinates={[
                    {
                      latitude: envio.coordenadas_origen[0],
                      longitude: envio.coordenadas_origen[1],
                    },
                    {
                      latitude: envio.coordenadas_destino[0],
                      longitude: envio.coordenadas_destino[1],
                    }
                  ]}
                  strokeColor="#0077b6"
                  strokeWidth={3}
                />
              )
            )}

            {/* Marcador del camión en mapa completo */}
            {mapaCompleto.index !== null && renderCamionMarker(mapaCompleto.index)}
          </MapView>
          <TouchableOpacity
            style={tw`absolute top-10 right-6 bg-white rounded-full p-2 shadow`}
            onPress={() => setMapaCompleto({ visible: false, index: null })}
          >
            <Ionicons name="close" size={28} color="#0140CD" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}