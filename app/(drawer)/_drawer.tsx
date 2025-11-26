import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, Image,} from 'react-native';
import { DrawerContentScrollView, useDrawerStatus } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import tw from 'twrnc';

export default function CustomDrawer(props: any) {
  const [usuario, setUsuario] = useState<{ nombre: string; rol: string }>({ nombre: 'Usuario', rol: '' });
  const [showModal, setShowModal] = useState(false);
  const isDrawerOpen = useDrawerStatus();

  const cargarUsuario = async () => {
    const raw = await AsyncStorage.getItem('usuario');
    const parsed = raw ? JSON.parse(raw) : {};
    setUsuario({
      nombre: parsed.nombre || 'Usuario',
      rol: parsed.rol || '',
    });
  };

  useEffect(() => {
    cargarUsuario();
  }, []);

  useEffect(() => {
    if (isDrawerOpen === 'open') {
      cargarUsuario();
    }
  }, [isDrawerOpen]);

  const cerrarSesion = async () => {
    await AsyncStorage.clear();
    setShowModal(false);
    router.replace('/(auth)/login');

  };

  return (
    <View style={tw`flex-1 bg-[#0140CD]`}>
      <DrawerContentScrollView {...props} contentContainerStyle={tw`flex-grow`}>
        {/* Espacio superior más razonable */}
        <View style={tw`items-center mt-10 mb-6`}>
          <View style={tw`flex-row items-center`}>
            <View style={tw`items-center mb-2`}>
              <Image source={require('../../assets/logo.png')} style={tw`w-10 h-10`} />
            </View>
            <Text style={tw`ml-3 text-white text-xl font-bold`}>OrgTrack</Text>
          </View>
        </View>

        {/* Bienvenida centrada */}
        <View style={tw`items-center mb-4`}>
          <Text style={tw`text-white text-base`}>Bienvenido</Text>
          <Text style={tw`text-white text-xl font-bold`}>{usuario.nombre}</Text>
        </View>

        {/* Línea separadora */}
        <View style={tw`h-px bg-white opacity-20 mx-5 mb-4`} />


        {/* Opción: Nuevos envios Cliente*/}
        {usuario.rol === 'cliente' && (
          <Pressable
            style={tw`flex-row items-center py-3 px-5`}
            onPress={() => router.push('/(drawer)/home')}
          >
            <Ionicons name="add-outline" size={22} color="#fff" />
            <Text style={tw`text-white text-base ml-3`}>Nuevo envío</Text>
          </Pressable>
        )}
        

         {/* Opción: Seguimiento de envio clientes*/}
        {usuario.rol === 'cliente' && (
          <Pressable
            style={tw`flex-row items-center py-3 px-5`}
            onPress={() => router.push('/(drawer)/envio')}
          >
            <Ionicons name="cube-outline" size={22} color="#fff" />
            <Text style={tw`text-white text-base ml-3`}>Envios</Text>
          </Pressable>
        )}


         {/* Opción: Ubicaciones Guardadas */}
        {usuario.rol === 'cliente' && (
          <Pressable
            style={tw`flex-row items-center py-3 px-5`}
            onPress={() => router.push('/(drawer)/ubicaciones-guardadas')}
          >
            <Ionicons name="location-outline" size={22} color="#fff" />
            <Text style={tw`text-white text-base ml-3`}>Ubicaciones Guardadas</Text>
          </Pressable>
        )}


         {/* Opción: Documentos Cliente */}
        {usuario.rol === 'cliente' && (
          <Pressable
            style={tw`flex-row items-center py-3 px-5`}
            onPress={() => router.push('/(drawer)/documentos')}
          >
            <Ionicons name="document-text-outline" size={22} color="#fff" />
            <Text style={tw`text-white text-base ml-3`}>Documentos</Text>
          </Pressable>
        )}

      </DrawerContentScrollView>

      {/* Botón Cerrar sesión - vuelve a estar abajo */}
      <Pressable 
        style={[
          tw`flex-row items-center bg-white py-3.5 px-4 rounded-xl justify-center mx-5 mb-10`,
          {
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowOffset: { width: 0, height: 3 },
            shadowRadius: 6,
            elevation: 4
          }
        ]} 
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="log-out-outline" size={22} color="#0140CD" />
        <Text style={tw`text-[#0140CD] text-base font-semibold ml-2.5`}>Cerrar sesión</Text>
      </Pressable>

      {/* Modal */}
      <Modal transparent visible={showModal} animationType="fade">
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center`}>
          <View style={tw`bg-white rounded-2xl p-6 w-4/5 items-center`}>
            <Ionicons name="alert-circle-outline" size={48} color="#dc3545" />
            <Text style={tw`text-xl font-bold mt-2.5 text-gray-800`}>¿Cerrar sesión?</Text>
            <Text style={tw`text-sm text-gray-600 my-2.5 text-center`}>Perderás el acceso a tu cuenta.</Text>
            <View style={tw`flex-row gap-3 mt-5`}>
              <Pressable
                style={tw`flex-1 py-2.5 px-4.5 rounded-xl items-center bg-white border-2 border-[#0140CD]`}
                onPress={() => setShowModal(false)}
              >
                <Text style={tw`text-[#0140CD] font-semibold`}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={tw`flex-1 py-2.5 px-4.5 rounded-xl items-center bg-red-600`}
                onPress={cerrarSesion}
              >
                <Text style={tw`text-white font-semibold`}>Sí, salir</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}