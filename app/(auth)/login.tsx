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
    <View style={tw`flex-1 bg-[#0140CD]`}>
      <StatusBar barStyle="light-content" backgroundColor="#0140CD" />
      
      <View style={tw`flex-1 justify-center items-center px-6`}>
        <View style={tw`bg-white w-full max-w-md rounded-3xl p-8 shadow-lg`}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Título y subtítulo */}
            <View style={tw`items-center mb-8`}>
              <Text style={tw`text-[#0140CD] text-3xl font-bold mb-2`}>OrgTrack</Text>
              <Text style={tw`text-gray-500 text-base`}>Entra a tu cuenta</Text>
            </View>

            {/* Correo electrónico */}
            <View style={tw`mb-4`}>
              <Text style={tw`text-gray-600 text-sm mb-1.5`}>Correo electrónico</Text>
              <TextInput
                placeholder="Email"
                placeholderTextColor="#999"
                style={tw`bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 ${focused === 'email' ? 'border-[#0140CD]' : ''} ${touched.email && !isEmailValid ? 'border-red-400' : ''}`}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused('email')}
                onBlur={() => handleBlur('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
              {touched.email && !isEmailValid && (
                <Text style={tw`text-red-500 text-xs mt-1`}>
                  Correo inválido
                </Text>
              )}
            </View>

            {/* Contraseña */}
            <View style={tw`mb-6`}>
              <Text style={tw`text-gray-600 text-sm mb-1.5`}>Contraseña</Text>
              <TextInput
                placeholder="Contraseña"
                placeholderTextColor="#999"
                secureTextEntry
                style={tw`bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 ${focused === 'password' ? 'border-[#0140CD]' : ''} ${touched.password && !isPasswordValid ? 'border-red-400' : ''}`}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused('password')}
                onBlur={() => handleBlur('password')}
                editable={!loading}
              />
              {touched.password && !isPasswordValid && (
                <Text style={tw`text-red-500 text-xs mt-1`}>
                  La contraseña debe tener al menos 6 caracteres
                </Text>
              )}
            </View>

            {/* Botón de iniciar sesión */}
            <View style={tw`mb-6`}>
              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={({ pressed }) => tw`bg-[#0140CD] rounded-xl py-3.5 items-center ${pressed ? 'opacity-90' : ''}`}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={tw`text-white text-base font-semibold`}>Entrar</Text>
                )}
              </Pressable>
            </View>

            {/* Olvidó contraseña y crear cuenta */}
            <View style={tw`items-center gap-3`}>
              <Pressable 
                onPress={() => alert('Funcionalidad por implementar')}
                disabled={loading || success || isNavigating}
                style={({ pressed }) => tw`${(loading || success || isNavigating) ? 'opacity-50' : ''} ${pressed ? 'opacity-80' : ''}`}
              >
                <Text style={tw`text-[#0140CD] text-sm`}>
                  ¿Has olvidado tu contraseña?
                </Text>
              </Pressable>
              
              <Pressable 
                onPress={() => router.push('/(auth)/register')}
                disabled={loading || success || isNavigating}
                style={({ pressed }) => tw`${(loading || success || isNavigating) ? 'opacity-50' : ''} ${pressed ? 'opacity-80' : ''}`}
              >
                <Text style={tw`text-[#0140CD] text-sm`}>
                  Crear cuenta nueva
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
