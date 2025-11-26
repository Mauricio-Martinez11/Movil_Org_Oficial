// app/checklist-condiciones.tsx

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
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

export default function ChecklistCondiciones() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [expanded, setExpanded] = useState(false);
  const panelY = useRef(new Animated.Value(0)).current;

  const [observaciones, setObservaciones] = useState('');
  const [conditions, setConditions] = useState<Record<string, boolean>>({
    temperatura_controlada: false,
    embalaje_adecuado: false,
    carga_segura: false,
    vehiculo_limpio: false,
    documentos_presentes: false,
    ruta_conocida: false,
    combustible_completo: false,
    gps_operativo: false,
    comunicacion_funcional: false,
    estado_general_aceptable: false,
  });

  const toggle = () =>
    Animated.timing(panelY, {
      toValue: expanded ? 0 : -height * 0.4,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setExpanded(!expanded));

  const toggleCheck = (key: string) =>
    setConditions((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = () => {
    console.log('✅ Enviar checklist condiciones:', conditions, observaciones);
    // Aquí agregarías lógica real con fetch()
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0f2027' }}>
      <Animated.View style={[styles.card, { transform: [{ translateY: panelY }] }]}>
        <Pressable onPress={toggle} style={styles.dragger} />

        <Text style={styles.title}>Checklist Condiciones - Envío {id}</Text>
        <Text style={styles.subtitle}>Confirma que todo esté correcto</Text>

        {expanded && (
          <ScrollView style={{ marginTop: 12, maxHeight: height * 0.4 }}>
            <TextInput
              style={styles.input}
              placeholder="Observaciones"
              placeholderTextColor="#aaa"
              value={observaciones}
              onChangeText={setObservaciones}
            />
            {Object.entries(conditions).map(([k, v]) => (
              <Pressable key={k} style={styles.row} onPress={() => toggleCheck(k)}>
                <Ionicons name={v ? 'checkbox' : 'square-outline'} size={20} color="#fff" />
                <Text style={styles.label}>{k.replace(/_/g, ' ')}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.button} onPress={handleSubmit}>
              <Text style={styles.btnText}>Enviar Checklist</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { color: '#fff', marginLeft: 8, textTransform: 'capitalize' },
  button: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 12,
  },
  btnText: { color: '#fff', fontWeight: '600' },
});
