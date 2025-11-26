// app/check-and-sign.tsx

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  TextInput,
  Animated,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Signature, { SignatureViewRef } from 'react-native-signature-canvas';

const { height } = Dimensions.get('window');

export default function CheckAndSign() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [expanded, setExpanded] = useState(false);
  const panelY = useRef(new Animated.Value(0)).current;

  const [descripcion, setDescripcion] = useState('');
  const [firma, setFirma] = useState('');
  const sigRef = useRef<SignatureViewRef | null>(null);

  const toggle = () =>
    Animated.timing(panelY, {
      toValue: expanded ? 0 : -height * 0.4,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setExpanded(!expanded));

  const handleSubmit = () => {
    if (!firma) return alert('Por favor, firma antes de continuar.');
    console.log('📦 Finalizar entrega:', descripcion, firma.length);
    // Aquí agregarías lógica real con fetch()
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0f2027' }}>
      <Animated.View style={[styles.card, { transform: [{ translateY: panelY }] }]}>
        <Pressable onPress={toggle} style={styles.dragger} />

        <Text style={styles.title}>Finalizar Entrega - Envío {id}</Text>
        <Text style={styles.subtitle}>Firma y confirma para terminar</Text>

        {expanded && (
          <ScrollView style={{ marginTop: 12, maxHeight: height * 0.4 }}>
            <TextInput
              style={styles.input}
              placeholder="Descripción del incidente"
              placeholderTextColor="#aaa"
              value={descripcion}
              onChangeText={setDescripcion}
            />
            <View style={{ height: 200 }}>
              <Signature
                ref={sigRef}
                onOK={(data) => setFirma(data)}
                descriptionText="Firma aquí"
                clearText="Limpiar"
                confirmText="Guardar"
                webStyle={`.m-signature-pad--footer { background-color: #0f2027; }`}
              />
            </View>
            <Pressable style={styles.button} onPress={handleSubmit}>
              <Text style={styles.btnText}>Finalizar Entrega</Text>
            </Pressable>
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#0f2027',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  dragger: {
    width: 40,
    height: 5,
    backgroundColor: '#888',
    alignSelf: 'center',
    borderRadius: 3,
    marginBottom: 10,
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  subtitle: { color: '#aaa', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  input: {
    backgroundColor: '#2a3748',
    borderRadius: 10,
    padding: 10,
    color: '#fff',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  btnText: { color: '#fff', fontWeight: '600' },
});
