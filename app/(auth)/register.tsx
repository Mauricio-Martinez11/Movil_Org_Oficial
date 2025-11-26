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
    correo.trim().endsWith('@gmail.com') &&
    cedula.trim() !== '' &&
    passwordLength &&
    passwordsMatch &&
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
      const res = await fetch(`${getBackendApiBase()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en registro');
      setTimeout(() => router.replace('/login'), 1000);
    } catch (e: any) {
      setError(e.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={tw`flex-1 bg-[#0045cc]`} contentContainerStyle={tw`flex-1 justify-center items-center py-6`} removeClippedSubviews={true}>
      <View style={[tw`bg-white rounded-lg p-5 w-11/12 max-w-md`]}>
        {/* Title */}
        <View style={tw`items-center mb-3`}>
          <Text style={tw`text-2xl text-[#0045cc] font-bold`}>OrgTrack</Text>
          <Text style={tw`text-gray-600 text-sm mt-1`}>Crea tu cuenta</Text>
        </View>

        <View style={tw`flex-row gap-2 mb-3`}>
          <View style={tw`flex-1`}>
            <Text style={tw`text-gray-700 mb-1 text-sm`}>Nombre</Text>
            <TextInput
              placeholder="Tu nombre"
              value={nombre}
              onChangeText={setNombre}
              style={[tw`border rounded-lg text-base`, { height: 44, borderColor: isNombreValid ? '#22c55e' : '#d1d5db', backgroundColor: '#fff', textAlign: 'left', textAlignVertical: 'center', paddingHorizontal: 12 }]}
              editable={!loading}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={30}
            />
            {nombreError !== '' && (
              <Text style={[tw`text-xs mt-1`, { color: '#f87171' }]}>Solo letras.</Text>
            )}
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`text-gray-700 mb-1 text-sm`}>Apellido</Text>
            <TextInput
              placeholder="Tu apellido"
              value={apellido}
              onChangeText={setApellido}
              style={[tw`border rounded-lg text-base`, { height: 44, borderColor: isApellidoValid ? '#22c55e' : '#d1d5db', backgroundColor: '#fff', textAlign: 'left', textAlignVertical: 'center', paddingHorizontal: 12 }]}
              editable={!loading}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={30}
            />
            {apellidoError !== '' && (
              <Text style={[tw`text-xs mt-1`, { color: '#f87171' }]}>Solo letras.</Text>
            )}
          </View>
        </View>

        <View style={tw`mb-3`}>
          <Text style={tw`text-gray-700 mb-1 text-sm`}>Correo electrónico</Text>
          <TextInput
            placeholder="Email (@gmail.com)"
            keyboardType="email-address"
            value={correo}
            onChangeText={setCorreo}
            style={[tw`border rounded-lg text-base`, { height: 44, borderColor: isCorreoValid ? '#22c55e' : '#d1d5db', backgroundColor: '#fff', textAlign: 'left', textAlignVertical: 'center', paddingHorizontal: 12 }]}
            editable={!loading}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={40}
          />
          {correoError !== '' && (
            <Text style={[tw`text-xs mt-1`, { color: '#f87171' }]}>Por favor, ingresa un correo válido que termine en @gmail.com.</Text>
          )}
        </View>

        <View style={tw`flex-row gap-2 mb-3`}>
          <View style={tw`flex-1`}>
            <Text style={tw`text-gray-700 mb-1 text-sm`}>Cédula (CI)</Text>
            <TextInput
              placeholder="CI"
              keyboardType="numeric"
              value={cedula}
              onChangeText={setCedula}
              style={[tw`border rounded-lg text-base`, { height: 44, borderColor: '#d1d5db', backgroundColor: '#fff', textAlign: 'left', textAlignVertical: 'center', paddingHorizontal: 12 }]}
              editable={!loading}
              maxLength={20}
            />
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`text-gray-700 mb-1 text-sm`}>Teléfono</Text>
            <TextInput
              placeholder="Opcional"
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={setTelefono}
              style={[tw`border rounded-lg text-base`, { height: 44, borderColor: '#d1d5db', backgroundColor: '#fff', textAlign: 'left', textAlignVertical: 'center', paddingHorizontal: 12 }]}
              editable={!loading}
              maxLength={15}
            />
          </View>
        </View>

        <View style={tw`mb-3`}>
          <Pressable
            onPress={() => setShowRolModal(true)}
            style={[tw`border rounded-lg py-2.5 px-3 flex-row items-center justify-between`, { borderColor: '#d1d5db', backgroundColor: '#fff', height: 44 }]}
          >
            <Text style={tw`text-gray-700 text-base`}>{tipoUsuario === 'cliente' ? 'Cliente' : 'Transportista'}</Text>
            <Feather name="chevron-down" size={20} color="#6b7280" />
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

        <View style={tw`mb-3`}>
          <Text style={tw`text-gray-700 mb-1 text-sm`}>Contraseña</Text>
          <TextInput
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            value={contrasena}
            onChangeText={setContrasena}
            style={[tw`border rounded-lg text-base`, { height: 44, borderColor: isPasswordValid ? '#22c55e' : '#d1d5db', backgroundColor: '#fff', textAlign: 'left', textAlignVertical: 'center', paddingHorizontal: 12 }]}
            editable={!loading}
          />
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

        <View style={tw`mb-3`}>
          <Text style={tw`text-gray-700 mb-1 text-sm`}>Confirmar contraseña</Text>
          <TextInput
            placeholder="Repite tu contraseña"
            secureTextEntry
            value={confirmarContrasena}
            onChangeText={setConfirmarContrasena}
            style={[tw`border rounded-lg text-base`, { height: 44, borderColor: passwordsMatch ? '#22c55e' : '#d1d5db', backgroundColor: '#fff', textAlign: 'left', textAlignVertical: 'center', paddingHorizontal: 12 }]}
            editable={!loading}
          />
          {/* Reserva espacio para el mensaje de error, invisible si no aplica */}
          <View style={{ minHeight: 20, height: 20, maxHeight: 20, justifyContent: 'center' }}>
            <Text
              style={[
                tw`text-red-500 text-xs`,
                { opacity: !passwordsMatch && confirmarContrasena.length > 0 ? 1 : 0, fontWeight: '600' }
              ]}
            >
              Las contraseñas no coinciden
            </Text>
          </View>
        </View>

        {/* Checkbox for terms */}
        <Pressable 
          onPress={() => setAcceptTerms(!acceptTerms)} 
          style={tw`flex-row items-center mb-3`}
        >
          <View style={tw`w-5 h-5 border border-gray-400 rounded mr-2 ${acceptTerms ? 'bg-[#0045cc]' : 'bg-white'}`}>
            {acceptTerms && <Feather name="check" size={16} color="white" />}
          </View>
          <Text style={tw`text-gray-700 text-sm`}>
            Acepto los <Text style={tw`text-[#0045cc]`}>Términos y Condiciones</Text>
          </Text>
        </Pressable>

        {/* Register button */}
        <Pressable
          onPress={handleRegister}
          disabled={loading || !isFormValid}
          style={tw`bg-[#0045cc] py-2.5 rounded-lg items-center mb-3 ${!isFormValid ? 'opacity-70' : ''}`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={tw`text-white text-base font-semibold`}>Registrarse</Text>
          )}
        </Pressable>

        {/* Login link */}
        <View style={tw`items-center`}>
          <Text style={tw`text-gray-600`}>
            ¿Ya tienes una cuenta? <Text onPress={() => router.replace('/(auth)/login')} style={tw`text-[#0045cc]`}>Inicia sesión</Text>
          </Text>
        </View>

        {/* Error message */}
        {!!error && (
          <View style={tw`mt-4 bg-red-100 p-2 rounded`}>
            <Text style={tw`text-red-600`}>{error}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
