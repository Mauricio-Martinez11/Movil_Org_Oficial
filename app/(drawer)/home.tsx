import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import tw from 'twrnc';
import { getBackendApiBase } from '../config/api-config';

type Envio = {
  id_asignacion: number;
  id_envio: number;
  estado_envio: string;
  cargas?: { tipo: string }[];
  recogidaEntrega?: { fecha_recogida: string };
  cliente?: string;
  origen?: string;
  destino?: string;
  estado?: string;
  [key: string]: any;
};

export default function HomeScreen() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usuario, setUsuario] = useState<{ nombre: string; rol: string }>({ nombre: 'Juan', rol: 'transportista' });
  const [filtroActual, setFiltroActual] = useState<string>('asignado');
  const [btnDisabled, setBtnDisabled] = useState(false);

  const navigation = useNavigation();

  // Fetch shipments for transportista
  const fetchEnvios = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) { 
        console.log('No hay token, no se pueden cargar envíos');
        setEnvios([]); 
        setLoading(false);
        return; 
      }
      
      console.log('Realizando petición a:', `${getBackendApiBase()}/envios/transportista/asignados`);
      const res = await fetch(`${getBackendApiBase()}/envios/transportista/asignados`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('Status de la respuesta:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error del servidor:', res.status);
        console.error('Contenido de error:', errorText);
        
        // Si el error es 404 y dice que no es transportista válido
        if (res.status === 404) {
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error?.includes('transportista')) {
              console.warn('El usuario actual no tiene un perfil de transportista asociado');
              Alert.alert(
                'Perfil incompleto',
                'Tu cuenta de transportista aún no está completamente configurada. Por favor contacta al administrador.',
                [{ text: 'OK' }]
              );
            }
          } catch (e) {
            // No es JSON, ignorar
          }
        }
        
        setEnvios([]);
        setLoading(false);
        return;
      }
      
      const contentType = res.headers.get("content-type");
      console.log('Content-Type:', contentType);
      
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        console.log('Datos recibidos de la API:', data);
        console.log('Tipo de datos:', typeof data);
        console.log('Es array:', Array.isArray(data));
        
        // Asegurarse de que data sea un array
        if (Array.isArray(data)) {
          console.log('Estableciendo', data.length, 'envíos');
          setEnvios(data);
        } else {
          console.warn('La respuesta no es un array:', data);
          setEnvios([]);
        }
      } else {
        const textResponse = await res.text();
        console.error('La respuesta no es JSON. Content-Type:', contentType);
        console.error('Contenido:', textResponse.substring(0, 200));
        setEnvios([]);
      }
    } catch (err) {
      console.error('Error al obtener envíos:', err);
      if (err instanceof Error) {
        console.error('Mensaje de error:', err.message);
        console.error('Stack:', err.stack);
      }
      setEnvios([]);
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
        const rol = parsed.rol || 'transportista';
        setUsuario({ nombre: parsed.nombre || 'Juan', rol });
        if (rol === 'transportista') {
          await fetchEnvios();
        }
      };
      cargar();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      setBtnDisabled(false);
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (usuario.rol === 'transportista') {
      await fetchEnvios();
    }
    setRefreshing(false);
  };

  // Filtrar envíos según el estado seleccionado
  const enviosFiltrados = Array.isArray(envios) ? envios.filter(envio => {
    const estadoAsignacion = envio.estado?.toLowerCase() || '';
    const estadoEnvio = envio.estado_envio?.toLowerCase() || '';
    
    switch (filtroActual) {
      case 'en curso':
        return estadoAsignacion === 'en ruta' || estadoAsignacion === 'en curso';
      case 'completados':
        return estadoAsignacion === 'entregado';
      case 'asignado':
        return estadoAsignacion === 'asignado' || estadoAsignacion === 'pendiente';
      default:
        return true;
    }
  }) : [];

  // Render shipment
  const renderEnvio = ({ item }: { item: Envio }) => (
    <View style={tw`mb-4`}>
      <TouchableOpacity
        style={[
          tw`bg-white mx-4 rounded-xl p-4 shadow`,
          { 
            borderLeftWidth: 4, 
            borderLeftColor: '#007bff',
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 4,
            elevation: 3
          }
        ]}
        onPress={() =>
          router.replace({
            pathname: '/detalle-envio',
            params: { id_asignacion: item.id_asignacion.toString() },
          })
        }
      >
        <View style={tw`flex-row items-center mb-2`}>
          <Ionicons name="cube-outline" size={24} color="#007bff" />
          <Text style={tw`text-gray-800 text-lg font-semibold ml-2`}>
            Asignación N.º {item.id_asignacion}
          </Text>
        </View>
        <Text style={tw`text-gray-500 text-sm mb-3`}>
          Envío #{item.id_envio} ▪︎ {item.recogidaEntrega?.fecha_recogida?.split('T')[0] || '—'}
        </Text>
        <View style={tw`self-start rounded-xl overflow-hidden`}>
          <Text style={tw`text-white py-1 px-3 text-xs bg-[#007bff]`}>
            {item.estado || item.estado_envio}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={tw`flex-1 bg-gray-100`}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header con el logo original */}
      <View style={tw`flex-row items-center pt-14 px-4 pb-4 bg-white`}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color="#212529" /> 
        </TouchableOpacity>
        <View style={tw`flex-1 items-center`}>
          <Text style={tw`text-xl font-bold text-[#212529]`}>
            {usuario.rol === 'transportista' ? 'Envíos' : 'Nuevo envío'}
          </Text>
        </View>
        <View style={tw`w-7`} />
      </View>
      {(usuario.rol === 'admin' || usuario.rol === 'cliente') && (
        <View style={tw`h-px bg-gray-200`} />
      )}

      {/* Filtros - Solo visibles para transportistas */}
      {usuario.rol === 'transportista' && (
        <View style={tw`bg-white`}>
          <View style={tw`flex-row justify-center py-3 border-b border-gray-200`}>
            <TouchableOpacity
              style={tw`px-3 py-1.5 mx-1 ${filtroActual === 'en curso' ? 'border border-[#212529] rounded-full' : ''}`}
              onPress={() => setFiltroActual('en curso')}
            >
              <Text style={tw`${filtroActual === 'en curso' ? 'text-[#212529]' : 'text-gray-600'}`}>En Curso</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={tw`px-3 py-1.5 mx-1 ${filtroActual === 'completados' ? 'border border-[#212529] rounded-full' : ''}`}
              onPress={() => setFiltroActual('completados')}
            >
              <Text style={tw`${filtroActual === 'completados' ? 'text-[#212529]' : 'text-gray-600'}`}>Completados</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={tw`px-3 py-1.5 mx-1 ${filtroActual === 'asignado' ? 'border border-[#212529] rounded-full' : ''}`}
              onPress={() => setFiltroActual('asignado')}
            >
              <Text style={tw`${filtroActual === 'asignado' ? 'text-[#212529]' : 'text-gray-600'}`}>Asignados</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Mostrar panel de admin/cliente o lista de envíos para transportista */}
      {(usuario.rol === 'admin' || usuario.rol === 'cliente') ? (
        <View style={tw`flex-1 justify-center items-center p-4`}>
          <Text style={tw`text-gray-800 text-xl font-bold mb-5`}>Panel de Administrador</Text>
          <TouchableOpacity 
            style={[
              tw`flex-row items-center bg-white border-2 border-[#212529] py-3.5 px-6 rounded-xl`,
              { 
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 6,
                elevation: 4,
                opacity: btnDisabled ? 0.5 : 1,
              }
            ]} 
            onPress={() => {
              setBtnDisabled(true);
              router.push('/crear-envio/CrearEnvio');
            }}
            disabled={btnDisabled}
          >
            <Ionicons name="add-circle-outline" size={24} color="#212529" style={tw`mr-2`} />
            <Text style={tw`text-[#212529] text-base font-semibold`}>Crear Envío</Text>
          </TouchableOpacity>
        </View>
      ) : usuario.rol === 'transportista' && (
        loading ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color="#007bff" />
          </View>
        ) : enviosFiltrados.length === 0 ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <Text style={tw`text-gray-600 text-lg`}>No hay envíos para mostrar</Text>
            <Text style={tw`text-gray-500 text-sm mt-2`}>Pulsa recargar para intentar de nuevo.</Text>
            <TouchableOpacity
              style={tw`mt-4 bg-[#007bff] py-2 px-4 rounded-full flex-row items-center`}
              onPress={onRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#ffffff" style={tw`mr-2`} />
              ) : (
                <Ionicons name="refresh" size={16} color="#ffffff" style={tw`mr-2`} />
              )}
              <Text style={tw`text-white font-semibold`}>{refreshing ? 'Actualizando...' : 'Recargar'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={enviosFiltrados}
            keyExtractor={item => item.id_asignacion.toString()}
            renderItem={renderEnvio}
            contentContainerStyle={tw`pt-2 pb-6`}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                colors={['#007bff']} 
              />
            }
          />
        )
      )}
    </View>
  );
}
