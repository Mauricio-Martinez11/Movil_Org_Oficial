import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    // Pequeño delay para asegurar que el router esté montado
    const timeout = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 100);

    return () => clearTimeout(timeout);
  }, []);

  // Mostrar indicador de carga mientras redirige
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <ActivityIndicator size="large" color="#0140CD" />
    </View>
  );
}