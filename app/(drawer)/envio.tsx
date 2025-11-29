import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import tw from 'twrnc';
import { getBackendApiBase } from '../config/api-config';

type EnvioCliente = {
  id: number;
  estado: string;
  fecha_recogida?: string;
  hora_recogida?: string;
  hora_entrega?: string;
  nombre_origen?: string;
  nombre_destino?: string;
  [key: string]: any;
};

export default function EnvioScreen() {
  const [enviosCliente, setEnviosCliente] = useState<EnvioCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usuario, setUsuario] = useState<{ nombre: string }>({ nombre: 'Usuario' });
  const [filtroActual, setFiltroActual] = useState<string>('curso');

  const navigation = useNavigation();

  // Fetch shipments for cliente
  const fetchEnviosCliente = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) { 
        setEnviosCliente([]); 
        return; 
      }
      
      const res = await fetch(`${getBackendApiBase()}/envios/mis-envios`, {
        method: 'GET',
        headers: { 
          Authorization: `Bearer ${token}` 
        },
      });

      if (!res.ok) {
        throw new Error('No se pudo obtener los envíos');
      }

      const data = await res.json();
      setEnviosCliente(data || []);
    } catch (err) {
      console.error('❌ Error al obtener los envíos:', err);
      setEnviosCliente([]);
    } finally {
      setLoading(false);
    }
  };

  // Load user and shipments on focus
  useFocusEffect(
    useCallback(() => {
      const cargar = async () => {
        const raw = await AsyncStorage.getItem('usuario');
        const parsed = raw ? JSON.parse(raw) : {};
        setUsuario({ nombre: parsed.nombre || 'Usuario' });
        
        // Cliente inicia en "curso"
        setFiltroActual('curso');
        await fetchEnviosCliente();
      };
      cargar();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEnviosCliente();
    setRefreshing(false);
  };

  // Filtrar envíos para cliente
  const enviosClienteFiltrados = enviosCliente.filter(envio => {
    switch (filtroActual) {
      case 'anteriores':
        return envio.estado === 'Entregado';
      case 'curso':
        return envio.estado === 'En curso';
      case 'pendientes':
        return envio.estado === 'Pendiente' || envio.estado === 'Asignado';
      default:
        return true;
    }
  });

  // Formatear fecha
  const formatearFecha = (fecha: string | undefined) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString();
  };

  // Formatear hora
  const formatearHora = (hora: string | undefined) => {
    if (!hora || hora === '00:00:00.000Z') return '—';
    return hora.substring(0, 5);
  };

  // Obtener color de estado para cliente
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Pendiente':
        return '#EAB308'; // yellow
      case 'Asignado':
        return '#8B5CF6'; // purple
      case 'En curso':
        return '#3B82F6'; // blue
      case 'Entregado':
        return '#10B981'; // green
      default:
        return '#6B7280'; // gray
    }
  };

  // Render shipment para cliente
  const renderEnvioCliente = ({ item }: { item: EnvioCliente }) => (
    <View style={tw`mb-4`}>
      <TouchableOpacity
        style={[
          tw`bg-white mx-4 rounded-xl p-4 shadow`,
          { 
            borderLeftWidth: 4, 
            borderLeftColor: '#0140CD',
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 4,
            elevation: 3
          }
        ]}
        onPress={async () => {
          // Guardar el envío seleccionado y navegar a seguimiento
          await AsyncStorage.setItem('envioEnSeguimiento', item.id.toString());
          router.push('/seguimiento_envio');
        }}
      >
        <View style={tw`flex-row items-center mb-2`}>
          <Ionicons name="cube-outline" size={24} color="#0140CD" />
          <Text style={tw`text-gray-800 text-lg font-semibold ml-2`}>
            Envío N.º {item.id}
          </Text>
        </View>
        <Text style={tw`text-gray-500 text-sm mb-3`}>
          {item.nombre_origen || 'Origen'} → {item.nombre_destino || 'Destino'} ▪︎ {formatearFecha(item.fecha_recogida)}
        </Text>
        <View style={tw`self-start rounded-xl overflow-hidden`}>
          <Text style={tw`text-white py-1 px-3 text-xs bg-[#0140CD]`}>
            {item.estado}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={tw`flex-1 bg-gray-100`}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={tw`flex-row items-center pt-14 px-4 pb-4 bg-white`}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color="#0140CD" /> 
        </TouchableOpacity>
        <View style={tw`flex-1 items-center`}>
          <Text style={tw`text-xl font-bold text-[#0140CD]`}>
            Envíos
          </Text>
        </View>
        <View style={tw`w-7`} />
      </View>

      {/* Filtros para clientes */}
      <View style={tw`flex-row justify-center py-3 bg-white mb-px`}>
        <TouchableOpacity
          style={tw`px-3 py-1.5 mx-1 ${filtroActual === 'curso' ? 'border border-[#212529] rounded-full' : ''}`}
          onPress={() => setFiltroActual('curso')}
        >
          <Text style={tw`${filtroActual === 'curso' ? 'text-[#212529]' : 'text-gray-600'}`}>
            En Curso
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={tw`px-3 py-1.5 mx-1 ${filtroActual === 'anteriores' ? 'border border-[#212529] rounded-full' : ''}`}
          onPress={() => setFiltroActual('anteriores')}
        >
          <Text style={tw`${filtroActual === 'anteriores' ? 'text-[#212529]' : 'text-gray-600'}`}>
            Anteriores
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={tw`px-3 py-1.5 mx-1 ${filtroActual === 'pendientes' ? 'border border-[#212529] rounded-full' : ''}`}
          onPress={() => setFiltroActual('pendientes')}
        >
          <Text style={tw`${filtroActual === 'pendientes' ? 'text-[#212529]' : 'text-gray-600'}`}>
            Pendientes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de envíos */}
      {loading ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#0140CD" />
        </View>
      ) : enviosClienteFiltrados.length === 0 ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <Text style={tw`text-gray-600 text-lg`}>No hay envíos para mostrar</Text>
        </View>
      ) : (
        <FlatList
          data={enviosClienteFiltrados}
          keyExtractor={item => item.id.toString()}
          renderItem={renderEnvioCliente}
          contentContainerStyle={tw`pt-2 pb-6`}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={['#0140CD']} 
            />
          }
        />
      )}
    </View>
  );
}