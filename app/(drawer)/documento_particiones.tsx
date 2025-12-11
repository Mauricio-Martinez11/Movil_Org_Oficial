import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, FlatList, BackHandler, RefreshControl } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getBackendApiBase } from '../config/api-config';

interface Particion {
  id_asignacion: number;
  estado: string;
  transportista: {
    nombre: string;
    apellido: string;
  };
  vehiculo: {
    placa: string;
  };
}

interface DocumentoData {
  particiones: Particion[];
}

const DocumentoParticiones = () => {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [particiones, setParticiones] = useState<Particion[]>([]);
  const [idEnvio, setIdEnvio] = useState<string | null>(null);

  useEffect(() => {
    const envioId = params.idEnvio as string;
    if (envioId && envioId !== idEnvio) {
      setIdEnvio(envioId);
      cargarParticiones(envioId, false);
    }
  }, [params.idEnvio]);

  const inicializar = async () => {
    try {
      // Obtener el ID del envío de los parámetros o AsyncStorage
      const envioId = params.idEnvio as string || await AsyncStorage.getItem('idEnvioSeleccionado');

      if (!envioId) {
        setError('No se encontró el ID del envío');
        setLoading(false);
        return;
      }

      setIdEnvio(envioId);
      await cargarParticiones(envioId, false);
    } catch (error) {
      console.error('Error al inicializar:', error);
      setError('Error al cargar los datos');
      setLoading(false);
    }
  };

  const cargarParticiones = async (envioId: string, esRefresh = false) => {
    try {
      if (!esRefresh) {
        setLoading(true);
      }

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Token no disponible');
        if (!esRefresh) setLoading(false);
        return;
      }

      console.log('🔍 Cargando particiones para envío:', envioId);

      const response = await fetch(
        `${getBackendApiBase()}/envios/${envioId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Datos del envío cargados:', data);

      setParticiones(data.particiones || []);
      setError(null); // Limpiar errores previos si la carga fue exitosa
    } catch (error) {
      console.error('💥 Error al cargar particiones:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar las particiones');
    } finally {
      if (!esRefresh) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    if (!idEnvio) return;

    setRefreshing(true);
    await cargarParticiones(idEnvio, true);
    setRefreshing(false);
  };

  const verDocumento = async (idAsignacion: number) => {
    try {
      // Guardar el ID de la asignación para el documento final
      await AsyncStorage.setItem('idAsignacionSeleccionada', idAsignacion.toString());

      // Navegar al documento final
      router.push({
        pathname: '/documento_final',
        params: { idAsignacion: idAsignacion.toString() }
      });
    } catch (error) {
      console.error('Error al navegar:', error);
    }
  };

  const volverADocumentos = () => {
    router.replace('/documentos');
  };

  // Interceptar el botón de retroceso físico
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        volverADocumentos();
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const getEstadoBadge = (estado: string) => {
    const estadoLower = estado.toLowerCase();

    if (estadoLower.includes('entregado')) {
      return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' };
    }
    if (estadoLower.includes('curso') || estadoLower.includes('transito')) {
      return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' };
    }
    return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
  };

  const renderHeader = () => (
    <View style={tw`bg-gray-100 px-4 py-2 rounded-t-xl flex-row items-center`}>
      <View style={tw`flex-1`}>
        <Text style={tw`text-xs font-bold text-gray-700 uppercase`}>ID</Text>
      </View>
      <View style={tw`flex-1 items-center`}>
        <Text style={tw`text-xs font-bold text-gray-700 uppercase`}>Estado</Text>
      </View>
      <View style={tw`flex-1 items-end`}>
        <Text style={tw`text-xs font-bold text-gray-700 uppercase`}>Acción</Text>
      </View>
    </View>
  );

  const renderParticion = ({ item }: { item: Particion }) => {
    const badge = getEstadoBadge(item.estado);

    return (
      <View style={tw`bg-white rounded-xl shadow-sm mb-3 px-4 py-4 flex-row items-center`}>
        {/* ID */}
        <View style={tw`flex-1`}>
          <Text style={tw`font-bold text-[#007bff] text-base`}>
            #{item.id_asignacion}
          </Text>
        </View>
        {/* Estado */}
        <View style={tw`flex-1 items-center`}>
          <View style={tw`px-3 py-1 rounded-full ${badge.bg} ${badge.border} border`}>
            <Text style={tw`text-xs font-semibold ${badge.text}`} numberOfLines={1}>
              {item.estado}
            </Text>
          </View>
        </View>
        {/* Acción */}
        <View style={tw`flex-1 items-end`}>
          <Pressable
            style={tw`bg-[#007bff] px-4 py-2 rounded-lg`}
            onPress={() => verDocumento(item.id_asignacion)}
          >
            <Text style={tw`text-white text-xs font-semibold`}>Ver</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={tw`text-gray-600 mt-4`}>Cargando particiones...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white p-4`}>
        <Ionicons name="alert-circle-outline" size={48} color="#dc3545" />
        <Text style={tw`text-red-600 text-lg mt-2 text-center`}>{error}</Text>
        <Pressable
          style={tw`mt-4 bg-blue-500 px-6 py-3 rounded-lg`}
          onPress={volverADocumentos}
        >
          <Text style={tw`text-white font-semibold`}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Header Fijo */}
      <View style={tw`bg-white border-b border-gray-200 px-4 pt-12 pb-4`}>
        <View style={tw`flex-row items-center justify-between mb-1`}>
          <Pressable
            style={tw`p-2`}
            onPress={volverADocumentos}
          >
            <Ionicons name="arrow-back" size={24} color="#212529" />
          </Pressable>

          <View style={tw`flex-1 items-center`}>
            <Text style={tw`text-lg font-bold text-[#212529]`}>
              Particiones del Envío
            </Text>
          </View>

          <View style={tw`w-10`} />
        </View>
      </View>

      {/* Contenido Principal */}
      <View style={tw`flex-1 p-4`}>
        <View style={tw`bg-white rounded-xl shadow-lg overflow-hidden flex-1`}>
          {/* Título */}
          <View style={tw`p-4 pb-3`}>
            <View style={tw`flex-row items-center justify-between mb-1`}>
              <Text style={tw`text-lg font-bold text-[#212529]`}>
                Lista de Particiones
              </Text>
              <View style={tw`flex-row items-center`}>
                {refreshing && (
                  <ActivityIndicator size="small" color="#212529" style={tw`mr-2`} />
                )}
                <Pressable
                  onPress={onRefresh}
                  disabled={refreshing}
                  style={tw`p-1 rounded ${refreshing ? 'opacity-50' : ''}`}
                >
                  <Ionicons
                    name="refresh"
                    size={20}
                    color="#212529"
                  />
                </Pressable>
              </View>
            </View>
            <Text style={tw`text-gray-600 text-xs`}>
              Selecciona una partición para ver su documento completo
            </Text>
          </View>

          {/* Tabla */}
          <View style={tw`flex-1 border border-gray-200 rounded-xl mx-4 mb-4 overflow-hidden`}>
            {particiones.length === 0 ? (
              <View style={tw`flex-1 justify-center items-center py-16`}>
                <Ionicons name="document-outline" size={48} color="#9CA3AF" />
                <Text style={tw`text-gray-500 text-sm mt-3`}>
                  No hay particiones para este envío
                </Text>
              </View>
            ) : (
              <FlatList
                data={particiones}
                renderItem={renderParticion}
                keyExtractor={(item) => item.id_asignacion.toString()}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#007bff']}
                    tintColor="#007bff"
                  />
                }
                ListHeaderComponent={renderHeader}
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

export default DocumentoParticiones;