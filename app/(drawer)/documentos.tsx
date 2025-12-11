import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { getBackendApiBase } from '../config/api-config';

// Interfaces simplificadas - solo para la lista
interface EnvioItem {
  id: number;
  estado: string;
  nombre_origen: string;
  nombre_destino: string;
  fecha_creacion: string;
  fecha_entrega: string | null;
  fecha_inicio: string | null;
}

const Documentos = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [envios, setEnvios] = useState<EnvioItem[]>([]);
  const [enviosFiltrados, setEnviosFiltrados] = useState<EnvioItem[]>([]);
  const [busqueda, setBusqueda] = useState('');

  const params = useLocalSearchParams();

  useEffect(() => {
    cargarUsuario();
  }, []);

  useEffect(() => {
    // Filtrar envíos basado en la búsqueda
    if (busqueda.trim() === '') {
      setEnviosFiltrados(envios);
    } else {
      const filtrados = envios.filter((envio: EnvioItem) =>
        envio.id.toString().includes(busqueda.toLowerCase()) ||
        envio.nombre_origen.toLowerCase().includes(busqueda.toLowerCase()) ||
        envio.nombre_destino.toLowerCase().includes(busqueda.toLowerCase())
      );
      setEnviosFiltrados(filtrados);
    }
  }, [busqueda, envios]);

  const cargarUsuario = async () => {
    try {
      const raw = await AsyncStorage.getItem('usuario');
      console.log('Usuario raw desde AsyncStorage:', raw); // Para debug
      const parsed = raw ? JSON.parse(raw) : {};
      console.log('Usuario parseado:', parsed); // Para debug
      const rol = parsed.rol?.toLowerCase().trim() || '';
      console.log('Rol del usuario:', rol); // Para debug
      setUserRole(rol);
      await cargarEnviosCompletados(rol); // Pasar el rol directamente
    } catch (error) {
      console.error('Error al cargar usuario:', error);
      setError('Error al cargar el usuario');
      setLoading(false);
    }
  };

  const cargarEnviosCompletados = async (rolUsuario?: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Token no disponible');
        setLoading(false);
        return;
      }

      // Usar el rol pasado como parámetro o el estado actual
      const rolActual = (rolUsuario || userRole).toLowerCase().trim();
      console.log('Validando rol:', rolActual); // Para debug

      // Verificar si es admin o cliente (ignorando mayúsculas y espacios)
      if (rolActual !== 'admin' && rolActual !== 'cliente') {
        console.log('Rol no válido:', rolActual); // Para debug
        setError(`No tienes permiso para ver documentos. Rol actual: ${rolActual}`);
        setLoading(false);
        return;
      }

      // Intentar múltiples endpoints y diferentes configuraciones
      const endpoints = [
        `${getBackendApiBase()}/envios`,
        `${getBackendApiBase()}/envios/mis-envios`,
        `${getBackendApiBase()}/envios/completados`,
        `${getBackendApiBase()}/envios/cliente`,
        `${getBackendApiBase()}/envios/historial`
      ];

      let datosObtenidos = null;
      let endpointExitoso = '';

      for (const url of endpoints) {
        try {
          console.log('🔍 Intentando URL:', url);

          const res = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          console.log(`📊 Status ${url}: ${res.status}`);

          if (res.ok) {
            const data = await res.json();
            console.log(`✅ Datos de ${url}:`, data);

            // Verificar diferentes estructuras de respuesta
            let enviosArray = [];

            if (Array.isArray(data)) {
              enviosArray = data;
            } else if (data.envios && Array.isArray(data.envios)) {
              enviosArray = data.envios;
            } else if (data.data && Array.isArray(data.data)) {
              enviosArray = data.data;
            } else if (data.results && Array.isArray(data.results)) {
              enviosArray = data.results;
            }

            console.log(`📋 Array extraído de ${url}:`, enviosArray);

            if (enviosArray.length >= 0) {
              datosObtenidos = enviosArray;
              endpointExitoso = url;
              break;
            }
          } else {
            const errorText = await res.text();
            console.log(`❌ Error ${url}:`, errorText);
          }
        } catch (endpointError) {
          console.log(`💥 Excepción ${url}:`, endpointError);
          continue;
        }
      }

      if (datosObtenidos !== null) {
        console.log('🎉 Datos obtenidos exitosamente de:', endpointExitoso);
        console.log('📦 Datos totales:', datosObtenidos);

        // Mostrar TODOS los envíos primero (sin filtrar)
        console.log('🔍 Estados disponibles:', datosObtenidos.map((e: any) => e.estado));

        // Filtrar solo los envíos con estado "Entregado"
        const enviosEntregados = datosObtenidos.filter((envio: any) =>
          envio.id && envio.estado?.toLowerCase() === 'entregado'
        );

        console.log('📝 Envíos entregados:', enviosEntregados);

        // Si no hay envíos entregados, mostrar mensaje específico
        if (enviosEntregados.length === 0) {
          console.log('⚠️ No hay envíos entregados');
          setEnvios([]);
          setEnviosFiltrados([]);
        } else {
          setEnvios(enviosEntregados);
          setEnviosFiltrados(enviosEntregados);
        }

      } else {
        throw new Error('No se pudo obtener datos de ningún endpoint');
      }

    } catch (error) {
      console.error('Error completo:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar los envíos');
    } finally {
      setLoading(false);
    }
  };

  const navegarAParticiones = async (idEnvio: number) => {
    try {
      // Guardar el ID del envío para la siguiente pantalla
      await AsyncStorage.setItem('idEnvioSeleccionado', idEnvio.toString());

      // Navegar a la pantalla de particiones
      router.push({
        pathname: '/documento_particiones',
        params: { idEnvio: idEnvio.toString() }
      });
    } catch (error) {
      console.error('💥 Error al navegar a particiones:', error);
      setError('Error al abrir las particiones del envío');
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'completado':
      case 'entregado':
        return 'bg-green-100 text-green-800';
      case 'en_transito':
      case 'asignado':
        return 'bg-blue-100 text-blue-800';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return '--';
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color="#0140CD" />
        <Text style={tw`text-gray-600 mt-4`}>Cargando envíos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white p-4`}>
        <Ionicons name="alert-circle-outline" size={48} color="#dc3545" />
        <Text style={tw`text-red-600 text-lg mt-2 text-center`}>{error}</Text>
        <Pressable
          style={tw`mt-4 bg-gray-500 px-6 py-3 rounded-lg`}
          onPress={() => {
            setError(null);
            cargarUsuario();
          }}
        >
          <Text style={tw`text-white font-semibold`}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  // Vista principal - Lista de Envíos
  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`bg-white border-b border-gray-200 px-6 pt-12 pb-4`}>
        <View style={tw`flex-row items-center justify-between mb-1`}>
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            style={tw`p-2`}
          >
            <Ionicons name="menu" size={24} color="#212529" />
          </Pressable>
          <Text style={tw`text-2xl font-bold text-[#212529]`}>Mis documentos</Text>
          <View style={tw`w-10`} />
        </View>

      </View>

      {/* Barra de búsqueda */}
      <View style={tw`bg-white px-6 py-4 border-b border-gray-200`}>
        <View style={tw`flex-row items-center bg-gray-50 rounded-lg px-4 py-3`}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={tw`flex-1 ml-3 text-gray-700`}
            placeholder="Buscar en envíos entregados..."
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>
      </View>

      {/* Lista de envíos */}
      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-6`}>
        {enviosFiltrados.length === 0 ? (
          <View style={tw`flex-1 justify-center items-center py-20`}>
            <Ionicons name="document-outline" size={64} color="#9CA3AF" />
            <Text style={tw`text-gray-500 text-lg mt-4`}>
              {busqueda ? 'No se encontraron envíos entregados' : 'No hay envíos entregados'}
            </Text>
            {envios.length === 0 && (
              <View style={tw`mt-4 p-4 bg-blue-50 rounded-lg max-w-xs`}>
                <Text style={tw`text-[#212529] text-sm text-center mb-2 font-semibold`}>
                  <Text>Solo se muestran envíos entregados</Text>
                </Text>
                <Text style={tw`text-[#212529] text-xs text-center`}>
                  Los documentos están disponibles únicamente para envíos completados y entregados.
                </Text>
              </View>
            )}
          </View>
        ) : (
          enviosFiltrados.map((envio: EnvioItem) => (
            <View key={envio.id} style={tw`mb-3`}>
              {/* Card principal del documento - Ancho completo */}
              <Pressable
                style={tw`bg-white rounded-xl shadow-md border border-gray-100 p-3 active:bg-gray-50`}
                onPress={() => navegarAParticiones(envio.id)}
              >
                {/* Header con ID y Estado */}
                <View style={tw`flex-row items-center justify-between mb-2`}>
                  <View style={tw`flex-row items-center`}>
                    <Text style={tw`text-[#007bff] font-bold text-sm mr-2`}>
                      ID: {envio.id}
                    </Text>
                    <View style={tw`px-2 py-0.5 rounded-full ${getEstadoColor(envio.estado)}`}>
                      <Text style={tw`text-xs font-semibold`}>
                        {envio.estado}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Fechas - Compactas pero legibles */}
                <View style={tw`flex-row mb-2 gap-2`}>
                  <View style={tw`flex-1 bg-blue-50 px-2 py-1 rounded`}>
                    <Text style={tw`text-xs text-[#007bff] font-medium`}>
                      Recogida: {formatearFecha(envio.fecha_creacion)}
                    </Text>
                  </View>
                  <View style={tw`flex-1 bg-green-50 px-2 py-1 rounded`}>
                    <Text style={tw`text-xs text-green-700 font-medium`}>
                      Entrega: {formatearFecha(envio.fecha_entrega || (envio as any).fecha_fin)}
                    </Text>
                  </View>
                </View>

                {/* Origen y Destino - Con etiquetas completas */}
                <View>
                  <View style={tw`mb-1.5`}>
                    <Text style={tw`text-xs font-semibold text-gray-700 mb-0.5`}>Origen:</Text>
                    <Text style={tw`text-gray-600 text-xs leading-4 ${(!envio.nombre_origen || envio.nombre_origen === '—') ? 'italic' : ''}`}>
                      {(!envio.nombre_origen || envio.nombre_origen === '—')
                        ? 'Sin ubicación registrada'
                        : envio.nombre_origen}
                    </Text>
                  </View>
                  <View>
                    <Text style={tw`text-xs font-semibold text-gray-700 mb-0.5`}>Destino:</Text>
                    <Text style={tw`text-gray-600 text-xs leading-4 ${(!envio.nombre_destino || envio.nombre_destino === '—') ? 'italic' : ''}`}>
                      {(!envio.nombre_destino || envio.nombre_destino === '—')
                        ? 'Sin ubicación registrada'
                        : envio.nombre_destino}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default Documentos;