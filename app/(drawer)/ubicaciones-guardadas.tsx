import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Animated,
  BackHandler,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline, Region, Callout } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions, useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import tw from 'twrnc';
import { getGoogleMapsApiKey, buildOpenRouteServiceReverseGeocodingUrl, getBackendApiBase } from '../config/api-config'; 


// Decodifica polyline al array de coordenadas
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

// Estructura de respuesta de la nueva API
interface Segmento {
  id?: number;
  direccion_id?: number;
  segmentogeojson: string;
}

interface Ubicacion {
  id: number;
  id_usuario: number;
  nombreorigen: string | null;
  origen_lng: number | null;
  origen_lat: number | null;
  nombredestino: string | null;
  destino_lng: number | null;
  destino_lat: number | null;
  rutageojson: string | null;
  segmentos?: Segmento[];
}



export default function UbicacionesGuardadasScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const mapViewRef = useRef<MapView | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);

  // Estado
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selected, setSelected] = useState<Ubicacion | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [dest, setDest] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nombreOrigen, setNombreOrigen] = useState('');
  const [nombreDestino, setNombreDestino] = useState('');
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const progress = useRef(new Animated.Value(0)).current;
  const [fullscreenMap, setFullscreenMap] = useState(false);
  const [mapLocked, setMapLocked] = useState(false);
  const [viewOnlyMap, setViewOnlyMap] = useState(false);

  // Siempre mostrar la lista principal al entrar desde el Drawer
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setShowMap(false);
      setEditMode(false);
      setSelected(null);
      setCurrentId(null);
      setStage(0);
      setOrigin(null);
      setDest(null);
      setNombreOrigen('');
      setNombreDestino('');
      setShowCoordinates(false);
      setSuccessMessage('');
    });
    return unsubscribe;
  }, [navigation]);

  // Guarda API key
  useEffect(() => {
    AsyncStorage.setItem('google_maps_api_key', getGoogleMapsApiKey());
  }, []);

  // Detectar si estamos en modo edición por URL
  useEffect(() => {
    if (params.id) {
      const id = String(params.id);
      setCurrentId(id);
      fetchUbicacionDetalle(id);
      setEditMode(true);
      setShowMap(true);
    }
  }, [params]);

  // Reset all map related states
  const resetMapStates = () => {
    setOrigin(null);
    setDest(null);
    setRouteCoords([]);
    setStage(0);
    setLoadingRoute(false);
    setNombreOrigen('');
    setNombreDestino('');
    setShowCoordinates(false);
    setEditMode(false);
    setCurrentId(null);
    setSuccessMessage('');
    // Reset MapView reference if needed
    if (mapViewRef.current) {
      mapViewRef.current = null;
    }
  };

  // Botón atrás hardware
  useEffect(() => {
    const backAction = () => {
      if (selected) { 
        setSelected(null); 
        return true; 
      }
      if (showMap) { 
        setShowMap(false); 
        resetMapStates();
        return true; 
      }
      router.replace('/home');
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selected, showMap, stage]);

  const initialRegion: Region = { latitude: -17.7833, longitude: -63.1821, latitudeDelta: 0.01, longitudeDelta: 0.01 };

  // Fetch lista de ubicaciones
  const fetchUbicaciones = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${getBackendApiBase()}/ubicaciones/`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json(); 
      setUbicaciones(data || []);
    } catch (error) { 
      console.error('Error fetching ubicaciones:', error);
      setUbicaciones([]); 
    }
    setLoading(false);
  };
  
  useEffect(() => { 
    fetchUbicaciones(); 
  }, []);
  
  const onRefresh = async () => { 
    setRefreshing(true); 
    await fetchUbicaciones(); 
    setRefreshing(false); 
  };

  // Fetch detalles de una ubicación específica
  const fetchUbicacionDetalle = async (id: string) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${getBackendApiBase()}/ubicaciones/${id}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      if (!res.ok) {
        throw new Error('Error al obtener datos de la ubicación');
      }
      
      const data: Ubicacion = await res.json();
      
      // Establecer los valores para edición
      setNombreOrigen(data.nombreorigen || '');
      setNombreDestino(data.nombredestino || '');
      
      const origenCoord = data.origen_lat && data.origen_lng ? { 
        latitude: data.origen_lat, 
        longitude: data.origen_lng 
      } : null;
      
      const destCoord = data.destino_lat && data.destino_lng ? { 
        latitude: data.destino_lat, 
        longitude: data.destino_lng 
      } : null;
      
      if (origenCoord) setOrigin(origenCoord);
      if (destCoord) setDest(destCoord);
      setStage(2); // Ya tenemos origen y destino
      
      // Si hay ruta GeoJSON, parsearla y cargarla
      if (data.rutageojson) {
        try {
          const rutaObj = JSON.parse(data.rutageojson);
          if (rutaObj.coordinates && Array.isArray(rutaObj.coordinates)) {
            const coords = rutaObj.coordinates.map(
              ([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng })
            );
            setRouteCoords(coords);
            if (coords.length > 0 && mapViewRef.current) {
              setTimeout(() => {
                mapViewRef.current?.fitToCoordinates(coords, {
                  edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                  animated: true,
                });
              }, 300);
            }
          }
        } catch (parseError) {
          console.error('Error al parsear rutageojson:', parseError);
        }
      }
      
    } catch (error) {
      console.error('Error al cargar detalles de la ubicación:', error);
      Alert.alert(
        'Error', 
        'No se pudieron cargar los datos de la ubicación',
        [{ text: 'OK', onPress: () => { resetMapStates(); setShowMap(false); } }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Refuerzo: logs en useEffect y fetchRouteCoords
  useEffect(() => {
    if (origin && dest) {
      console.log('Solicitando ruta para:', origin, dest);
    }
  }, [origin, dest]);

  const fetchRouteCoords = async (orig: { latitude: number; longitude: number }, dst: { latitude: number; longitude: number }) => {
    try {
      const apiKey = await AsyncStorage.getItem('google_maps_api_key');
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${orig.latitude},${orig.longitude}&destination=${dst.latitude},${dst.longitude}&key=${apiKey}`;
      console.log('URL de Google Directions:', url);
      const res = await fetch(url);
      const json = await res.json();
      console.log('Respuesta de Google Directions:', json);
      return json.routes?.length ? decodePolyline(json.routes[0].overview_polyline.points) : [];
    } catch (error) {
      console.error('Error fetching route:', error);
      return [];
    }
  };

  // Cargar ruta cuando se selecciona origen y destino
  useEffect(() => {
    console.log('useEffect para trazar ruta:', { origin, dest, stage });
    let isMounted = true;
    
    const loadRoute = async () => {
      if (!isMounted || !origin || !dest) return;
      
      setLoadingRoute(true);
      try {
        console.log('Solicitando ruta para:', origin, dest);
        const coords = await fetchRouteCoords(origin, dest);
        console.log('Coordenadas de la ruta recibidas:', coords);
        
        if (isMounted) {
          setRouteCoords(coords);
          if (coords.length > 0 && mapViewRef.current) {
            mapViewRef.current.fitToCoordinates(coords, {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            });
          }
        }
      } catch (error) {
        console.error('Error al cargar la ruta:', error);
      } finally {
        if (isMounted) {
          setLoadingRoute(false);
        }
      }
    };

    if (origin && dest) {
      loadRoute();
    } else {
      setRouteCoords([]);
    }
    
    return () => {
      isMounted = false;
    };
  }, [origin, dest]);

  // Save (crear nueva ubicación)
  const guardarDireccion = async () => {
    if (origin && dest && nombreOrigen.trim() && nombreDestino.trim()) {
      try {
        Animated.timing(progress, { 
          toValue: 100, 
          duration: 2000, 
          useNativeDriver: false 
        }).start();
        
        const token = await AsyncStorage.getItem('token');
        
        // Usar la ruta ya cargada o cargarla si no existe
        let coords = routeCoords;
        if (coords.length === 0) {
          coords = await fetchRouteCoords(origin, dest);
        }
        
        const geoCoords = coords.map(c => [c.longitude, c.latitude] as [number, number]);
        const rutaGeoJSON = JSON.stringify({ type: 'LineString', coordinates: geoCoords });
        
        const body = { 
          nombreOrigen: nombreOrigen.trim(), 
          origen_lng: origin.longitude,
          origen_lat: origin.latitude,
          nombreDestino: nombreDestino.trim(), 
          destino_lng: dest.longitude,
          destino_lat: dest.latitude,
          rutaGeoJSON: rutaGeoJSON,
          segmentos: [{ segmentogeojson: rutaGeoJSON }]
        };
        
        const res = await fetch(`${getBackendApiBase()}/ubicaciones`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
          body: JSON.stringify(body) 
        });
        
        if (!res.ok) {
          throw new Error('Error al guardar la dirección');
        }
        
        progress.setValue(0);
        resetMapStates();
        setShowMap(false);
        fetchUbicaciones();
      } catch (error) {
        console.error('Error al guardar la dirección:', error);
        Alert.alert('Error', 'No se pudo guardar la dirección');
      }
    }
  };

  // Update (actualizar ubicación existente)
  const actualizarDireccion = async () => {
    if (!currentId || !origin || !dest || !nombreOrigen.trim() || !nombreDestino.trim()) {
      Alert.alert('Error', 'Faltan datos para actualizar');
      return;
    }

    try {
      setLoadingRoute(true);
      Animated.timing(progress, { 
        toValue: 100, 
        duration: 2000, 
        useNativeDriver: false 
      }).start();
      
      const token = await AsyncStorage.getItem('token');
      
      // Asegurar que tenemos coordenadas de ruta
      let coords = routeCoords;
      if (coords.length === 0) {
        coords = await fetchRouteCoords(origin, dest);
      }
      
      const geoCoords = coords.map(c => [c.longitude, c.latitude] as [number, number]);
      const rutaGeoJSON = JSON.stringify({ type: 'LineString', coordinates: geoCoords });
      
      const body = { 
        nombreOrigen: nombreOrigen.trim(), 
        origen_lng: origin.longitude,
        origen_lat: origin.latitude,
        nombreDestino: nombreDestino.trim(), 
        destino_lng: dest.longitude,
        destino_lat: dest.latitude,
        rutaGeoJSON: rutaGeoJSON
      };
      
      const res = await fetch(`${getBackendApiBase()}/ubicaciones/${currentId}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
        body: JSON.stringify(body) 
      });
      
      if (!res.ok) {
        throw new Error('Error al actualizar la ubicación');
      }
      
      // Mostrar mensaje de éxito temporalmente
      setSuccessMessage('Ubicación actualizada correctamente');
      setTimeout(() => {
        progress.setValue(0);
        resetMapStates();
        setShowMap(false);
        fetchUbicaciones();
      }, 2000);
      
    } catch (error) {
      console.error('Error al actualizar la dirección:', error);
      Alert.alert('Error', 'No se pudo actualizar la dirección');
    } finally {
      setLoadingRoute(false);
    }
  };

  // Delete location con confirmación y manejo de errores
  const handleDelete = async (locationId: string) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar esta dirección?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const token = await AsyncStorage.getItem('token');
              const res = await fetch(`${getBackendApiBase()}/ubicaciones/${locationId}`, { 
                method: 'DELETE', 
                headers: { Authorization: `Bearer ${token}` } 
              });
              
              const data = await res.json();
              
              if (res.ok) {
                await fetchUbicaciones();
                Alert.alert('Éxito', 'Dirección eliminada correctamente');
              } else {
                // Manejo específico para ubicaciones en uso
                if (res.status === 400 && data.error?.includes('en uso')) {
                  Alert.alert('Error', 'No se puede eliminar esta dirección porque está siendo utilizada en un envío activo.');
                } else {
                  Alert.alert('Error', data.error || 'No se pudo eliminar la dirección');
                }
              }
            } catch (error) {
              console.error('Error al eliminar ubicación:', error);
              Alert.alert('Error', 'Fallo al conectar con el servidor');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Refuerzo para evitar crash en iOS al reiniciar
  // Helper para validar coordenadas
  const isValidCoord = (coord: { latitude?: number; longitude?: number } | null): coord is { latitude: number; longitude: number } =>
    !!coord && typeof coord.latitude === 'number' && typeof coord.longitude === 'number';

  // Refuerzo en el useEffect de fitToCoordinates
  useEffect(() => {
    if (routeCoords.length > 1 && mapViewRef.current) {
      setTimeout(() => {
        mapViewRef.current?.fitToCoordinates(routeCoords, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }, 300);
    }
  }, [routeCoords]);

  // Cuando ambos puntos están seleccionados, bloquea el mapa
  useEffect(() => {
    if (isValidCoord(origin) && isValidCoord(dest)) {
      setMapLocked(true);
    } else {
      setMapLocked(false);
    }
  }, [origin, dest]);

  // Función para obtener el nombre del lugar a partir de lat/lng usando OpenRouteService
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const url = buildOpenRouteServiceReverseGeocodingUrl(lat, lng);
      const res = await fetch(url);
      const json = await res.json();
      console.log('Respuesta completa de reverseGeocodeORS:', json);
      if (json.features && json.features.length > 0) {
        const props = json.features[0].properties;
        // Prioriza label (dirección completa) si existe
        if (props.label) {
          return cleanPlaceName(props.label);
        }
        let name = '';
        if (props.name) {
          name = props.name;
        } else if (props.street) {
          name = props.street;
          if (props.housenumber) name += ` ${props.housenumber}`;
          if (props.locality) name += `, ${props.locality}`;
        } else if (props.locality) {
          name = props.locality;
        }
        return cleanPlaceName(name);
      }
      return '';
    } catch (error) {
      console.error('Error en reverseGeocodeORS:', error);
      return '';
    }
  };

  // Función para limpiar el nombre del lugar (quita ', SC', ', SC, Bolivia', ', Bolivia' al final)
  const cleanPlaceName = (name: string): string => {
    return name
      .replace(/,?\s*SC,?\s*Bolivia\.?$/i, '')
      .replace(/,?\s*SC\.?$/i, '')
      .replace(/,?\s*Bolivia\.?$/i, '')
      .trim();
  };

  if (fullscreenMap) {
    const region = isValidCoord(origin)
      ? { latitude: origin.latitude, longitude: origin.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
      : initialRegion;
    return (
      <View style={tw`flex-1 bg-white`}>
        <MapView
          ref={mapViewRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={tw`flex-1`}
          initialRegion={region}
          onPress={async (e) => {
            if (viewOnlyMap) return; // Si es solo visualización, no hacer nada
            if (!e.nativeEvent || !e.nativeEvent.coordinate) return;
            const coordinate = e.nativeEvent.coordinate;
            if (!origin) {
              setOrigin(coordinate);
              setStage(1);
              // Autocompletar nombre de origen
              const nombre = await reverseGeocode(coordinate.latitude, coordinate.longitude);
              const limpio = cleanPlaceName(nombre);
              console.log('Nombre de origen obtenido:', limpio);
              if (limpio) setNombreOrigen(limpio);
            } else if (!dest) {
              setDest(coordinate);
              setStage(2);
              // Forzar trazo de ruta tras seleccionar destino
              if (origin) {
                const coords = await fetchRouteCoords(origin, coordinate);
                setRouteCoords(coords);
              }
              // Autocompletar nombre de destino
              const nombre = await reverseGeocode(coordinate.latitude, coordinate.longitude);
              const limpio = cleanPlaceName(nombre);
              console.log('Nombre de destino obtenido:', limpio);
              if (limpio) setNombreDestino(limpio);
            }
          }}
        >
          {isValidCoord(origin) && (
            <Marker coordinate={origin} pinColor="green">
              <Callout>
                <View>
                  <Text style={{ fontWeight: 'bold' }}>Origen</Text>
                  <Text>{nombreOrigen}</Text>
                </View>
              </Callout>
            </Marker>
          )}
          {isValidCoord(dest) && (
            <Marker coordinate={dest} pinColor="red">
              <Callout>
                <View>
                  <Text style={{ fontWeight: 'bold' }}>Destino</Text>
                  <Text>{nombreDestino}</Text>
                </View>
              </Callout>
            </Marker>
          )}
          {routeCoords.length > 1 && routeCoords.every(isValidCoord) && (
            <Polyline
              coordinates={routeCoords as { latitude: number; longitude: number }[]}
              strokeWidth={3}
              strokeColor="#0140CD"
              zIndex={10}
            />
          )}
        </MapView>
        {/* Botón volver (flecha) */}
        <Pressable
          style={tw`absolute left-5 top-16 bg-white rounded-full p-2 shadow`}
          onPress={() => {
            setFullscreenMap(false);
            setViewOnlyMap(false);
          }}
        >
          <Ionicons name="arrow-back" size={28} color="#007bff" />
        </Pressable>
        {/* Botón Reiniciar y Ver mapa */}
        <View style={tw`absolute bottom-8 left-0 right-0 flex-row justify-center space-x-4`}>
          <Pressable
            style={tw`bg-red-500 px-6 py-3 rounded-lg`}
            onPress={() => {
              setOrigin(null);
              setDest(null);
              setRouteCoords([]);
              setStage(0);
              setMapLocked(false);
              setViewOnlyMap(false);
              setNombreOrigen('');
              setNombreDestino('');
            }}
          >
            <Text style={tw`text-white font-bold`}>Reiniciar</Text>
          </Pressable>
          {mapLocked && (
            <Pressable
              style={tw`bg-blue-500 px-6 py-3 rounded-lg ml-3`}
              onPress={() => {
                // No hace nada aquí, ya estás en el mapa grande
              }}
              disabled
            >
              <Text style={tw`text-white font-bold`}>Ver mapa</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // Create/Edit Screen
  if (showMap) {
    console.log('Polyline render:', routeCoords, routeCoords.length);
    return (
      <View style={tw`flex-1 bg-white`}>
        {/* Header con el logo original */}
        <View style={tw`flex-row items-center pt-14 px-4 pb-4 bg-white`}>
          <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
            <Ionicons name="menu" size={28} color="#212529" /> 
          </TouchableOpacity>
          <View style={tw`flex-1 items-center`}>
            <Text style={tw`text-xl font-bold text-[#212529]`}>
              {editMode ? 'Editar dirección' : 'Nueva dirección'}
            </Text>
          </View>
          <View style={tw`w-7`} />
        </View>
     

        <KeyboardAvoidingView
          style={tw`flex-1 bg-gray-100`}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              ref={scrollViewRef}
              style={tw`flex-1`}
              contentContainerStyle={tw`pb-6`}
              keyboardShouldPersistTaps="handled"
            >
              {/* White card container */}
              <View style={tw`mt-4 mb-4 mx-4 bg-white rounded-lg shadow-md overflow-hidden`}>
                {/* Header explicativo */}
                <View style={tw`p-5`}>
                  <Text style={tw`mt-2 text-[#212529]`}>
                    {`Haz clic en el mapa para seleccionar el ${stage === 0 ? 'origen' : stage === 1 ? 'destino' : 'origen'}`}
                  </Text>
                </View>

                {/* Status message */}
                <View style={tw`mx-5 my-2 bg-gray-200 p-3 rounded-md`}>
                  <Text style={tw`text-center text-[#212529]`}>
                    {successMessage ? successMessage :
                      stage === 0
                        ? 'Selecciona el punto de origen en el mapa'
                        : stage === 1
                          ? 'Selecciona el punto de destino en el mapa'
                          : loadingRoute
                            ? 'Calculando ruta...'
                            : 'Puntos seleccionados correctamente'}
                  </Text>
                </View>

                {/* Map */}
                <View style={tw`mx-5 h-60 rounded-md overflow-hidden mb-4`}>
                  <Pressable
                    style={tw`flex-1`}
                    onPress={() => {
                      if (mapLocked) return; // Si está bloqueado, no abrir el mapa grande
                      setFullscreenMap(true);
                      setViewOnlyMap(false);
                    }}
                  >
                    <View style={tw`flex-1`}>
                      <MapView
                        ref={mapViewRef}
                        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                        style={tw`flex-1`}
                        initialRegion={isValidCoord(origin)
                          ? { latitude: origin.latitude, longitude: origin.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
                          : initialRegion}
                      >
                        {isValidCoord(origin) && (
                          <Marker coordinate={origin} pinColor="green">
                            <Callout>
                              <View>
                                <Text style={{ fontWeight: 'bold' }}>Origen</Text>
                                <Text>{nombreOrigen}</Text>
                              </View>
                            </Callout>
                          </Marker>
                        )}
                        {isValidCoord(dest) && (
                          <Marker coordinate={dest} pinColor="red">
                            <Callout>
                              <View>
                                <Text style={{ fontWeight: 'bold' }}>Destino</Text>
                                <Text>{nombreDestino}</Text>
                              </View>
                            </Callout>
                          </Marker>
                        )}
                        {routeCoords.length > 1 && routeCoords.every(isValidCoord) && (
                          <Polyline
                            coordinates={routeCoords as { latitude: number; longitude: number }[]}
                            strokeWidth={3}
                            strokeColor="#0140CD"
                            zIndex={10}
                          />
                        )}
                      </MapView>
                      {loadingRoute && (
                        <View style={tw`absolute inset-0 items-center justify-center`} pointerEvents="none">
                          <View style={tw`bg-white bg-opacity-70 p-2 rounded-full`}>
                            <ActivityIndicator size="small" color="#0140CD" />
                          </View>
                        </View>
                      )}
                    </View>
                  </Pressable>
                </View>

                {/* Botón Reiniciar y Ver mapa debajo del mapa pequeño */}
                <View style={tw`flex-row justify-center items-center mb-4`}>
                  <Pressable
                    style={tw`bg-red-500 px-6 py-3 rounded-lg`}
                    onPress={() => {
                      setOrigin(null);
                      setDest(null);
                      setRouteCoords([]);
                      setStage(0);
                      setMapLocked(false);
                      setViewOnlyMap(false);
                      setNombreOrigen('');
                      setNombreDestino('');
                    }}
                  >
                    <Text style={tw`text-white font-bold`}>Reiniciar</Text>
                  </Pressable>
                  {mapLocked && (
                    <Pressable
                      style={tw`bg-blue-500 px-6 py-3 rounded-lg ml-3`}
                      onPress={() => {
                        setFullscreenMap(true);
                        setViewOnlyMap(true);
                      }}
                    >
                      <Text style={tw`text-white font-bold`}>Ver mapa</Text>
                    </Pressable>
                  )}
                </View>

                {/* Input fields */}
                <View style={tw`px-5`}>
                  <View style={tw`mb-4`}>
                    <Text style={tw`text-gray-700 mb-1`}>Nombre del lugar de origen:</Text>
                    <TextInput
                      placeholder="Ej. Finca Orgánica La Esperanza"
                      style={tw`border border-gray-300 rounded-lg p-3 text-gray-700`}
                      value={nombreOrigen}
                      onChangeText={setNombreOrigen}
                      onFocus={() => {
                        setTimeout(() => {
                          scrollViewRef.current?.scrollToEnd({ animated: true });
                        }, 100);
                      }}
                    />
                  </View>

                  <View style={tw`mb-4`}>
                    <Text style={tw`text-gray-700 mb-1`}>Nombre del lugar de destino:</Text>
                    <TextInput
                      placeholder="Ej. Planta Central de Procesamiento"
                      style={tw`border border-gray-300 rounded-lg p-3 text-gray-700`}
                      value={nombreDestino}
                      onChangeText={setNombreDestino}
                      onFocus={() => {
                        setTimeout(() => {
                          scrollViewRef.current?.scrollToEnd({ animated: true });
                        }, 100);
                      }}
                    />
                  </View>
                </View>

                {/* Show coordinates toggle */}
                <View style={tw`px-5 mb-4`}>
                  <Pressable
                    style={tw`flex-row items-center justify-end`}
                    onPress={() => setShowCoordinates(!showCoordinates)}
                  >
                    <Ionicons name="eye" size={16} color="#0140CD" />
                    <Text style={tw`ml-1 text-sm text-[#0140CD]`}>MOSTRAR COORDENADAS</Text>
                  </Pressable>

                  {showCoordinates && (
                    <View style={tw`mt-2 p-3 bg-gray-100 rounded-md`}>
                      <Text style={tw`text-xs text-gray-700`}>
                        Origen: {origin ? `${origin.latitude.toFixed(6)}, ${origin.longitude.toFixed(6)}` : 'No seleccionado'}
                      </Text>
                      <Text style={tw`text-xs text-gray-700 mt-1`}>
                        Destino: {dest ? `${dest.latitude.toFixed(6)}, ${dest.longitude.toFixed(6)}` : 'No seleccionado'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Save/Update button */}
                <View style={tw`px-5 mb-5 items-center`}>
                  <Pressable
                    style={tw`${(origin && dest && nombreOrigen.trim() && nombreDestino.trim() && !loadingRoute)
                      ? 'bg-[#007bff]'
                      : 'bg-gray-400'} py-3 px-4 rounded-lg w-56`}
                    onPress={editMode ? actualizarDireccion : guardarDireccion}
                    disabled={!(origin && dest && nombreOrigen.trim() && nombreDestino.trim()) || loadingRoute}
                  >
                    <Text style={tw`text-white text-center font-semibold`}>
                      {loadingRoute ? 'Procesando...' : editMode ? 'Actualizar dirección' : 'Guardar dirección'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>

          {/* Progress bar */}
          <View style={tw`absolute top-0 left-0 right-0 h-1 bg-gray-200`}>
            <Animated.View
              style={[
                tw`h-1 bg-green-500`,
                {
                  width: progress.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%']
                  })
                }
              ]}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Direcciones Guardadas - Lista principal de ubicaciones guardadas
  // Se muestra cuando no está en modo de edición ni mostrando el mapa
  return (
    <View style={tw`flex-1 bg-white`}>
      {/* Header con el logo original */}
      <View style={tw`flex-row items-center pt-14 px-4 pb-4 bg-white`}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color="#212529" /> 
        </TouchableOpacity>
        <View style={tw`flex-1 items-center`}>
          <Text style={tw`text-xl font-bold text-[#212529]`}>
            {editMode ? 'Editar dirección' : showMap ? 'Nueva dirección' : 'Ubicaciones Guardadas'}
          </Text>
        </View>
        <View style={tw`w-7`} />
      </View>
      <View style={tw`h-px bg-gray-200`} />

      {/* Lista de direcciones y botón */}
      <View style={tw`flex-row justify-between items-center px-5 pt-2 pb-3`}>
        <Text style={tw`text-base font-semibold text-gray-800`}>Lista de direcciones</Text>
        <Pressable 
          style={tw`flex-row items-center bg-[#007bff] px-4 py-2 rounded`}
          onPress={() => {
            resetMapStates();
            setShowMap(true);
          }}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={tw`text-white ml-1 font-medium`}>Nueva dirección</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#0140CD" />
        </View>
      ) : (
        <ScrollView style={tw`flex-1 px-5`}>
          {ubicaciones.length === 0 ? (
            <Text style={tw`text-center text-gray-500 mt-10`}>No hay direcciones guardadas</Text>
          ) : (
            ubicaciones.map((item, index) => {
              // Generar una key única y válida
              const uniqueKey = `ubicacion-${item.id || index}`;
              return (
                <View key={uniqueKey}>
                  <View style={tw`py-4 flex-row justify-between items-center`}>
                    <Pressable style={tw`flex-1`} onPress={() => setSelected(item)}>
                      <Text style={tw`text-gray-800`}>
                        {item.nombreorigen || 'Sin nombre'} → {item.nombredestino || 'Sin nombre'}
                      </Text>
                    </Pressable>
                    <View style={tw`flex-row items-center`}>
                      <Pressable 
                        style={tw`bg-blue-50 px-3 py-1.5 rounded mr-2`}
                        onPress={() => {
                          resetMapStates();
                          setCurrentId(String(item.id));
                          setEditMode(true);
                          fetchUbicacionDetalle(String(item.id));
                          setShowMap(true);
                        }}
                      >
                        <Text style={tw`text-[#0140CD] text-xs`}>Editar</Text>
                      </Pressable>
                      <Pressable 
                        style={tw`bg-red-50 px-3 py-1.5 rounded`}
                        onPress={() => handleDelete(String(item.id))}
                      >
                        <Text style={tw`text-red-500 text-xs`}>Eliminar</Text>
                      </Pressable>
                    </View>
                  </View>
                  {index < ubicaciones.length - 1 && <View style={tw`h-px bg-gray-200`} />}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}
