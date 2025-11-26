import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// Estilos que pueden ser necesarios para componentes que no soportan Tailwind completamente
// o para casos específicos como MapView, DateTimePicker, etc.

export default StyleSheet.create({
  // MapView específico (React Native Maps puede necesitar estilos tradicionales)
  map: {
    width: W - 32,
    height: 160,
    borderRadius: 8,
  },
  
  // Modal overlays (para casos donde Tailwind no funcione perfectamente)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Shadow para iOS (Tailwind shadow puede no funcionar en todos los casos)
  shadowCard: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // Para Android
  },
  
  // Estilos específicos de plataforma
  containerIOS: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  
  // TextInput multiline específico
  textAreaInput: {
    textAlignVertical: 'top',
    minHeight: 60,
  },
  
  // Stepper line animation (si se necesita animación específica)
  stepperLine: {
    height: 2,
    backgroundColor: '#fff',
  },
  
  // Full width para casos específicos
  fullWidth: {
    width: '100%',
  },
  
  // Centrado absoluto
  absoluteCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
  },
});

// Constantes de colores si se necesitan fuera de Tailwind
export const colors = {
  primary: '#0140CD',
  secondary: '#ffffff',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  gray: {
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  }
};

// Espaciado consistente
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

// Tamaños de fuente
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

// Radios de borde
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};
