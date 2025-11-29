import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { getBackendApiBase } from '../config/api-config';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import tw from 'twrnc';

export default function Login() {
  const router = useRouter();
  const { width } = Dimensions.get('window');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Auto-dismiss success toast after 2s
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => {
        setSuccess(false);
        setIsNavigating(true);
        router.replace('/home');
      }, 2400);
      return () => clearTimeout(t);
    }
  }, [success]);

  // Auto-dismiss error toast after 2s
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 2000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const emailRegex = /^[\w-.]+@[\w-]+\.[a-z]{2,}$/i;
  const isEmailValid = emailRegex.test(email);
  const isPasswordValid = password.length >= 6;
  const isFormValid = isEmailValid && isPasswordValid;

  const handleBlur = (field: 'email' | 'password') => {
    setFocused(null);
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleLogin = async () => {
    setTouched({ email: true, password: true });
    if (!isFormValid) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${getBackendApiBase()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: email.trim(), contrasena: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Credenciales inválidas');
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('usuario', JSON.stringify(data.usuario));
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={tw`flex-1 bg-[#E8E8E8]`}>
      <StatusBar barStyle="dark-content" backgroundColor="#E8E8E8" />
      
      <View style={tw`flex-1 justify-center items-center px-6`}>
        {/* Título OrgTrack arriba */}
        <View style={tw`mb-10`}>
          <Text style={[tw`text-4xl font-bold text-center`, { color: '#5A5A5A' }]}>
            <Text style={{ color: '#6B6B6B' }}>Org</Text>
            <Text style={{ color: '#8B8B8B' }}>Track</Text>
          </Text>
        </View>

        {/* Card blanco */}
        <View style={tw`bg-white w-full max-w-md rounded-2xl p-8 shadow-lg`}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Subtítulo */}
            <Text style={tw`text-gray-600 text-center text-base mb-6`}>
              Inicia sesión para continuar
            </Text>

            {/* Campo Correo con icono */}
            <View style={tw`mb-4`}>
              <View style={tw`flex-row items-center bg-white border border-gray-300 rounded-lg px-4 py-3 ${focused === 'email' ? 'border-[#0140CD]' : ''} ${touched.email && !isEmailValid ? 'border-red-400' : ''}`}>
                <Feather name="mail" size={20} color="#999" style={tw`mr-3`} />
                <TextInput
                  placeholder="Correo"
                  placeholderTextColor="#999"
                  style={tw`flex-1 text-gray-700 text-base`}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocused('email')}
                  onBlur={() => handleBlur('email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
              {touched.email && !isEmailValid && (
                <Text style={tw`text-red-500 text-xs mt-1`}>
                  Correo inválido
                </Text>
              )}
            </View>

            {/* Campo Contraseña con icono */}
            <View style={tw`mb-4`}>
              <View style={tw`flex-row items-center bg-white border border-gray-300 rounded-lg px-4 py-3 ${focused === 'password' ? 'border-[#0140CD]' : ''} ${touched.password && !isPasswordValid ? 'border-red-400' : ''}`}>
                <Feather name="lock" size={20} color="#999" style={tw`mr-3`} />
                <TextInput
                  placeholder="Contraseña"
                  placeholderTextColor="#999"
                  secureTextEntry
                  style={tw`flex-1 text-gray-700 text-base`}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused('password')}
                  onBlur={() => handleBlur('password')}
                  editable={!loading}
                />
              </View>
              {touched.password && !isPasswordValid && (
                <Text style={tw`text-red-500 text-xs mt-1`}>
                  La contraseña debe tener al menos 6 caracteres
                </Text>
              )}
            </View>

            {/* Checkbox Recordarme */}
            <Pressable 
              onPress={() => setRememberMe(!rememberMe)}
              style={tw`flex-row items-center mb-6`}
            >
              <View style={tw`w-5 h-5 border-2 ${rememberMe ? 'border-[#007AFF] bg-[#007AFF]' : 'border-gray-400'} rounded mr-2 items-center justify-center`}>
                {rememberMe && (
                  <Feather name="check" size={14} color="white" />
                )}
              </View>
              <Text style={tw`text-gray-700 text-sm`}>Recordarme</Text>
            </Pressable>

            {/* Botón Entrar */}
            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => tw`bg-[#007AFF] rounded-lg py-3.5 items-center mb-4 ${pressed ? 'opacity-90' : ''}`}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={tw`text-white text-base font-semibold`}>Entrar</Text>
              )}
            </Pressable>

            {/* Enlaces */}
            <View style={tw`items-center gap-2`}>
              <Pressable 
                onPress={() => alert('Funcionalidad por implementar')}
                disabled={loading || success || isNavigating}
                style={({ pressed }) => tw`${(loading || success || isNavigating) ? 'opacity-50' : ''} ${pressed ? 'opacity-80' : ''}`}
              >
                <Text style={tw`text-[#007AFF] text-sm`}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </Pressable>
              
              <Pressable 
                onPress={() => {
                  if (!loading && !success && !isNavigating) {
                    setIsNavigating(true);
                    router.replace('/(auth)/register');
                  }
                }}
                disabled={loading || success || isNavigating}
                style={({ pressed }) => tw`${(loading || success || isNavigating) ? 'opacity-50' : ''} ${pressed ? 'opacity-80' : ''}`}
              >
                <Text style={tw`text-[#007AFF] text-sm`}>
                  Registrar nueva cuenta
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>

      {/* Success Toast */}
      {success && (
        <View
          style={tw`absolute bottom-8 left-6 right-6 flex-row items-center p-3 rounded-xl bg-green-100`}
        >
          <Feather name="check-circle" size={20} color="#155724" />
          <Text style={tw`ml-2 text-sm font-medium text-green-800`}>
            Inicio de sesión exitoso
          </Text>
        </View>
      )}

      {/* Error Toast */}
      {!!error && (
        <View
          style={tw`absolute bottom-8 left-6 right-6 flex-row items-center p-3 rounded-xl bg-red-100`}
        >
          <Feather name="x-circle" size={20} color="#dc3545" />
          <Text style={tw`ml-2 text-sm font-medium text-red-700`}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}
