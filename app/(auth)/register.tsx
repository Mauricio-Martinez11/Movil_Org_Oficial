import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { getBackendApiBase } from '../config/api-config';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
  Animated,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import tw from 'twrnc';

export default function RegisterScreen() {
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [cedula, setCedula] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState<'cliente' | 'transportista'>('cliente');
  const [showRolModal, setShowRolModal] = useState(false);
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [barWidth, setBarWidth] = useState(0);
  const animatedColor = useRef(new Animated.Value(0)).current;
  const [barColor, setBarColor] = useState('#f3f4f6');

  const passwordLength = contrasena.length >= 8;
  const passwordUpper = /[A-Z]/.test(contrasena);
  const passwordNumber = /[0-9]/.test(contrasena);
  let passwordScore = 0;
  if (passwordLength) passwordScore++;
  if (passwordUpper) passwordScore++;
  if (passwordNumber) passwordScore++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(contrasena)) passwordScore++; // símbolo especial
  if (contrasena.length >= 12) passwordScore++; // longitud extra

  let passwordStrength = 'Débil';
  let passwordColor = '#f87171'; // rojo
  if (passwordScore >= 5) {
    passwordStrength = 'Muy fuerte';
    passwordColor = '#16a34a'; // verde oscuro
  } else if (passwordScore === 4) {
    passwordStrength = 'Fuerte';
    passwordColor = '#22c55e'; // verde
  } else if (passwordScore === 3) {
    passwordStrength = 'Media';
    passwordColor = '#fbbf24'; // amarillo
  }
  const passwordsMatch = contrasena === confirmarContrasena && contrasena.length > 0;
  const isFormValid =
    nombre.trim() !== '' &&
    apellido.trim() !== '' &&
    correo.trim().includes('@') &&
    cedula.trim() !== '' &&
    passwordLength &&
    acceptTerms;

  // Animar SOLO el color de la barra cuando cambie la fortaleza
  useEffect(() => {
    // Map passwordScore to a value: 0 (débil), 1 (media), 2 (fuerte)
    let toValue = 0;
    if (passwordScore === 3) toValue = 2;
    else if (passwordScore === 2) toValue = 1;
    else toValue = 0;
    Animated.timing(animatedColor, {
      toValue,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [passwordScore]);

  // Interpolación de color
  const interpolatedColor = animatedColor.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['#f87171', '#fbbf24', '#22c55e'], // rojo, amarillo, verde
  });

  // Define el número de rayas como constante
  const NUM_RAYAS = 5;

  // Arrays de Animated.Value para escala y opacidad de las rayas (longitud fija)
  const scaleArr = useRef(Array.from({ length: NUM_RAYAS }, () => new Animated.Value(1))).current;
  const opacityArr = useRef(Array.from({ length: NUM_RAYAS }, () => new Animated.Value(0.3))).current;

  useEffect(() => {
    for (let idx = 0; idx < NUM_RAYAS; idx++) {
      const filled = passwordScore > idx;
      Animated.parallel([
        Animated.timing(scaleArr[idx], {
          toValue: filled ? 1.15 : 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityArr[idx], {
          toValue: filled ? 1 : 0.3,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [passwordScore]);

  // Validación avanzada para nombre y apellido
  function esNombreValido(valor: string) {
    // Solo letras y espacios
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(valor)) return false;
    // Longitud mínima
    if (valor.trim().length < 2) return false;
    // Debe tener al menos una vocal
    if (!/[aeiouáéíóúAEIOUÁÉÍÓÚ]/.test(valor)) return false;
    // No más de 2 letras iguales seguidas
    if (/(.)\1{2,}/i.test(valor)) return false;
    // No más de 4 consonantes seguidas
    if (/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(valor)) return false;
    return true;
  }
  const isNombreValid = esNombreValido(nombre.trim());
  const isApellidoValid = esNombreValido(apellido.trim());

  // Mensajes de error profesionales
  const nombreError = nombre.length > 0 && !isNombreValid ? 'Solo letras de la A a la Z, mínimo 2 caracteres y una vocal.' : '';
  const apellidoError = apellido.length > 0 && !isApellidoValid ? 'Solo letras de la A a la Z, mínimo 2 caracteres y una vocal.' : '';

  // Validación para correo solo @gmail.com
  const correoRegex = /^[\w.-]+@gmail\.com$/i;
  const isCorreoValid = correoRegex.test(correo.trim());

  // Mensajes de error
  const correoError = correo.length > 0 && !isCorreoValid ? 'Por favor, ingresa un correo válido que termine en @gmail.com.' : '';

  // Contraseña válida si cumple score >= 3
  const isPasswordValid = passwordScore >= 3;

  const handleRegister = async () => {
    if (!isFormValid) return;
    setLoading(true);
    try {
      const endpoint = `${getBackendApiBase()}/auth/register`;
      console.log('Endpoint completo:', endpoint);
      console.log('Enviando datos de registro:', {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        correo: correo.trim(),
        ci: cedula.trim(),
        telefono: telefono.trim() || null,
        rol: tipoUsuario,
        contrasena: '***'
      });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          nombre: nombre.trim(), 
          apellido: apellido.trim(), 
          correo: correo.trim(), 
          ci: cedula.trim(),
          telefono: telefono.trim() || null,
          rol: tipoUsuario,
          contrasena 
        }),
      });

      console.log('Status de respuesta:', res.status);
      
      const contentType = res.headers.get('content-type');
      console.log('Content-Type:', contentType);

      // Si la respuesta no es JSON, mostrar el texto completo
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await res.text();
        console.log('Respuesta del servidor (HTML):', textResponse.substring(0, 500));
        throw new Error('El servidor devolvió HTML. El endpoint /api/auth/register puede estar protegido o no existir.');
      }

      const data = await res.json();
      console.log('Respuesta del servidor:', data);

      if (!res.ok) {
        // Manejar errores de validación de Laravel (422)
        if (res.status === 422 && data.errors) {
          const errorMessages = Object.values(data.errors).flat().join('. ');
          throw new Error(errorMessages);
        }
        throw new Error(data.error || data.message || 'Error en registro');
      }
      
      setError('');
      setSuccess(true);
      setIsNavigating(true);
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 1500);
    } catch (e: any) {
      console.error('Error en registro:', e);
      setError(e.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={tw`flex-1 bg-[#E8E8E8]`} contentContainerStyle={tw`flex-1 justify-center items-center py-6`} removeClippedSubviews={true}>
      {/* Título OrgTrack arriba fuera del card */}
      <View style={tw`mb-6`}>
        <Text style={[tw`text-4xl font-bold text-center`, { color: '#5A5A5A' }]}>
          <Text style={{ color: '#6B6B6B' }}>Org</Text>
          <Text style={{ color: '#8B8B8B' }}>Track</Text>
        </Text>
      </View>

      <View style={[tw`bg-white rounded-2xl p-6 w-11/12 max-w-md shadow-lg`]}>
        {/* Subtítulo */}
        <View style={tw`items-center mb-5`}>
          <Text style={tw`text-gray-600 text-base`}>Registrar nueva cuenta</Text>
        </View>

        {/* Nombre con icono */}
        <View style={tw`mb-4`}>
          <View style={tw`flex-row items-center bg-white border border-gray-300 rounded-lg px-4 py-3`}>
            <Feather name="user" size={20} color="#999" style={tw`mr-3`} />
            <TextInput
              placeholder="Nombre"
              placeholderTextColor="#9CA3AF"
              value={nombre}
              onChangeText={setNombre}
              style={tw`flex-1 text-gray-700 text-base`}
              editable={!loading}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={30}
            />
          </View>
          {nombreError !== '' && (
            <Text style={[tw`text-xs mt-1`, { color: '#f87171' }]}>Solo letras.</Text>
          )}
        </View>

        {/* Apellido con icono */}
        <View style={tw`mb-4`}>
          <View style={tw`flex-row items-center bg-white border border-gray-300 rounded-lg px-4 py-3`}>
            <Feather name="user" size={20} color="#999" style={tw`mr-3`} />
            <TextInput
              placeholder="Apellido"
              placeholderTextColor="#9CA3AF"
              value={apellido}
              onChangeText={setApellido}
              style={tw`flex-1 text-gray-700 text-base`}
              editable={!loading}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={30}
            />
          </View>
          {apellidoError !== '' && (
            <Text style={[tw`text-xs mt-1`, { color: '#f87171' }]}>Solo letras.</Text>
          )}
        </View>

        {/* Correo con icono */}
        <View style={tw`mb-4`}>
          <View style={tw`flex-row items-center bg-white border border-gray-300 rounded-lg px-4 py-3`}>
            <Feather name="mail" size={20} color="#999" style={tw`mr-3`} />
            <TextInput
              placeholder="Correo"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              value={correo}
              onChangeText={setCorreo}
              style={tw`flex-1 text-gray-700 text-base`}
              editable={!loading}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={40}
            />
          </View>
          {correoError !== '' && (
            <Text style={[tw`text-xs mt-1`, { color: '#f87171' }]}>Por favor, ingresa un correo válido que termine en @gmail.com.</Text>
          )}
        </View>

        {/* Cédula con icono */}
        <View style={tw`mb-4`}>
          <View style={tw`flex-row items-center bg-white border border-gray-300 rounded-lg px-4 py-3`}>
            <Feather name="credit-card" size={20} color="#999" style={tw`mr-3`} />
            <TextInput
              placeholder="Cédula (CI)"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={cedula}
              onChangeText={setCedula}
              style={tw`flex-1 text-gray-700 text-base`}
              editable={!loading}
              maxLength={20}
            />
          </View>
        </View>

        {/* Contraseña con icono */}
        <View style={tw`mb-4`}>
          <View style={tw`flex-row items-center bg-white border border-gray-300 rounded-lg px-4 py-3`}>
            <Feather name="lock" size={20} color="#999" style={tw`mr-3`} />
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={contrasena}
              onChangeText={setContrasena}
              style={tw`flex-1 text-gray-700 text-base`}
              editable={!loading}
            />
          </View>
          {/* Mensaje de requisitos y rayas solo visibles si hay algo escrito */}
          {contrasena.length > 0 && (
            <>
              <Text style={tw`text-xs text-red-500 mt-1 mb-2 text-center`}>Mínimo 8 caracteres, 1 mayúscula y 1 número.</Text>
              <Animated.View style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 8,
                marginBottom: 8,
                gap: 10,
                opacity: 1,
                transform: [{ scale: 1 }],
              }}>
                {Array.from({ length: NUM_RAYAS }).map((_, idx) => (
                  <Animated.View
                    key={idx}
                    style={{
                      width: 24,
                      height: 8,
                      borderRadius: 4,
                      marginHorizontal: 5,
                      backgroundColor: passwordScore > idx ? passwordColor : '#e5e7eb',
                      borderWidth: 1.5,
                      borderColor: passwordScore > idx ? passwordColor : '#cbd5e1',
                      transform: [{ scaleX: scaleArr[idx] }],
                      opacity: opacityArr[idx],
                      shadowColor: passwordScore > idx ? passwordColor : '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: passwordScore > idx ? 0.15 : 0.05,
                      shadowRadius: passwordScore > idx ? 2 : 1,
                      elevation: passwordScore > idx ? 2 : 0,
                    }}
                  />
                ))}
              </Animated.View>
              <View style={{ flexDirection: 'row', alignItems: 'center', height: 20, minHeight: 20, maxHeight: 20, justifyContent: 'center' }}>
                <Text style={[tw`text-xs text-gray-600`, { fontWeight: '600' }]}>Fortaleza: </Text>
                <View style={{ width: 70, height: 20, justifyContent: 'center' }}>
                  <Text style={{ color: passwordColor, fontWeight: '600', fontSize: 12, textAlignVertical: 'center' }}>{passwordStrength}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Teléfono con icono */}
        <View style={tw`mb-4`}>
          <View style={tw`flex-row items-center bg-white border border-gray-300 rounded-lg px-4 py-3`}>
            <Feather name="phone" size={20} color="#999" style={tw`mr-3`} />
            <TextInput
              placeholder="Teléfono (opcional)"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={setTelefono}
              style={tw`flex-1 text-gray-700 text-base`}
              editable={!loading}
              maxLength={15}
            />
          </View>
        </View>

        {/* Selector tipo usuario con icono */}
        <View style={tw`mb-4`}>
          <Pressable
            onPress={() => setShowRolModal(true)}
            style={tw`flex-row items-center bg-white border border-gray-300 rounded-lg px-4 py-3 justify-between`}
          >
            <View style={tw`flex-row items-center flex-1`}>
              <Feather name="users" size={20} color="#999" style={tw`mr-3`} />
              <Text style={tw`text-gray-700 text-base`}>{tipoUsuario === 'cliente' ? 'Cliente' : 'Transportista'}</Text>
            </View>
            <Feather name="chevron-down" size={20} color="#999" />
          </Pressable>
        </View>

        {/* Modal para seleccionar rol */}
        <Modal visible={showRolModal} transparent animationType="fade">
          <Pressable 
            style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center`}
            onPress={() => setShowRolModal(false)}
          >
            <View style={tw`bg-white rounded-lg w-4/5 p-4`} onStartShouldSetResponder={() => true}>
              <Text style={tw`text-lg font-bold mb-4 text-center`}>Seleccionar tipo de usuario</Text>
              <Pressable
                style={tw`border-b border-gray-200 py-3`}
                onPress={() => {
                  setTipoUsuario('cliente');
                  setShowRolModal(false);
                }}
              >
                <Text style={tw`text-gray-800 text-base`}>Cliente</Text>
              </Pressable>
              <Pressable
                style={tw`py-3`}
                onPress={() => {
                  setTipoUsuario('transportista');
                  setShowRolModal(false);
                }}
              >
                <Text style={tw`text-gray-800 text-base`}>Transportista</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {/* Checkbox términos */}
        <Pressable 
          onPress={() => setAcceptTerms(!acceptTerms)} 
          style={tw`flex-row items-center mb-4`}
        >
          <View style={tw`w-5 h-5 border-2 ${acceptTerms ? 'border-[#007AFF] bg-[#007AFF]' : 'border-gray-400'} rounded mr-2 items-center justify-center`}>
            {acceptTerms && <Feather name="check" size={14} color="white" />}
          </View>
          <Text style={tw`text-gray-700 text-sm`}>
            Acepto los <Text style={tw`text-[#007AFF] font-semibold`}>términos</Text>
          </Text>
        </Pressable>

        {/* Botón Registrar */}
        <Pressable
          onPress={handleRegister}
          disabled={loading || !isFormValid || isNavigating || success}
          style={tw`bg-[#007AFF] py-3.5 rounded-lg items-center mb-4 ${(!isFormValid || isNavigating || success) ? 'opacity-70' : ''}`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={tw`text-white text-base font-semibold`}>Registrar</Text>
          )}
        </Pressable>

        {/* Link a login */}
        <View style={tw`items-center`}>
          <Pressable 
            onPress={() => {
              if (!loading && !isNavigating && !success) {
                setIsNavigating(true);
                router.replace('/(auth)/login');
              }
            }}
            disabled={loading || isNavigating || success}
            style={({ pressed }) => tw`${(loading || isNavigating || success) ? 'opacity-50' : ''} ${pressed ? 'opacity-80' : ''}`}
          >
            <Text style={tw`text-[#007AFF] text-sm`}>Ya tengo una cuenta</Text>
          </Pressable>
        </View>

        {/* Error message */}
        {!!error && (
          <View style={tw`mt-4 bg-red-100 p-2 rounded`}>
            <Text style={tw`text-red-600`}>{error}</Text>
          </View>
        )}
      </View>

      {/* Success Modal */}
      {success && (
        <View style={tw`absolute inset-0 bg-black bg-opacity-50 justify-center items-center px-6`}>
          <View style={tw`bg-white rounded-3xl p-6 w-full max-w-sm items-center shadow-2xl`}>
            <View style={tw`w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4`}>
              <Feather name="check" size={32} color="#10B981" />
            </View>
            <Text style={tw`text-gray-800 text-xl font-bold mb-2 text-center`}>
              ¡Registro exitoso!
            </Text>
            <Text style={tw`text-gray-600 text-base text-center`}>
              {tipoUsuario === 'cliente' ? 'Cliente registrado correctamente' : 'Transportista registrado correctamente'}
            </Text>
          </View>
        </View>
      )}

      {/* Error Modal */}
      {!!error && (
        <View style={tw`absolute inset-0 bg-black bg-opacity-50 justify-center items-center px-6`}>
          <View style={tw`bg-white rounded-3xl p-6 w-full max-w-sm items-center shadow-2xl`}>
            <View style={tw`w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4`}>
              <Feather name="x" size={32} color="#EF4444" />
            </View>
            <Text style={tw`text-gray-800 text-xl font-bold mb-2 text-center`}>
              Error
            </Text>
            <Text style={tw`text-gray-600 text-base text-center mb-4`}>
              {error}
            </Text>
            <Pressable
              onPress={() => setError('')}
              style={tw`bg-red-500 px-6 py-3 rounded-lg`}
            >
              <Text style={tw`text-white font-semibold`}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
