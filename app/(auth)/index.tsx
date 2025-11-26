import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, MotiText } from 'moti';
import tw from 'twrnc';

export default function WelcomeScreen() {
  const router = useRouter();
  const { width, height } = Dimensions.get('window');
  const LOGO_SIZE = width * 0.4;
  
  // Restauramos los cálculos originales para el logo
  const centerY = (height - LOGO_SIZE) / 2;
  const topY = 200; // Ajustado para que no suba tanto (original: 120)
  
  // Estados para controlar cada fase de la animación
  const [animationStage, setAnimationStage] = useState(1);
  const [showOrgaTrack, setShowOrgaTrack] = useState(false);
  const [showFinalContent, setShowFinalContent] = useState(false);
  const [isTextReturning, setIsTextReturning] = useState(false);
  
  const orgaTrackText = "OrgTrack";

  useEffect(() => {
    // Secuencia de animación principal con tiempos ajustados
    const timeline = {
      stage1: 800,     // Logo aparece en el centro
      stage2: 2000,    // Logo se desliza a la izquierda
      stage3: 2300,    // Comienza a mostrar "OrgTrack"
      stage4: 3800,    // Logo vuelve al centro
      stage5: 4800,    // Logo sube arriba
      stage6: 5800     // Aparece contenido final
    };

    const stage1 = setTimeout(() => setAnimationStage(2), timeline.stage1);
    const stage2 = setTimeout(() => {
      setAnimationStage(3);
      setShowOrgaTrack(true);
      setIsTextReturning(false);
    }, timeline.stage2);
    const stage3 = setTimeout(() => {
      setAnimationStage(4);
      setIsTextReturning(true);
      setTimeout(() => setShowOrgaTrack(false), 800); // Aumentado de 600
    }, timeline.stage4);
    const stage4 = setTimeout(() => setAnimationStage(5), timeline.stage5);
    const showContent = setTimeout(() => setShowFinalContent(true), timeline.stage6);

    return () => {
      clearTimeout(stage1);
      clearTimeout(stage2);
      clearTimeout(stage3);
      clearTimeout(stage4);
      clearTimeout(showContent);
    };
  }, []);

  // Determinar la posición X del logo según la etapa de animación
  const getLogoX = () => {
    if (animationStage === 3) {
      return (width / 4) - (LOGO_SIZE / 2); // A la izquierda
    }
    return (width - LOGO_SIZE) / 2; // Centrado
  };

  // Determinar la posición Y del logo según la etapa de animación
  const getLogoY = () => {
    if (animationStage >= 5) {
      return topY; // Arriba
    }
    return centerY; // Centro
  };

  // Calcular la posición inicial del texto basada en la posición del logo
  const getTextStartX = () => {
    if (animationStage === 3) {
      return (width / 4) + (LOGO_SIZE / 2); // Posición inicial desde el borde derecho del logo
    }
    return width / 2; // Posición centrada
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#FFFFFF']} style={tw`flex-1 bg-white`}>
      {/* Logo animado */}
      <MotiView
        from={{ translateY: height, translateX: (width - LOGO_SIZE) / 2 }}
        animate={{ 
          translateY: getLogoY(), 
          translateX: getLogoX() 
        }}
        transition={{ type: 'timing', duration: 800 }}
        style={[
          tw`absolute justify-center items-center shadow-lg z-10`,
          {
            width: LOGO_SIZE,
            height: LOGO_SIZE,
            borderRadius: LOGO_SIZE / 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 5,
            elevation: 5,
          },
        ]}
      >
        <View style={tw`w-full h-full rounded-full bg-[#0140CD] justify-center items-center`}>
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: LOGO_SIZE * 0.7, height: LOGO_SIZE * 0.7 }}
            resizeMode="contain"
            tintColor="#FFFFFF"
          />
        </View>
      </MotiView>

      {/* Texto OrgaTrack que se desliza desde y hacia el logo */}
      {showOrgaTrack && (
        <MotiView
          from={{ 
            opacity: 1,
            translateX: isTextReturning ? (width / 4) + (LOGO_SIZE / 2) + 20 : (width - LOGO_SIZE) / 2
          }}
          animate={{ 
            opacity: isTextReturning ? 0 : 1,
            translateX: isTextReturning ? (width - LOGO_SIZE) / 2 : (width / 4) + (LOGO_SIZE / 2) + 20
          }}
          transition={{ type: 'timing', duration: 800 }}
          style={{
            position: 'absolute',
            top: centerY + (LOGO_SIZE / 2) - 15,
            zIndex: 5,
          }}
        >
          <Text style={tw`text-4xl font-bold text-[#0140CD]`}>
            {orgaTrackText}
          </Text>
        </MotiView>
      )}

      {/* Contenido final (título, subtítulo y botón) - ahora centrado */}
      {showFinalContent && (
        <View
          style={[
            tw`absolute w-full items-center`,
            {
              top: topY + LOGO_SIZE + 40,
            }
          ]}
        >
          <MotiText
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400 }}
            style={tw`text-2xl text-[#0140CD] font-bold mb-2 text-center`}
          >
            Bienvenido a OrgTrack
          </MotiText>

          <MotiText
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 400 }}
            style={tw`text-base text-gray-600 text-center mb-8 px-6 max-w-xs mx-auto`}
          >
            Optimiza tu logística en cada envío
          </MotiText>

          {/* Botón con animación más rápida */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ 
              type: 'timing', 
              duration: 300,
              delay: 600
            }}
            style={tw`overflow-hidden`}
          >
            <Pressable
              style={({ pressed }) => [
                tw`bg-[#0140CD] py-3.5 px-12 rounded-3xl`,
                {
                  opacity: pressed ? 0.9 : 1,
                }
              ]}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={tw`text-white text-base font-semibold`}>Comenzar</Text>
            </Pressable>
          </MotiView>
        </View>
      )}
    </LinearGradient>
  );
}