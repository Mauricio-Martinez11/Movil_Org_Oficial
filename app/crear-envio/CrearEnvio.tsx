import React, { useState, useEffect, useCallback, useRef, createRef } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  Alert, 
  Modal, 
  ActivityIndicator, 
  TextInput, 
  Platform, 
  BackHandler,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
  Image,
  Dimensions
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import tw from 'twrnc';
import { DrawerActions } from '@react-navigation/native';

import * as api from './api';
import {
  tiposCarga,
  variedadOptions,
  empaquetadoOptions,
} from './constants';

type Coordenada = { latitude: number; longitude: number };
type Carga = { 
  tipo: string; 
  variedad: string; 
  empaquetado: string; 
  cantidad: number; 
  peso: number;
};

type Particion = {
  fecha: string;
  horaRecogida: string;
  horaEntrega: string;
  instruccionesRecogida: string;
  instruccionesEntrega: string;
  cargas: Carga[];
  tipoTransporteLabel: string;
  tipoTransporteId: number | null;
};

type FormularioEnvio = {
  origen: Coordenada;
  destino: Coordenada;
  particiones: Particion[];
};

// AnimatedCard para animar aparición y salida de los cards
const AnimatedCard = ({ children, delay = 0, style, visible = true, onHide }: { children: React.ReactNode; delay?: number; style?: any; visible?: boolean; onHide?: () => void }) => {
  const cardAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (visible) {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(cardAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        if (onHide) onHide();
      });
    }
  }, [visible]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: cardAnim,
          transform: [
            { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
            { scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// Componente hijo para el acordeón de instrucciones especiales
const AcordeonInstrucciones = ({
  valueRecogida,
  valueEntrega,
  onChangeRecogida,
  onChangeEntrega,
}: {
  valueRecogida: string;
  valueEntrega: string;
  onChangeRecogida: (text: string) => void;
  onChangeEntrega: (text: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [open]);

  return (
    <>
      <Pressable
        style={tw`flex-row items-center bg-blue-50 border border-blue-100 rounded-xl px-3 py-3 mb-2 mt-1`}
        onPress={() => setOpen(v => !v)}
      >
        <Ionicons name="information-circle-outline" size={18} color="#3B82F6" />
        <Text style={tw`ml-2 text-blue-700 text-sm`}>Agregar instrucciones especiales <Text style={tw`text-gray-400`}>(Opcional)</Text></Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="#3B82F6" style={tw`ml-2`} />
      </Pressable>
      <Animated.View
        style={{
          height: contentHeight ? anim.interpolate({ inputRange: [0, 1], outputRange: [0, contentHeight] }) : 0,
          opacity: anim,
          marginBottom: open ? 16 : 0,
          overflow: 'hidden',
        }}
      >
        <View
          style={tw`border border-gray-300 border-l-4 border-l-blue-500 bg-white rounded-xl px-4 py-4`}
          onLayout={e => {
            const h = e.nativeEvent.layout.height;
            if (contentHeight !== h) setContentHeight(h);
          }}
        >
          <Text style={tw`text-gray-800 font-semibold mb-2`}>Añadir instrucciones especiales para el transportista</Text>
          <Text style={tw`text-xs text-gray-800 mb-1`}>Instrucciones en punto de recogida</Text>
          <TextInput
            style={tw`border border-gray-300 rounded-xl px-4 py-3 mb-3 text-gray-800 bg-white`}
            placeholder="Añadir instrucciones especiales para la recogida"
            placeholderTextColor="#9CA3AF"
            value={valueRecogida}
            onChangeText={onChangeRecogida}
            multiline
            numberOfLines={2}
          />
          <View style={tw`border-b border-gray-200 my-2`} />
          <Text style={tw`text-xs text-gray-800 mb-1`}>Instrucciones en punto de entrega</Text>
          <TextInput
            style={tw`border border-gray-300 rounded-xl px-4 py-3 text-gray-800 bg-white`}
            placeholder="Añadir instrucciones especiales para la entrega"
            placeholderTextColor="#9CA3AF"
            value={valueEntrega}
            onChangeText={onChangeEntrega}
            multiline
            numberOfLines={2}
          />
        </View>
      </Animated.View>
    </>
  );
};

export default function CrearEnvio() {
  const navigation = useNavigation();
  
  // Form state
  const [form, setForm] = useState<FormularioEnvio & { segmentos?: any[]; rutaGeoJSON?: any }>({
    origen: { latitude: 0, longitude: 0 },
    destino: { latitude: 0, longitude: 0 },
    particiones: [{
      fecha: '',
      horaRecogida: '',
      horaEntrega: '',
      instruccionesRecogida: '',
      instruccionesEntrega: '',
      cargas: [{ tipo: '', variedad: '', empaquetado: '', cantidad: 0, peso: 0 }],
      tipoTransporteLabel: '',
      tipoTransporteId: null
    }],
    segmentos: [],
    rutaGeoJSON: null
  });

  // Labels y errores
  const [origenLabel, setOrigenLabel] = useState('');
  const [destinoLabel, setDestinoLabel] = useState('');
  const [errores, setErrores] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Data
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);

  // UI flags
  const [showOrigenModal, setShowOrigenModal] = useState(false);
  const [showDestinoModal, setShowDestinoModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerIndex, setDatePickerIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerData, setTimePickerData] = useState<{particionIndex: number, tipo: 'recogida' | 'entrega'}>({particionIndex: 0, tipo: 'recogida'});
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showCargaModal, setShowCargaModal] = useState(false);
  const [cargaModalData, setCargaModalData] = useState<{particionIndex: number, cargaIndex: number, tipo: 'tipo' | 'variedad' | 'empaquetado'}>({particionIndex: 0, cargaIndex: 0, tipo: 'tipo'});
  const [showConfirmacion, setShowConfirmacion] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Estado para el paso actual
  const [step, setStep] = useState(1);

  // Ajustar el Stepper para 2 pasos visuales (más confirmación)
  let currentStep = step;
  if (showConfirmacion) {
    currentStep = 3;
  }

  // Estado y animación de barra de progreso para el stepper
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const [lineWidth, setLineWidth] = useState(0);

  // Animaciones de color para cada paso
  const colorAnim1 = React.useRef(new Animated.Value(0)).current;
  const colorAnim2 = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Paso 1 completado si currentStep > 1
    Animated.timing(colorAnim1, {
      toValue: currentStep > 1 ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
    // Paso 2 completado si currentStep > 2
    Animated.timing(colorAnim2, {
      toValue: currentStep > 2 ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  // Colores interpolados
  const circleBgColor1 = colorAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: ['#2563EB', '#10B981'], // azul-600 a verde-500
  });
  const borderColor1 = colorAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: ['#BFDBFE', '#6EE7B7'], // azul-200 a verde-200
  });
  const barColor1 = colorAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: ['#3B82F6', '#10B981'], // azul-400 a verde-500
  });
  const barBgColor1 = colorAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E5E7EB', '#A7F3D0'], // gris-200 a verde-200
  });
  const checkOpacity1 = colorAnim1;
  const checkScale1 = colorAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const circleBgColor2 = colorAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: ['#2563EB', '#10B981'], // azul-600 a verde-500
  });
  const borderColor2 = colorAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: ['#BFDBFE', '#6EE7B7'], // azul-200 a verde-200
  });
  const barColor2 = colorAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: ['#3B82F6', '#10B981'], // azul-400 a verde-500
  });
  const barBgColor2 = colorAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E5E7EB', '#A7F3D0'], // gris-200 a verde-200
  });
  const checkOpacity2 = colorAnim2;
  const checkScale2 = colorAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  useEffect(() => {
    let isMounted = true;
    let shouldAnimate = true;

    function animate() {
      if (!isMounted || !shouldAnimate) return;
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && isMounted && shouldAnimate && (currentStep === 1 || currentStep === 2)) {
          animate();
        } else if (isMounted && (currentStep === 1 || currentStep === 2)) {
          animate();
        }
      });
    }

    if (currentStep === 1 || currentStep === 2) {
      shouldAnimate = true;
      animate();
    } else {
      shouldAnimate = false;
      progressAnim.stopAnimation();
      progressAnim.setValue(1);
    }

    return () => {
      isMounted = false;
      shouldAnimate = false;
      progressAnim.stopAnimation();
    };
  }, [currentStep]);

  // Componente Stepper compacto sin card
  const Stepper = () => (
    <View style={tw`flex-row justify-between items-center px-4 pt-4 pb-2 bg-transparent`}> 
      {/* Paso 1 */}
      <View style={tw`flex-1 items-center`}>  
        <Animated.View style={[{
          backgroundColor: circleBgColor1,
          borderColor: borderColor1,
        }, tw`w-10 h-10 rounded-full items-center justify-center border-4`]}>  
          {currentStep === 1 ? (
            <Ionicons name="location-outline" size={20} color="#fff" />
          ) : (
            <Animated.View style={{ opacity: checkOpacity1, transform: [{ scale: checkScale1 }] }}>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
            </Animated.View>
          )}
        </Animated.View>
      </View>
      {/* Línea animada tipo "barrido" entre paso 1 y 2 */}
      <Animated.View
        style={[
          tw`h-1 flex-1 mx-1 rounded-full overflow-hidden`,
          { backgroundColor: currentStep > 1 ? '#A7F3D0' : '#E5E7EB' },
        ]}
        onLayout={e => setLineWidth(e.nativeEvent.layout.width)}
      >
        {currentStep === 1 && lineWidth > 0 && (
          <>
            {/* Barra azul con sombra */}
            <Animated.View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: lineWidth * 0.6,
                backgroundColor: '#3B82F6',
                opacity: 0.7,
                borderRadius: 999,
                shadowColor: '#3B82F6',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.7,
                shadowRadius: 8,
                elevation: 8,
                transform: [
                  {
                    translateX: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-lineWidth * 0.6, lineWidth],
                    }),
                  },
                ],
              }}
            />
            {/* Highlight blanco */}
            <Animated.View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: lineWidth * 0.2,
                backgroundColor: '#fff',
                opacity: 0.25,
                borderRadius: 999,
                transform: [
                  {
                    translateX: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-lineWidth * 0.2, lineWidth],
                    }),
                  },
                ],
              }}
            />
          </>
        )}
        {currentStep > 1 && lineWidth > 0 && (
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: lineWidth,
              backgroundColor: '#10B981',
              borderRadius: 999,
            }}
          />
        )}
      </Animated.View>
      {/* Paso 2 */}
      <View style={tw`flex-1 items-center`}>  
        <Animated.View style={[{
          backgroundColor: currentStep === 2 ? circleBgColor2 : (currentStep > 2 ? '#10B981' : '#E5E7EB'),
          borderColor: currentStep === 2 ? borderColor2 : (currentStep > 2 ? '#6EE7B7' : '#F3F4F6'),
        }, tw`w-10 h-10 rounded-full items-center justify-center border-4`]}>  
          {currentStep === 2 ? (
            <Feather name="archive" size={18} color="#fff" />
          ) : currentStep > 2 ? (
            <Animated.View style={{ opacity: checkOpacity2, transform: [{ scale: checkScale2 }] }}>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
            </Animated.View>
          ) : (
            <Feather name="archive" size={18} color="#6B7280" />
          )}
        </Animated.View>
      </View>
      {/* Línea animada tipo "barrido" entre paso 2 y 3 */}
      <Animated.View
        style={[
          tw`h-1 flex-1 mx-1 rounded-full overflow-hidden`,
          { backgroundColor: currentStep > 2 ? '#A7F3D0' : '#E5E7EB' },
        ]}
        onLayout={e => setLineWidth(e.nativeEvent.layout.width)}
      >
        {currentStep === 2 && lineWidth > 0 && (
          <>
            {/* Barra azul con sombra */}
            <Animated.View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: lineWidth * 0.6,
                backgroundColor: '#3B82F6',
                opacity: 0.7,
                borderRadius: 999,
                shadowColor: '#3B82F6',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.7,
                shadowRadius: 8,
                elevation: 8,
                transform: [
                  {
                    translateX: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-lineWidth * 0.6, lineWidth],
                    }),
                  },
                ],
              }}
            />
            {/* Highlight blanco */}
            <Animated.View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: lineWidth * 0.2,
                backgroundColor: '#fff',
                opacity: 0.25,
                borderRadius: 999,
                transform: [
                  {
                    translateX: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-lineWidth * 0.2, lineWidth],
                    }),
                  },
                ],
              }}
            />
          </>
        )}
        {currentStep > 2 && lineWidth > 0 && (
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: lineWidth,
              backgroundColor: '#10B981',
              borderRadius: 999,
            }}
          />
        )}
      </Animated.View>
      {/* Paso 3 */}
      <View style={tw`flex-1 items-center`}>  
        <View style={tw`${currentStep === 3 ? 'bg-blue-600' : currentStep > 3 ? 'bg-green-500' : 'bg-gray-200'} w-10 h-10 rounded-full items-center justify-center border-4 ${currentStep === 3 ? 'border-blue-200' : currentStep > 3 ? 'border-green-200' : 'border-gray-100'}`}>  
          <Feather name="check-circle" size={18} color={currentStep === 3 ? '#fff' : '#6B7280'} />
        </View>
      </View>
    </View>
  );

  // Configurar el manejador del botón de retroceso
  useEffect(() => {
    const backAction = () => {
      const hasChanges = origenLabel || destinoLabel || 
        form.particiones.some(p => 
          p.fecha || p.horaRecogida || p.horaEntrega || 
          p.tipoTransporteLabel || p.instruccionesEntrega || 
          p.instruccionesRecogida ||
          p.cargas.some(c => c.tipo || c.variedad || c.peso || c.cantidad)
        );

      if (hasChanges) {
        Alert.alert(
          '¿Salir sin guardar?',
          'Tienes cambios sin guardar. ¿Seguro que deseas salir?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Sí, salir', onPress: () => {
              resetForm();
              router.replace('../home');
            }}
          ]
        );
        return true;
      } else {
        resetForm();
        router.replace('../home');
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [form, origenLabel, destinoLabel]);

  // Fetch ubicaciones
  useEffect(() => {
    api.getUbicaciones()
      .then(data => {
        console.log('📍 Ubicaciones recibidas:', data);
        console.log('📍 Cantidad de ubicaciones:', data.length);
        setUbicaciones(data);
        if (data.length === 0) {
          console.warn('⚠️ No hay ubicaciones guardadas');
        }
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('❌ Error al cargar ubicaciones:', msg);
        Alert.alert('Error', msg);
      });
  }, []);

  // Handlers optimizados con useCallback
  const limpiarError = useCallback((campo: string) => {
    setErrores(prev => {
      const nuevos = { ...prev };
      delete nuevos[campo];
      return nuevos;
    });
  }, []);

  const marcarError = useCallback((campo: string, mensaje: string) => {
    setErrores(prev => ({ ...prev, [campo]: mensaje }));
    setTimeout(() => {
      setErrores(prev => {
        const nuevos = { ...prev };
        delete nuevos[campo];
        return nuevos;
      });
    }, 3000);
  }, []);

  const updateParticion = useCallback((index: number, field: keyof Particion, value: any) => {
    setForm(f => {
      const particiones = [...f.particiones];
      particiones[index] = { ...particiones[index], [field]: value };
      return { ...f, particiones };
    });
    limpiarError(`particion_${index}_${field}`);
  }, [limpiarError]);

  const updateCarga = useCallback((particionIndex: number, cargaIndex: number, field: keyof Carga, value: any) => {
    setForm(f => {
      const particiones = [...f.particiones];
      const cargas = [...particiones[particionIndex].cargas];
      cargas[cargaIndex] = { ...cargas[cargaIndex], [field]: value };
      particiones[particionIndex] = { ...particiones[particionIndex], cargas };
      return { ...f, particiones };
    });
    limpiarError(`particion_${particionIndex}_carga_${cargaIndex}_${field}`);
  }, [limpiarError]);
  
  const agregarCarga = useCallback((particionIndex: number) => {
    setForm(f => {
      const particiones = [...f.particiones];
      particiones[particionIndex].cargas.push({ tipo: '', variedad: '', empaquetado: '', cantidad: 0, peso: 0 });
      return { ...f, particiones };
    });
  }, []);

  const eliminarCarga = useCallback((particionIndex: number, cargaIndex: number) => {
    setForm(f => {
      const particiones = [...f.particiones];
      if (particiones[particionIndex].cargas.length > 1) {
        particiones[particionIndex].cargas.splice(cargaIndex, 1);
      }
      return { ...f, particiones };
    });
  }, []);

  const agregarParticion = useCallback(() => {
    setForm(f => ({
      ...f,
      particiones: [...f.particiones, {
        fecha: '',
        horaRecogida: '',
        horaEntrega: '',
        instruccionesRecogida: '',
        instruccionesEntrega: '',
        cargas: [{ tipo: '', variedad: '', empaquetado: '', cantidad: 0, peso: 0 }],
        tipoTransporteLabel: '',
        tipoTransporteId: null
      }]
    }));
  }, []);

  const eliminarParticion = useCallback((index: number) => {
    if (form.particiones.length > 1) {
      setForm(f => {
        const particiones = [...f.particiones];
        particiones.splice(index, 1);
        return { ...f, particiones };
      });
    }
  }, [form.particiones.length]);

  const resetForm = () => {
    setForm({
      origen: { latitude: 0, longitude: 0 },
      destino: { latitude: 0, longitude: 0 },
      particiones: [{
        fecha: '',
        horaRecogida: '',
        horaEntrega: '',
        instruccionesRecogida: '',
        instruccionesEntrega: '',
        cargas: [{ tipo: '', variedad: '', empaquetado: '', cantidad: 0, peso: 0 }],
        tipoTransporteLabel: '',
        tipoTransporteId: null
      }],
      segmentos: [],
      rutaGeoJSON: null
    });
    setOrigenLabel('');
    setDestinoLabel('');
    setErrores({});
    setShowConfirmacion(false);
  };

  // Ref para el ScrollView principal
  const scrollViewRef = useRef<any>(null);
  // Mapa de refs para los campos
  const camposRefs = useRef<{[key:string]: any}>({});
  // Refs para particiones
  const particionRefs = useRef<{[key:number]: any}>({});

  // Modifico validarFormulario para devolver la clave del primer error
  const validarFormulario = () => {
    let esValido = true;
    const nuevosErrores: {[key: string]: string} = {};
    let primerError = '';

    // Validar origen y destino
    if (!origenLabel || !destinoLabel) {
      nuevosErrores.ubicacion = 'Selecciona origen y destino';
      esValido = false;
    }

    // Validar cada partición
    form.particiones.forEach((particion, pIndex) => {
      // Validar fecha
      const fechaHoy = new Date().toISOString().split('T')[0];
      if (!particion.fecha) {
        nuevosErrores[`particion_${pIndex}_fecha`] = 'Selecciona fecha de recogida';
        esValido = false;
      } else if (particion.fecha < fechaHoy) {
        nuevosErrores[`particion_${pIndex}_fecha`] = 'La fecha no puede ser anterior a hoy';
        esValido = false;
      }
      if (!particion.horaRecogida) {
        nuevosErrores[`particion_${pIndex}_horaRecogida`] = 'Selecciona hora de recogida';
        esValido = false;
      }
      if (!particion.horaEntrega) {
        nuevosErrores[`particion_${pIndex}_horaEntrega`] = 'Selecciona hora de entrega';
        esValido = false;
      }
      if (!particion.tipoTransporteId) {
        nuevosErrores[`particion_${pIndex}_transporte`] = 'Selecciona tipo de transporte';
        esValido = false;
      }
      particion.cargas.forEach((carga, cIndex) => {
        if (!carga.tipo) {
          nuevosErrores[`particion_${pIndex}_carga_${cIndex}_tipo`] = 'Selecciona tipo de carga';
          esValido = false;
        }
        if (!carga.variedad) {
          nuevosErrores[`particion_${pIndex}_carga_${cIndex}_variedad`] = 'Selecciona variedad';
          esValido = false;
        }
        if (carga.cantidad <= 0) {
          nuevosErrores[`particion_${pIndex}_carga_${cIndex}_cantidad`] = 'Cantidad debe ser mayor a 0';
          esValido = false;
        }
        if (!carga.empaquetado) {
          nuevosErrores[`particion_${pIndex}_carga_${cIndex}_empaquetado`] = 'Selecciona empaquetado';
          esValido = false;
        }
        if (carga.peso <= 0) {
          nuevosErrores[`particion_${pIndex}_carga_${cIndex}_peso`] = 'Peso debe ser mayor a 0';
          esValido = false;
        }
      });
    });

    // Buscar el primer error por orden de partición
    let primerErrorOrdenado = '';
    for (let pIndex = 0; pIndex < form.particiones.length; pIndex++) {
      const keys = Object.keys(nuevosErrores).filter(k => k.startsWith(`particion_${pIndex}_`));
      if (keys.length > 0) {
        primerErrorOrdenado = keys[0];
        break;
      }
    }
    // Si no hay errores en particiones, pero sí en ubicacion
    if (!primerErrorOrdenado && nuevosErrores.ubicacion) {
      primerErrorOrdenado = 'origen';
    }

    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      setTimeout(() => {
        setErrores(prev => {
          const nuevos = { ...prev };
          for (const k of Object.keys(nuevosErrores)) {
            delete nuevos[k];
          }
          return nuevos;
        });
      }, 3000);
    }
    return { esValido, primerError: primerErrorOrdenado };
  };

  // FUNCIÓN CORREGIDA - Ahora obtiene la ruta antes de crear el envío
  const crearEnvio = async () => {
    const validacion = validarFormulario();
    if (!validacion.esValido) {
      Alert.alert('Error', 'Por favor corrige los errores marcados');
      return;
    }

    if (isSubmitting || isNavigating) {
      return; // Prevenir múltiples envíos
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      // Si ya tenemos segmentos guardados, no necesitamos obtener la ruta de nuevo
      let segmentos = form.segmentos;
      let rutaInfo: { distance?: number; duration?: number } = {};

      if (!segmentos || segmentos.length === 0) {
        // Solo obtener ruta si no tenemos segmentos guardados
        const origenCoords = `${form.origen.longitude},${form.origen.latitude}`;
        const destinoCoords = `${form.destino.longitude},${form.destino.latitude}`;
        
        const ruta = await api.getRuta(origenCoords, destinoCoords);
        
        if (!ruta.coordinates || ruta.coordinates.length === 0) {
          Alert.alert(
            'Error de Ruta', 
            'No se pudo calcular la ruta entre el origen y destino seleccionados. Verifica que las ubicaciones sean válidas.'
          );
          return;
        }

        segmentos = ruta.coordinates;
        rutaInfo = {
          distance: ruta.distance,
          duration: ruta.duration
        };
      }

      // Construir todas las particiones
      const particiones = form.particiones.map(particion => ({
        id_tipo_transporte: particion.tipoTransporteId,
        recogidaEntrega: {
          fecha_recogida: particion.fecha,
          hora_recogida: particion.horaRecogida,
          hora_entrega: particion.horaEntrega,
          instrucciones_recogida: particion.instruccionesRecogida,
          instrucciones_entrega: particion.instruccionesEntrega
        },
        cargas: particion.cargas.map(carga => ({
          tipo: carga.tipo,
          variedad: carga.variedad,
          empaquetado: carga.empaquetado, // El backend espera "empaquetado" en CatalogoCarga
          cantidad: carga.cantidad,
          peso: carga.peso
        }))
      }));

      // Payload único
      const payload = {
        loc: {
          nombreOrigen: origenLabel,
          coordenadasOrigen: [form.origen.latitude, form.origen.longitude],
          nombreDestino: destinoLabel,
          coordenadasDestino: [form.destino.latitude, form.destino.longitude],
          segmentos: segmentos,
          rutaGeoJSON: form.rutaGeoJSON || null,
          ...rutaInfo
        },
        particiones
      };

      console.log('📤 Enviando payload:', JSON.stringify(payload, null, 2));
      await api.crearEnvio(payload);
      setIsNavigating(true);
      setShowConfirmacion(true);

    } catch (e) {
      let mensaje = 'Error desconocido al crear el envío';
      if (e instanceof Error) {
        mensaje = e.message;
      }
      console.error('❌ Error al crear envío:', mensaje);
      Alert.alert('Error', mensaje);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  // Vista de confirmación
  const VistaConfirmacion = () => (
    <View style={tw`flex-1 justify-center items-center p-6 bg-gray-50`}>
      <View style={tw`bg-white rounded-lg p-8 items-center shadow-lg w-full max-w-sm`}>
        <Ionicons name="checkmark-circle" size={80} color="#10B981" />
        <Text style={tw`text-gray-800 text-2xl font-bold mt-4 mb-2 text-center`}>
          ¡Envío Creado!
        </Text>
        <Text style={tw`text-gray-600 text-lg mb-6 text-center`}>
          Tu envío ha sido registrado exitosamente
        </Text>
        
        <View style={tw`mb-6 w-full`}>
          <Text style={tw`text-gray-700 text-center mb-1`}>
            Recogida en {origenLabel}
          </Text>
          <Text style={tw`text-gray-700 text-center`}>
            Entrega en {destinoLabel}
          </Text>
        </View>
        
        <View style={tw`flex-row w-full`}>
          <Pressable 
            style={tw`bg-gray-100 rounded-lg px-4 py-3 mr-2 flex-1`}
            onPress={() => {
              resetForm();
              router.replace('../home');
            }}
          >
            <Text style={tw`text-gray-700 font-semibold text-center`}>Volver al Inicio</Text>
          </Pressable>
          
          <Pressable 
            style={tw`bg-blue-600 rounded-lg px-4 py-3 ml-2 flex-1`}
            onPress={() => {
              resetForm();
            }}
          >
            <Text style={tw`text-white font-semibold text-center`}>Nuevo Envío</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  // Handler para el botón Continuar
  const handleContinuar = () => {
    if (!origenLabel || !destinoLabel) {
      setErrorMessage('Selecciona origen y destino antes de continuar');
      setShowErrorModal(true);
      return;
    }
    setStep(2);
  };

  // Estado para acordeón de instrucciones especiales por partición
  const [instruccionesAbiertas, setInstruccionesAbiertas] = useState<{[key: number]: boolean}>({});
  const instruccionesAnim = useRef<{[key: number]: Animated.Value}>({}).current;
  const [instruccionesHeights, setInstruccionesHeights] = useState<{[key: number]: number}>({});

  const toggleInstrucciones = (idx: number) => {
    const open = !instruccionesAbiertas[idx];
    setInstruccionesAbiertas(prev => ({ ...prev, [idx]: open }));
    if (!instruccionesAnim[idx]) instruccionesAnim[idx] = new Animated.Value(0);
    Animated.timing(instruccionesAnim[idx], {
      toValue: open ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // Estado para animación de salida de particiones
  const [particionesVisibles, setParticionesVisibles] = useState<{[key:number]: boolean}>({});

  const handleEliminarParticionAnimada = (index: number) => {
    setParticionesVisibles(v => ({ ...v, [index]: false }));
  };

  const handleParticionOculta = (index: number) => {
    eliminarParticion(index);
    setParticionesVisibles(v => {
      const nuevo = { ...v };
      delete nuevo[index];
      return nuevo;
    });
  };

  // Estado para el índice del carrusel de transporte
  const [transporteIndex, setTransporteIndex] = useState(0);
  const windowWidth = Dimensions.get('window').width;
  const cardWidth = Math.round(windowWidth * 0.9);

  // Estado para tipos de transporte desde la API
  const [tiposTransporte, setTiposTransporte] = useState<{id:number, nombre:string, descripcion:string}[]>([]);

  useEffect(() => {
    api.getTiposTransporte()
      .then(data => setTiposTransporte(data))
      .catch(() => setTiposTransporte([]));
  }, []);

  // Justo después de los otros useState/useRef
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showConfirmacion) {
      checkAnim.setValue(0);
      Animated.spring(checkAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }).start();
    }
  }, [showConfirmacion]);

  // Elimina el return condicional de showConfirmacion
  // ... existing code ...
  // Reemplaza la VistaConfirmacion por un Modal
  {/* Modal de éxito animado */}
  <Modal
    visible={showConfirmacion}
    transparent
    animationType="fade"
    onRequestClose={() => setShowConfirmacion(false)}
  >
    <View style={tw`flex-1 bg-black bg-opacity-40 justify-center items-center`}>
      <View style={tw`bg-white rounded-2xl p-8 items-center shadow-lg w-4/5`}>
        <Animated.View style={{ transform: [{ scale: checkAnim }] }}>
          <Ionicons name="checkmark-circle" size={80} color="#10B981" />
        </Animated.View>
        <Text style={tw`text-gray-800 text-2xl font-bold mt-4 mb-2 text-center`}>
          ¡Envío Creado!
        </Text>
        <Text style={tw`text-gray-600 text-lg mb-6 text-center`}>
          Tu envío ha sido registrado exitosamente
        </Text>
        <View style={tw`mb-6 w-full`}>
          <Text style={tw`text-gray-700 text-center mb-1`}>
            Recogida en {origenLabel}
          </Text>
          <Text style={tw`text-gray-700 text-center`}>
            Entrega en {destinoLabel}
          </Text>
        </View>
        <View style={tw`flex-row w-full`}>
          <Pressable 
            style={tw`bg-gray-100 rounded-lg px-4 py-3 mr-2 flex-1`}
            onPress={() => {
              resetForm();
              setShowConfirmacion(false);
              router.replace('/envio');
            }}
          >
            <Text style={tw`text-gray-700 font-semibold text-center`}>Volver a Envío</Text>
          </Pressable>
          <Pressable 
            style={tw`bg-blue-600 rounded-lg px-4 py-3 ml-2 flex-1`}
            onPress={() => {
              resetForm();
              setShowConfirmacion(false);
              router.replace('/crear-envio/CrearEnvio');
            }}
          >
            <Text style={tw`text-white font-semibold text-center`}>Nuevo Envío</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
  // ... existing code ...

  return (
    <View style={tw`flex-1 bg-gray-50 pt-${Platform.OS === 'ios' ? '12' : '8'}`}>  
      <Stepper />
      <View style={tw`border-b border-gray-200 bg-white w-full`} />
      <ScrollView ref={scrollViewRef} style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        <View style={tw`px-4 pb-4`}>  
          {/* Paso 1: Solo origen y destino */}
          {step === 1 && (
            <>
              {/* Origen y destino del envío */}
              <View style={[tw`bg-white rounded-lg p-4 mb-4 shadow-sm mt-4`, {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.10,
                shadowRadius: 16,
                elevation: 8,
                borderWidth: 1,
                borderColor: '#F3F4F6', // gris-100
              }]}>
                <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>
                  Origen y destino del envío
                </Text>
                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 mb-2`}>Origen</Text>
                  <Pressable 
                    ref={el => {camposRefs.current['origen'] = el}}
                    style={tw`border bg-white border-l-4 border-l-blue-500 rounded-lg p-4 flex-row items-center ${errores.ubicacion ? 'border-red-500' : ''}`}
                    onPress={() => {
                      setShowOrigenModal(true);
                      limpiarError('ubicacion');
                    }}
                  >
                    <Ionicons name="location-outline" size={20} color="#9CA3AF" />
                    <Text style={tw`${origenLabel ? 'text-gray-800' : 'text-gray-400'} flex-1 ml-3 text-base`}>
                      {origenLabel || 'Seleccionar origen'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                  </Pressable>
                </View>
                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 mb-2`}>Destino</Text>
                  <Pressable 
                    ref={el => {camposRefs.current['destino'] = el}}
                    style={tw`border bg-white border-l-4 border-l-blue-500 rounded-lg p-4 flex-row items-center`}
                    onPress={() => setShowDestinoModal(true)}
                  >
                    <Ionicons name="location-outline" size={20} color="#9CA3AF" />
                    <Text style={tw`${destinoLabel ? 'text-gray-800' : 'text-gray-400'} flex-1 ml-3 text-base`}>
                      {destinoLabel || 'Seleccionar destino'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                  </Pressable>
                </View>
                {/* Cambiar View por Pressable para navegar a ubicaciones-guardadas */}
                <Pressable
                  style={tw`bg-blue-50 p-3 rounded-lg flex-row items-center`}
                  onPress={() => router.push('/ubicaciones-guardadas')}
                >
                  <Ionicons name="add-outline" size={20} color="#3B82F6" />
                  <Text style={tw`text-blue-700 ml-2 text-sm flex-1`}>
                    Añadir punto de recogida o entrega
                  </Text>
                </Pressable>
              </View>
              {/* Espacio para el botón flotante */}
              <View style={tw`h-24`} />
            </>
          )}

          {/* Paso 2: Particiones */}
          {step === 2 && (
            <>
              {/* Particiones, recogida, carga, transporte, añadir partición */}
              {form.particiones.map((particion, pIndex) => (
                <View ref={el => { particionRefs.current[pIndex] = el; }} key={pIndex}>
                  <AnimatedCard
                    delay={100 * pIndex}
                    style={[
                      tw`bg-white rounded-2xl mb-6 overflow-hidden mt-4`,
                      {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.10,
                        shadowRadius: 16,
                        elevation: 8,
                        borderWidth: 1,
                        borderColor: '#F3F4F6', // gris-100
                      },
                    ]}
                    visible={particionesVisibles[pIndex] !== false}
                    onHide={() => handleParticionOculta(pIndex)}
                  >
                    {/* Encabezado de partición */}
                    <View style={tw`bg-blue-600 px-5 py-4 flex-row items-center justify-between`}> 
                      <View style={tw`flex-row items-center`}>
                        <Ionicons name="cube-outline" size={24} color="#fff" style={tw`mr-3`} />
                        <View>
                          <Text style={tw`text-white text-lg font-bold`}>{`Partición ${pIndex + 1}`}</Text>
                          <Text style={tw`text-blue-100 text-xs`}>Configura los detalles del envío</Text>
                        </View>
                      </View>
                      {pIndex > 0 && (
                        <Pressable
                          onPress={() => handleEliminarParticionAnimada(pIndex)}
                          style={tw`ml-2 bg-white bg-opacity-15 rounded-lg w-8 h-8 items-center justify-center`}
                          hitSlop={10}
                        >
                          <Ionicons name="close" size={20} color="#fff" />
                        </Pressable>
                      )}
                    </View>
                    {/* Contenido unificado */}
                    <View style={tw`px-5 pt-5 pb-2`}> 
                      {/* Programación del envío */}
                      <Text style={tw`text-gray-800 font-semibold mb-2`}>Programación del envío</Text>
                      {/* Select fecha de envío */}
                      <View style={tw`mb-4`}>
                        <Text style={tw`text-xs text-gray-800 mb-1`}>Fecha de envío</Text>
                        <Pressable 
                          ref={el => {camposRefs.current[`particion_${pIndex}_fecha`] = el}}
                          style={tw`border border-gray-300 border-l-4 border-l-blue-500 bg-white rounded-xl px-4 py-3 flex-row items-center ${errores[`particion_${pIndex}_fecha`] ? 'border-red-500' : ''}`}
                          onPress={() => {
                            setDatePickerIndex(pIndex);
                            setShowDatePicker(true);
                            limpiarError(`particion_${pIndex}_fecha`);
                          }}
                        >
                          <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
                          <Text style={tw`${particion.fecha ? 'text-gray-800' : 'text-gray-400'} flex-1 ml-3 text-base`}>
                            {particion.fecha || 'DD/MM/AAAA'}
                          </Text>
                          <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                        </Pressable>
                      </View>
                      {/* Hora de recogida y entrega en la misma fila */}
                      <View style={tw`flex-row mb-4`}> 
                        <View style={tw`flex-1 mr-2`}> 
                          <Text style={tw`text-xs text-gray-800 mb-1`}>Hora de recogida</Text>
                          <Pressable 
                            ref={el => {camposRefs.current[`particion_${pIndex}_horaRecogida`] = el}}
                            style={tw`border border-gray-300 border-l-4 border-l-blue-500 bg-white rounded-xl px-4 py-3 flex-row items-center ${errores[`particion_${pIndex}_horaRecogida`] ? 'border-red-500' : ''}`}
                            onPress={() => {
                              setTimePickerData({ particionIndex: pIndex, tipo: 'recogida' });
                              setShowTimePicker(true);
                              limpiarError(`particion_${pIndex}_horaRecogida`);
                            }}
                          >
                            <Ionicons name="time-outline" size={20} color="#9CA3AF" />
                            <Text style={tw`${particion.horaRecogida ? 'text-gray-800' : 'text-gray-400'} flex-1 ml-3 text-base`}>
                              {particion.horaRecogida || 'Hora'}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                          </Pressable>
                        </View>
                        <View style={tw`flex-1 ml-2`}> 
                          <Text style={tw`text-xs text-gray-800 mb-1`}>Hora de entrega</Text>
                          <Pressable 
                            ref={el => {camposRefs.current[`particion_${pIndex}_horaEntrega`] = el}}
                            style={tw`border border-gray-300 border-l-4 border-l-blue-500 bg-white rounded-xl px-4 py-3 flex-row items-center ${errores[`particion_${pIndex}_horaEntrega`] ? 'border-red-500' : ''}`}
                            onPress={() => {
                              setTimePickerData({ particionIndex: pIndex, tipo: 'entrega' });
                              setShowTimePicker(true);
                              limpiarError(`particion_${pIndex}_horaEntrega`);
                            }}
                          >
                            <Ionicons name="time-outline" size={20} color="#9CA3AF" />
                            <Text style={tw`${particion.horaEntrega ? 'text-gray-800' : 'text-gray-400'} flex-1 ml-3 text-base`}>
                              {particion.horaEntrega || 'Hora'}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                          </Pressable>
                        </View>
                      </View>
                      {/* Acordeón de instrucciones especiales */}
                      <AcordeonInstrucciones
                        valueRecogida={particion.instruccionesRecogida}
                        valueEntrega={particion.instruccionesEntrega}
                        onChangeRecogida={text => updateParticion(pIndex, 'instruccionesRecogida', text)}
                        onChangeEntrega={text => updateParticion(pIndex, 'instruccionesEntrega', text)}
                      />
                      {/* Detalles de carga */}
                      {particion.cargas.map((carga, cIndex) => (
                        <View key={cIndex} style={tw`${cIndex > 0 ? 'mt-4 pt-4 border-t border-gray-200' : ''}`}>
                          {cIndex === 0 && (
                            <Text style={tw`text-gray-800 font-semibold mb-2 mt-2`}>Detalles de carga</Text>
                          )}
                          {/* Botón eliminar producto (solo visible en productos adicionales) */}
                          {cIndex > 0 && (
                            <Pressable
                              style={tw`absolute right-1 top-1 z-10 bg-gray-300 w-6 h-6 rounded-full items-center justify-center`}
                              onPress={() => eliminarCarga(pIndex, cIndex)}
                            >
                              <Ionicons name="close" size={16} color="#fff" />
                            </Pressable>
                          )}
                          {/* Select tipo de carga */}
                          <View style={tw`mb-4`}>
                            <Text style={tw`text-xs text-gray-800 mb-1`}>Tipo de carga</Text>
                            <Pressable 
                              ref={el => {camposRefs.current[`particion_${pIndex}_carga_${cIndex}_tipo`] = el}}
                              style={tw`border border-gray-300 border-l-4 border-l-blue-500 bg-white rounded-xl px-4 py-3 flex-row items-center ${errores[`particion_${pIndex}_carga_${cIndex}_tipo`] ? 'border-red-500' : ''}`}
                              onPress={() => {
                                setCargaModalData({ particionIndex: pIndex, cargaIndex: cIndex, tipo: 'tipo' });
                                setShowCargaModal(true);
                                limpiarError(`particion_${pIndex}_carga_${cIndex}_tipo`);
                              }}
                            >
                              <Ionicons name="layers-outline" size={20} color="#9CA3AF" />
                              <Text style={tw`${carga.tipo ? 'text-gray-800' : 'text-gray-400'} flex-1 ml-3 text-base`}>
                                {carga.tipo || 'Seleccionar tipo de carga'}
                              </Text>
                              <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                            </Pressable>
                          </View>
                          {/* Select variedad */}
                          <View style={tw`mb-4`}>
                            <Text style={tw`text-xs text-gray-800 mb-1`}>Variedad</Text>
                            <Pressable 
                              ref={el => {camposRefs.current[`particion_${pIndex}_carga_${cIndex}_variedad`] = el}}
                              style={tw`border border-gray-300 border-l-4 border-l-blue-500 bg-white rounded-xl px-4 py-3 flex-row items-center ${errores[`particion_${pIndex}_carga_${cIndex}_variedad`] ? 'border-red-500' : ''}`}
                              onPress={() => {
                                setCargaModalData({ particionIndex: pIndex, cargaIndex: cIndex, tipo: 'variedad' });
                                setShowCargaModal(true);
                                limpiarError(`particion_${pIndex}_carga_${cIndex}_variedad`);
                              }}
                            >
                              <Ionicons name="leaf-outline" size={20} color="#9CA3AF" />
                              <Text style={tw`${carga.variedad ? 'text-gray-800' : 'text-gray-400'} flex-1 ml-3 text-base`}>
                                {carga.variedad || 'Seleccionar variedad'}
                              </Text>
                              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                            </Pressable>
                          </View>
                          {/* Inputs cantidad y peso en una fila */}
                          <View style={tw`flex-row mb-4`}>
                            <View style={tw`flex-1 mr-2`}> 
                              <Text style={tw`text-xs text-gray-800 mb-1`}>Cantidad</Text>
                              <View style={tw`border border-gray-300 bg-white rounded-xl flex-row items-center ${errores[`particion_${pIndex}_carga_${cIndex}_cantidad`] ? 'border-red-500' : ''}`}> 
                                <Pressable 
                                  ref={el => {camposRefs.current[`particion_${pIndex}_carga_${cIndex}_cantidad`] = el}}
                                  onPress={() => updateCarga(pIndex, cIndex, 'cantidad', Math.max(0, carga.cantidad - 1))} 
                                  style={tw`p-3 bg-gray-100 rounded-lg mx-1`}
                                >
                                  <Text style={tw`text-gray-600 text-lg font-bold`}>−</Text>
                                </Pressable>
                                <View style={tw`flex-1 items-center`}>
                                  <Text style={tw`text-gray-800 text-lg font-semibold`}>{carga.cantidad}</Text>
                                </View>
                                <Pressable 
                                  ref={el => {camposRefs.current[`particion_${pIndex}_carga_${cIndex}_cantidad`] = el}}
                                  onPress={() => updateCarga(pIndex, cIndex, 'cantidad', carga.cantidad + 1)} 
                                  style={tw`p-3 bg-gray-100 rounded-lg mx-1`}
                                >
                                  <Text style={tw`text-gray-600 text-lg font-bold`}>+</Text>
                                </Pressable>
                              </View>
                            </View>
                            <View style={tw`flex-1 mx-1`}> 
                              <Text style={tw`text-xs text-gray-800 mb-1`}>Peso (kg)</Text>
                              <View style={tw`border border-gray-300 bg-white rounded-xl flex-row items-center ${errores[`particion_${pIndex}_carga_${cIndex}_peso`] ? 'border-red-500' : ''}`}> 
                                <Pressable 
                                  ref={el => {camposRefs.current[`particion_${pIndex}_carga_${cIndex}_peso`] = el}}
                                  onPress={() => updateCarga(pIndex, cIndex, 'peso', Math.max(0, carga.peso - 1))} 
                                  style={tw`p-3 bg-gray-100 rounded-lg mx-1`}
                                >
                                  <Text style={tw`text-gray-600 text-lg font-bold`}>−</Text>
                                </Pressable>
                                <View style={tw`flex-1 items-center`}>
                                  <Text style={tw`text-gray-800 text-lg font-semibold`}>{carga.peso} kg</Text>
                                </View>
                                <Pressable 
                                  ref={el => {camposRefs.current[`particion_${pIndex}_carga_${cIndex}_peso`] = el}}
                                  onPress={() => updateCarga(pIndex, cIndex, 'peso', carga.peso + 1)} 
                                  style={tw`p-3 bg-gray-100 rounded-lg mx-1`}
                                >
                                  <Text style={tw`text-gray-600 text-lg font-bold`}>+</Text>
                                </Pressable>
                              </View>
                            </View>
                          </View>
                          {/* Select tipo de empaque */}
                          <View style={tw`mb-4`}>
                            <Text style={tw`text-xs text-gray-800 mb-1`}>Tipo de empaque</Text>
                            <Pressable 
                              ref={el => {camposRefs.current[`particion_${pIndex}_carga_${cIndex}_empaquetado`] = el}}
                              style={tw`border border-gray-300 border-l-4 border-l-blue-500 bg-white rounded-xl px-4 py-3 flex-row items-center ${errores[`particion_${pIndex}_carga_${cIndex}_empaquetado`] ? 'border-red-500' : ''}`}
                              onPress={() => {
                                setCargaModalData({ particionIndex: pIndex, cargaIndex: cIndex, tipo: 'empaquetado' });
                                setShowCargaModal(true);
                                limpiarError(`particion_${pIndex}_carga_${cIndex}_empaquetado`);
                              }}
                            >
                              <Ionicons name="archive-outline" size={20} color="#9CA3AF" />
                              <Text style={tw`${carga.empaquetado ? 'text-gray-800' : 'text-gray-400'} flex-1 ml-3 text-base`}>
                                {carga.empaquetado || 'Seleccionar empaquetado'}
                              </Text>
                              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                            </Pressable>
                          </View>
                        </View>
                      ))}
                      {/* Botón agregar producto */}
                      <Pressable
                        style={tw`flex-row items-center justify-center border border-dashed border-gray-300 rounded-xl py-3 mt-2 mb-2`}
                        onPress={() => agregarCarga(pIndex)}
                      >
                        <Ionicons name="add-circle-outline" size={18} color="#3B82F6" />
                        <Text style={tw`ml-2 text-blue-700 font-medium`}>Agregar producto</Text>
                      </Pressable>
                      {/* Tipo de transporte requerido */}
                      <Text style={tw`text-gray-800 font-semibold mb-2 mt-2`}>Tipo de transporte requerido</Text>
                      {/* Carrusel de transporte */}
                      <View style={tw`items-center`}>
                        <ScrollView
                          horizontal
                          pagingEnabled
                          showsHorizontalScrollIndicator={false}
                          onScroll={e => {
                            const idx = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
                            setTransporteIndex(idx);
                          }}
                          scrollEventThrottle={16}
                          style={{ width: cardWidth }}
                          contentContainerStyle={{ alignItems: 'center' }}
                        >
                          {tiposTransporte.map((transporte, tIdx) => {
                            const seleccionado = particion.tipoTransporteId === transporte.id;
                            const errorTransporte = errores[`particion_${pIndex}_transporte`];
                            // Asignar imagen según id
                            let imagen = null;
                            if (transporte.id === 1) imagen = require('../../assets/camion_ligero.png');
                            if (transporte.id === 2) imagen = require('../../assets/camion_medio.png');
                            if (transporte.id === 3) imagen = require('../../assets/camion_pesado.png');
                            return (
                              <Pressable
                                key={transporte.id}
                                ref={el => {camposRefs.current[`particion_${pIndex}_transporte`] = el}}
                                style={[
                                  tw`rounded-2xl bg-white items-center justify-center`,
                                  {
                                    borderWidth: 2,
                                    borderColor: seleccionado ? '#2563EB' : errorTransporte ? '#EF4444' : '#E5E7EB',
                                    paddingVertical: 18,
                                    paddingHorizontal: 22,
                                    width: cardWidth,
                                    marginHorizontal: 0,
                                    shadowColor: seleccionado ? '#2563EB' : '#000',
                                    shadowOpacity: seleccionado ? 0.10 : 0.05,
                                    shadowRadius: 8,
                                    elevation: seleccionado ? 6 : 2,
                                  }
                                ]}
                                onPress={() => updateParticion(pIndex, 'tipoTransporteId', transporte.id)}
                              >
                                <View style={tw`mb-2`}>
                                  <Image source={imagen} style={{ width: 140, height: 100, resizeMode: 'contain' }} />
                                </View>
                                <Text style={tw`${seleccionado ? 'text-blue-700 font-bold' : 'text-gray-700 font-medium'} text-base`}>{transporte.nombre}</Text>
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                        {/* Puntos indicadores */}
                        <View style={tw`flex-row justify-center mt-3`}>
                          {tiposTransporte.map((_, idx) => (
                            <Animated.View
                              key={idx}
                              style={[
                                tw`mx-1 rounded-full`,
                                {
                                  width: transporteIndex === idx ? 16 : 8,
                                  height: 8,
                                  backgroundColor: transporteIndex === idx ? '#2563EB' : '#D1D5DB',
                                  transition: 'width 0.2s',
                                },
                              ]}
                            />
                          ))}
                        </View>
                        {/* Descripción del transporte seleccionado */}
                        <View style={tw`mt-2 px-2`}>
                          <Text style={tw`text-blue-700 text-center text-sm`}>
                            {tiposTransporte.find(t => t.id === particion.tipoTransporteId)?.descripcion || 'Selecciona un tipo de transporte para ver su descripción.'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </AnimatedCard>
                </View>
              ))}
              {/* Botón agregar otra partición */}
              <Pressable 
                style={tw`flex-row items-center justify-center border border-dashed border-gray-300 rounded-xl py-4 mt-2 mb-6 bg-gray-50`} 
                onPress={agregarParticion}
              > 
                <Ionicons name="add-circle-outline" size={20} color="#3B82F6" />
                <Text style={tw`ml-2 text-blue-700 font-medium`}>Agregar otra partición</Text>
              </Pressable>
              {/* Botones de navegación */}
              <View style={tw`flex-row mt-2 mb-6`}> 
                <Pressable
                  style={tw`flex-1 bg-gray-200 rounded-lg p-4 mr-2 items-center`}
                  onPress={() => setStep(1)}
                >
                  <Text style={tw`text-gray-700 font-semibold text-lg`}>Anterior</Text>
                </Pressable>
                <Pressable
                  style={tw`flex-1 bg-blue-600 rounded-lg p-4 ml-2 items-center`}
                  onPress={() => {
                    const { esValido, primerError } = validarFormulario();
                    if (!esValido && primerError) {
                      // Buscar la partición a la que pertenece el error
                      let particionIndex = 0;
                      const match = primerError.match(/particion_(\d+)/);
                      if (match) {
                        particionIndex = parseInt(match[1], 10);
                      }
                      // Scroll automático al inicio de la partición
                      const el = particionRefs.current[particionIndex];
                      if (el && el.measure) {
                        el.measure((fx: any, fy: any, width: any, height: any, px: any, py: any) => {
                          if (scrollViewRef.current && scrollViewRef.current.scrollTo) {
                            scrollViewRef.current.scrollTo({ y: py - 80, animated: true });
                          }
                        });
                      }
                      return;
                    }
                    setStep(3);
                  }}
                >
                  <Text style={tw`text-white font-semibold text-lg`}>Siguiente</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* Paso 3: Resumen */}
          {step === 3 && (
            <>
              <View style={tw`bg-white rounded-2xl shadow-lg p-6 mt-4 mb-6`}> 
                <Text style={tw`text-blue-700 text-lg font-bold mb-2`}>Resumen del Envío</Text>
                <Text style={tw`text-gray-700 mb-1`}><Text style={tw`font-semibold`}>Origen:</Text> {origenLabel}</Text>
                <Text style={tw`text-gray-700 mb-3`}><Text style={tw`font-semibold`}>Destino:</Text> {destinoLabel}</Text>
                {form.particiones.map((part, idx) => (
                  <View key={idx} style={tw`mb-4 border-t border-gray-200 pt-3`}> 
                    <Text style={tw`text-blue-600 font-semibold mb-1`}>{`Partición ${idx + 1}`}</Text>
                    <Text style={tw`text-gray-700`}><Text style={tw`font-semibold`}>Fecha:</Text> {part.fecha}</Text>
                    <Text style={tw`text-gray-700`}><Text style={tw`font-semibold`}>Hora recogida:</Text> {part.horaRecogida}</Text>
                    <Text style={tw`text-gray-700`}><Text style={tw`font-semibold`}>Hora entrega:</Text> {part.horaEntrega}</Text>
                    <Text style={tw`text-gray-700`}><Text style={tw`font-semibold`}>Tipo transporte:</Text> {tiposTransporte.find(t=>t.id===part.tipoTransporteId)?.nombre || '-'}</Text>
                    <Text style={tw`text-gray-700`}><Text style={tw`font-semibold`}>Instrucciones recogida:</Text> {part.instruccionesRecogida || '-'}</Text>
                    <Text style={tw`text-gray-700 mb-1`}><Text style={tw`font-semibold`}>Instrucciones entrega:</Text> {part.instruccionesEntrega || '-'}</Text>
                    {part.cargas.map((c, cidx) => (
                      <View key={cidx} style={tw`ml-2 mb-1`}> 
                        <Text style={tw`text-gray-600`}>• <Text style={tw`font-semibold`}>Tipo:</Text> {c.tipo} <Text style={tw`font-semibold`}>Variedad:</Text> {c.variedad} <Text style={tw`font-semibold`}>Empaque:</Text> {c.empaquetado} <Text style={tw`font-semibold`}>Cantidad:</Text> {c.cantidad} <Text style={tw`font-semibold`}>Peso:</Text> {c.peso} kg</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
              {/* Botones de navegación y confirmar */}
              <View style={tw`h-24`} />
            </>
          )}
        </View>
      </ScrollView>

      {/* Botones flotantes para resumen */}
      {step === 3 && (
        <View style={tw`absolute bottom-16 left-0 right-0 px-4`}>
          <View style={tw`flex-row`}> 
            <Pressable
              style={tw`flex-1 bg-gray-200 rounded-lg p-4 mr-2 items-center`}
              onPress={() => setStep(2)}
            >
              <Text style={tw`text-gray-700 font-semibold text-lg`}>Anterior</Text>
            </Pressable>
            <Pressable
              style={tw`flex-1 bg-blue-600 rounded-lg p-4 ml-2 items-center ${(loading || isSubmitting || isNavigating) ? 'opacity-50' : ''}`}
              onPress={crearEnvio}
              disabled={loading || isSubmitting || isNavigating}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={tw`text-white font-semibold text-lg`}>Confirmar Envío</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Modales */}
      
      {/* Modal Origen */}
      <Modal visible={showOrigenModal} transparent animationType="fade">
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center`}>
          <View style={tw`bg-white rounded-lg w-4/5 p-4 max-h-96`}>
            <Text style={tw`text-lg font-bold mb-4 text-center`}>Seleccionar Origen</Text>
            <ScrollView style={tw`max-h-60`}>
              {ubicaciones.map((u, index) => {
                console.log(`Ubicación ${index}:`, u);
                return (
                  <Pressable
                    key={u.id || `ubicacion-${index}`}
                    style={tw`p-3 border-b border-gray-200`}
                    onPress={() => {
                      console.log('🎯 Ubicación seleccionada:', u);
                      
                      // Validar que existan las coordenadas
                      if (!u.origen_lat || !u.origen_lng || !u.destino_lat || !u.destino_lng) {
                        Alert.alert('Error', 'Esta ubicación no tiene coordenadas válidas');
                        return;
                      }
                      
                      // Establecer origen y destino en una sola operación
                      setForm(f => ({ 
                        ...f, 
                        origen: { 
                          latitude: u.origen_lat, 
                          longitude: u.origen_lng 
                        },
                        destino: { 
                          latitude: u.destino_lat, 
                          longitude: u.destino_lng 
                        },
                        segmentos: u.segmentos || [],
                        rutaGeoJSON: u.rutageojson || null
                      }));
                      
                      setOrigenLabel(u.nombreorigen || 'Origen sin nombre');
                      setDestinoLabel(u.nombredestino || 'Destino sin nombre');
                      
                      limpiarError('ubicacion');
                      setShowOrigenModal(false);
                    }}
                  >
                    <Text style={tw`text-gray-800`}>{u.nombreorigen || 'Sin nombre'}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable 
              style={tw`mt-4 bg-gray-200 rounded-lg p-3`}
              onPress={() => setShowOrigenModal(false)}
            >
              <Text style={tw`text-gray-700 font-medium text-center`}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal Destino */}
      <Modal visible={showDestinoModal} transparent animationType="fade">
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center`}>
          <View style={tw`bg-white rounded-lg w-4/5 p-4 max-h-96`}>
            <Text style={tw`text-lg font-bold mb-4 text-center`}>Seleccionar Destino</Text>
            <ScrollView style={tw`max-h-60`}>
              {ubicaciones.map((u, index) => {
                console.log(`Ubicación destino ${index}:`, u);
                return (
                  <Pressable
                    key={u.id || `ubicacion-destino-${index}`}
                    style={tw`p-3 border-b border-gray-200`}
                    onPress={() => {
                      console.log('🎯 Ubicación destino seleccionada:', u);
                      
                      // Validar que existan las coordenadas
                      if (!u.origen_lat || !u.origen_lng || !u.destino_lat || !u.destino_lng) {
                        Alert.alert('Error', 'Esta ubicación no tiene coordenadas válidas');
                        return;
                      }
                      
                      // Establecer origen y destino en una sola operación (igual que en el modal de origen)
                      setForm(f => ({ 
                        ...f, 
                        origen: { 
                          latitude: u.origen_lat, 
                          longitude: u.origen_lng 
                        },
                        destino: { 
                          latitude: u.destino_lat, 
                          longitude: u.destino_lng 
                        },
                        segmentos: u.segmentos || [],
                        rutaGeoJSON: u.rutageojson || null
                      }));
                      setOrigenLabel(u.nombreorigen || 'Origen sin nombre');
                      setDestinoLabel(u.nombredestino || 'Destino sin nombre');
                      setShowDestinoModal(false);
                    }}
                  >
                    <Text style={tw`text-gray-800`}>{u.nombredestino || 'Sin nombre'}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable 
              style={tw`mt-4 bg-gray-200 rounded-lg p-3`}
              onPress={() => setShowDestinoModal(false)}
            >
              <Text style={tw`text-gray-700 font-medium text-center`}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal de Selección de Carga */}
      <Modal visible={showCargaModal} transparent animationType="fade">
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center`}>
          <View style={tw`bg-white rounded-lg w-4/5 p-4 max-h-96`}>
            <Text style={tw`text-lg font-bold mb-4 text-center`}>
              Seleccionar {cargaModalData.tipo === 'tipo' ? 'Tipo de Carga' : 
                          cargaModalData.tipo === 'variedad' ? 'Variedad' : 'Empaquetado'}
            </Text>
            <ScrollView style={tw`max-h-60`}>
              {(cargaModalData.tipo === 'tipo' ? tiposCarga : 
                cargaModalData.tipo === 'variedad' ? variedadOptions : empaquetadoOptions
               ).map((opcion, idx) => (
                <Pressable
                  key={idx}
                  style={tw`p-3 border-b border-gray-200`}
                  onPress={() => {
                    updateCarga(cargaModalData.particionIndex, cargaModalData.cargaIndex, cargaModalData.tipo, opcion);
                    setShowCargaModal(false);
                  }}
                >
                  <Text style={tw`text-gray-800`}>{opcion}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable 
              style={tw`mt-4 bg-gray-200 rounded-lg p-3`}
              onPress={() => setShowCargaModal(false)}
            >
              <Text style={tw`text-gray-700 font-medium text-center`}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal visible transparent animationType="fade">
            <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center`}>
              <View style={tw`bg-white rounded-2xl p-4 w-11/12 max-w-sm items-center`}>
                <Text style={tw`text-lg font-bold mb-2`}>Seleccionar fecha</Text>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={(_, date) => {
                    if (date) setSelectedDate(date);
                  }}
                  style={{ width: '100%' }}
                  textColor="#111"
                  locale="es"
                />
                <View style={tw`flex-row mt-4 w-full`}> 
                  <Pressable
                    style={tw`flex-1 bg-gray-200 rounded-lg py-3 mr-2`}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={tw`text-gray-700 text-center font-medium`}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={tw`flex-1 bg-blue-600 rounded-lg py-3 ml-2`}
                    onPress={() => {
                      setShowDatePicker(false);
                      updateParticion(datePickerIndex, 'fecha', selectedDate.toISOString().slice(0, 10));
                    }}
                  >
                    <Text style={tw`text-white text-center font-medium`}>Listo</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(_, date) => {
              setShowDatePicker(false);
              if (date) {
                updateParticion(datePickerIndex, 'fecha', date.toISOString().slice(0, 10));
              }
            }}
            locale="es"
          />
        )
      )}

      {/* Time Picker */}
      {showTimePicker && (
        Platform.OS === 'ios' ? (
          <Modal visible transparent animationType="fade">
            <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center`}>
              <View style={tw`bg-white rounded-2xl p-4 w-11/12 max-w-sm items-center`}>
                <Text style={tw`text-lg font-bold mb-2`}>Seleccionar hora</Text>
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display="spinner"
                  is24Hour
                  onChange={(_, date) => {
                    if (date) setSelectedTime(date);
                  }}
                  style={{ width: '100%' }}
                  textColor="#111"
                  locale="es"
                />
                <View style={tw`flex-row mt-4 w-full`}> 
                  <Pressable
                    style={tw`flex-1 bg-gray-200 rounded-lg py-3 mr-2`}
                    onPress={() => setShowTimePicker(false)}
                  >
                    <Text style={tw`text-gray-700 text-center font-medium`}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={tw`flex-1 bg-blue-600 rounded-lg py-3 ml-2`}
                    onPress={() => {
                      setShowTimePicker(false);
                      const hh = selectedTime.getHours().toString().padStart(2, '0');
                      const mm = selectedTime.getMinutes().toString().padStart(2, '0');
                      updateParticion(
                        timePickerData.particionIndex, 
                        timePickerData.tipo === 'recogida' ? 'horaRecogida' : 'horaEntrega', 
                        `${hh}:${mm}`
                      );
                    }}
                  >
                    <Text style={tw`text-white text-center font-medium`}>Listo</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display="default"
            is24Hour
            onChange={(_, time) => {
              setShowTimePicker(false);
              if (time) {
                const hh = time.getHours().toString().padStart(2, '0');
                const mm = time.getMinutes().toString().padStart(2, '0');
                updateParticion(
                  timePickerData.particionIndex, 
                  timePickerData.tipo === 'recogida' ? 'horaRecogida' : 'horaEntrega', 
                  `${hh}:${mm}`
                );
              }
            }}
            locale="es"
          />
        )
      )}

      {/* Botón Continuar flotante */}
      {step === 1 && (
        <View style={tw`absolute bottom-16 left-0 right-0 px-4`}>
          <Pressable 
            style={tw`bg-blue-600 p-4 rounded-lg items-center`}
            onPress={handleContinuar}
          >
            <Text style={tw`text-white font-semibold text-lg`}>Continuar</Text>
          </Pressable>
        </View>
      )}

      {/* Modal de error animado */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-40 justify-center items-center`}>
          <View style={tw`bg-white rounded-2xl p-6 w-4/5 items-center shadow-lg`}>
            <Ionicons name="alert-circle" size={48} color="#dc2626" style={tw`mb-2`} />
            <Text style={tw`text-lg font-bold text-red-600 mb-2`}>¡Atención!</Text>
            <Text style={tw`text-gray-700 text-center mb-4`}>{errorMessage}</Text>
            <Pressable
              style={tw`bg-red-600 rounded-lg px-6 py-2`}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={tw`text-white font-semibold`}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal de éxito animado */}
      <Modal
        visible={showConfirmacion}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmacion(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-40 justify-center items-center`}>
          <View style={tw`bg-white rounded-2xl p-8 items-center shadow-lg w-4/5`}>
            <Animated.View style={{ transform: [{ scale: checkAnim }] }}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </Animated.View>
            <Text style={tw`text-gray-800 text-2xl font-bold mt-4 mb-2 text-center`}>
              ¡Envío Creado!
            </Text>
            <Text style={tw`text-gray-600 text-lg mb-6 text-center`}>
              Tu envío ha sido registrado exitosamente
            </Text>
            <View style={tw`mb-6 w-full`}>
              <Text style={tw`text-gray-700 text-center mb-1`}>
                Recogida en {origenLabel}
              </Text>
              <Text style={tw`text-gray-700 text-center`}>
                Entrega en {destinoLabel}
              </Text>
            </View>
            <View style={tw`flex-row w-full`}>
              <Pressable 
                style={tw`bg-gray-100 rounded-lg px-4 py-3 mr-2 flex-1`}
                onPress={() => {
                  resetForm();
                  setShowConfirmacion(false);
                  router.replace('/envio');
                }}
              >
                <Text style={tw`text-gray-700 font-semibold text-center`}>Volver a Envío</Text>
              </Pressable>
              <Pressable 
                style={tw`bg-blue-600 rounded-lg px-4 py-3 ml-2 flex-1`}
                onPress={() => {
                  resetForm();
                  setShowConfirmacion(false);
                  router.replace('/crear-envio/CrearEnvio');
                }}
              >
                <Text style={tw`text-white font-semibold text-center`}>Nuevo Envío</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
