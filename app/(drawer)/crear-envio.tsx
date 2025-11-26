// app/crear-envio.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Dimensions,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

// --- Tipos ---
type Coordenada = { latitude: number; longitude: number };
type UbicacionAPI = {
  _id: string;
  nombreOrigen: string;
  coordenadasOrigen: [number, number];
  nombreDestino: string;
  coordenadasDestino: [number, number];
};
type Carga = {
  tipo: string;
  variedad: string;
  empaquetado: string;
  cantidad: number;
  peso: number;
};
type FormularioEnvio = {
  origen: Coordenada;
  destino: Coordenada;
  fecha: string;
  horaRecogida: string;
  horaEntrega: string;
  instruccionesRecogida: string;
  instruccionesEntrega: string;
  cargas: Carga[];
  tipoTransporteLabel: string;
};

// --- Constantes ---
const pasos = ['Ubicación', 'Partición', 'Carga', 'Transporte', 'Confirmar'];
const { width: W } = Dimensions.get('window');
const CIRCLE_DIAM = 28;
import { getBackendApiBase, getOpenRouteServiceApiKey } from '../config/api-config';

const API_BASE = getBackendApiBase();
const RUTA_KEY = getOpenRouteServiceApiKey();
const tiposCarga = ['Frutas', 'Verduras', 'Granos', 'Lácteos'];
const variedadOptions = [
  'Orgánico certificado',
  'Libre de pesticidas',
  'Comercio justo',
  'Local',
];
const transporteIcons: Record<string, any> = {
  Refrigerado: require('../../assets/ico-refrigerado.png'),
  Ventilado: require('../../assets/ico-ventilado.png'),
  Aislado: require('../../assets/ico-aislado.png'),
};

export default function CrearEnvio() {
  const [paso, setPaso] = useState(0);
  const [loading, setLoading] = useState(false);

  const [ubicaciones, setUbicaciones] = useState<UbicacionAPI[]>([]);
  const [showOrigenModal, setShowOrigenModal] = useState(false);
  const [showDestinoModal, setShowDestinoModal] = useState(false);
  const [origenLabel, setOrigenLabel] = useState('');
  const [destinoLabel, setDestinoLabel] = useState('');

  const [transportes] = useState<string[]>(['Refrigerado','Ventilado','Aislado']);
  const [tipoTransporteId, setTipoTransporteId] = useState<number | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate] = useState(new Date());
  const [showTimeRec, setShowTimeRec] = useState(false);
  const [selectedTimeRec] = useState(new Date());
  const [showTimeEnt, setShowTimeEnt] = useState(false);
  const [selectedTimeEnt] = useState(new Date());

  const [showCargaModal, setShowCargaModal] = useState(false);
  const [cargaModalIndex, setCargaModalIndex] = useState(0);
  const [showVariedadModal, setShowVariedadModal] = useState(false);
  const [variedadModalIndex, setVariedadModalIndex] = useState(0);

  const [form, setForm] = useState<FormularioEnvio>({
    origen: { latitude: 0, longitude: 0 },
    destino: { latitude: 0, longitude: 0 },
    fecha: '',
    horaRecogida: '',
    horaEntrega: '',
    instruccionesRecogida: '',
    instruccionesEntrega: '',
    cargas: [{ tipo: '', variedad: '', empaquetado: '', cantidad: 0, peso: 0 }],
    tipoTransporteLabel: '',
  });

  // ruta de la API
  const [routeCoords, setRouteCoords] = useState<Coordenada[]>([]);

  // Carga ubicaciones sin duplicados
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_BASE}/ubicaciones/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const todas: UbicacionAPI[] = await res.json();
      const seen = new Set<string>();
      const unicas = todas.filter(u => {
        if (seen.has(u._id)) return false;
        seen.add(u._id);
        return true;
      });
      setUbicaciones(unicas);
    })();
  }, []);

  // Cuando cambian origen/destino, pide la ruta a tu API
  useEffect(() => {
    if (
      form.origen.latitude !== 0 &&
      form.destino.latitude !== 0
    ) {
      fetch(
        `${API_BASE}/ruta?key=${RUTA_KEY}` +
        `&start=${form.origen.longitude},${form.origen.latitude}` +
        `&end=${form.destino.longitude},${form.destino.latitude}`
      )
        .then(r => r.json())
        .then((data: { coordinates: [number,number][] }) => {
          const coords = data.coordinates.map(([lon, lat]) => ({
            latitude: lat,
            longitude: lon,
          }));
          setRouteCoords(coords);
        })
        .catch(console.error);
    } else {
      setRouteCoords([]);
    }
  }, [form.origen, form.destino]);

  const handleChange = (k: keyof FormularioEnvio, v: any) =>
    setForm(f => ({ ...f, [k]: v } as any));
  const updateCarga = (i: number, f: keyof Carga, v: any) => {
    const c = [...form.cargas];
    c[i] = { ...c[i], [f]: v };
    setForm(fm => ({ ...fm, cargas: c }));
  };
  const agregarCarga = () =>
    setForm(fm => ({
      ...fm,
      cargas: [
        ...fm.cargas,
        { tipo: '', variedad: '', empaquetado: '', cantidad: 0, peso: 0 },
      ],
    }));

  const crearEnvio = async () => {
    if (loading) return; // Previene múltiples envíos
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No autenticado');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      // 1) Ubicación
      const loc = {
        nombreOrigen: origenLabel,
        coordenadasOrigen: [
          form.origen.latitude,
          form.origen.longitude,
        ],
        nombreDestino: destinoLabel,
        coordenadasDestino: [
          form.destino.latitude,
          form.destino.longitude,
        ],
        segmentos: [],
      };
      const ru = await fetch(`${API_BASE}/ubicaciones/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(loc),
      });
      const dUb = await ru.json();
      if (!ru.ok) throw new Error(dUb.error || 'Error ubicación');
      const idUb = dUb._id;

      // 2) Partición
      const part = {
        id_tipo_transporte: tipoTransporteId,
        recogidaEntrega: {
          fecha_recogida: form.fecha,
          hora_recogida: form.horaRecogida,
          hora_entrega: form.horaEntrega,
          instrucciones_recogida: form.instruccionesRecogida,
          instrucciones_entrega: form.instruccionesEntrega,
        },
        cargas: form.cargas,
      };

      // 3) Envío
      const ev = await fetch(`${API_BASE}/envios/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ id_ubicacion_mongo: idUb, particiones: [part] }),
      });
      const dEv = await ev.json();
      if (!ev.ok) throw new Error(dEv.error || 'Error envío');

      Alert.alert('¡Éxito!', 'Envío creado correctamente');
      setForm({
        origen: { latitude: 0, longitude: 0 },
        destino: { latitude: 0, longitude: 0 },
        fecha: '',
        horaRecogida: '',
        horaEntrega: '',
        instruccionesRecogida: '',
        instruccionesEntrega: '',
        cargas: [
          { tipo: '', variedad: '', empaquetado: '', cantidad: 0, peso: 0 },
        ],
        tipoTransporteLabel: '',
      });
      setOrigenLabel('');
      setDestinoLabel('');
      setTipoTransporteId(null);
      setPaso(0);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const siguiente = () =>
    paso < pasos.length - 1 && setPaso(paso + 1);
  const anterior = () => paso > 0 && setPaso(paso - 1);

  // Paso 0
  const renderPaso0 = () => {
    const origenes = ubicaciones.filter(
      (u, i, arr) =>
        arr.findIndex(x => x.nombreOrigen === u.nombreOrigen) === i
    );
    const destinos = ubicaciones.filter(
      (u, i, arr) =>
        arr.findIndex(x => x.nombreDestino === u.nombreDestino) === i
    );

    return (
      <>
        <Text style={styles.labelWhite}>Origen:</Text>
        <Pressable
          style={styles.inputWrapper}
          onPress={() => setShowOrigenModal(true)}
        >
          <Feather name="map-pin" size={20} color="#999" />
          <Text style={styles.input}>
            {origenLabel || 'Selecciona origen'}
          </Text>
        </Pressable>

        <Text style={styles.labelWhite}>Destino:</Text>
        <Pressable
          style={styles.inputWrapper}
          onPress={() => setShowDestinoModal(true)}
        >
          <Feather name="map" size={20} color="#999" />
          <Text style={styles.input}>
            {destinoLabel || 'Selecciona destino'}
          </Text>
        </Pressable>

        <MapView
          style={styles.map}
          initialRegion={{
            latitude:
              form.origen.latitude && form.destino.latitude
                ? (form.origen.latitude + form.destino.latitude) / 2
                : -17.78,
            longitude:
              form.origen.longitude && form.destino.longitude
                ? (form.origen.longitude + form.destino.longitude) / 2
                : -63.18,
            latitudeDelta:
              form.origen.latitude && form.destino.latitude
                ? Math.abs(form.origen.latitude - form.destino.latitude) *
                  2
                : 0.1,
            longitudeDelta:
              form.origen.longitude && form.destino.longitude
                ? Math.abs(
                    form.origen.longitude - form.destino.longitude
                  ) * 2
                : 0.1,
          }}
        >
          {form.origen.latitude !== 0 && (
            <Marker coordinate={form.origen} title={origenLabel} />
          )}
          {form.destino.latitude !== 0 && (
            <Marker
              coordinate={form.destino}
              pinColor="green"
              title={destinoLabel}
            />
          )}
          {routeCoords.length > 0 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor="#fff"
              strokeWidth={4}
            />
          )}
        </MapView>

        {/* Modal Origen */}
        <Modal
          visible={showOrigenModal}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Elige Origen</Text>
              {origenes.map(u => (
                <Pressable
                  key={u._id}
                  style={styles.modalOption}
                  onPress={() => {
                    handleChange('origen', {
                      latitude: u.coordenadasOrigen[0],
                      longitude: u.coordenadasOrigen[1],
                    });
                    setOrigenLabel(u.nombreOrigen);
                    setShowOrigenModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>
                    {u.nombreOrigen}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowOrigenModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Modal Destino */}
        <Modal
          visible={showDestinoModal}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Elige Destino</Text>
              {destinos.map(u => (
                <Pressable
                  key={u._id}
                  style={styles.modalOption}
                  onPress={() => {
                    handleChange('destino', {
                      latitude: u.coordenadasDestino[0],
                      longitude: u.coordenadasDestino[1],
                    });
                    setDestinoLabel(u.nombreDestino);
                    setShowDestinoModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>
                    {u.nombreDestino}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowDestinoModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </>
    );
  };

  // Paso 1: Partición
  const renderPaso1 = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitleWhite}>Partición</Text>

      <Text style={styles.labelWhite}>Fecha</Text>
      <Pressable
        style={styles.inputWrapper}
        onPress={() => setShowDatePicker(true)}
      >
        <Feather name="calendar" size={20} color="#999" />
        <Text style={styles.input}>
          {form.fecha || 'YYYY-MM-DD'}
        </Text>
      </Pressable>
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(_, d) => {
            setShowDatePicker(false);
            if (d)
              handleChange(
                'fecha',
                d.toISOString().slice(0, 10)
              );
          }}
        />
      )}

      <Text style={styles.labelWhite}>Hora Recogida</Text>
      <Pressable
        style={styles.inputWrapper}
        onPress={() => setShowTimeRec(true)}
      >
        <Feather name="clock" size={20} color="#999" />
        <Text style={styles.input}>
          {form.horaRecogida || 'HH:MM'}
        </Text>
      </Pressable>
      {showTimeRec && (
        <DateTimePicker
          value={selectedTimeRec}
          mode="time"
          display="default"
          is24Hour
          onChange={(_, d) => {
            setShowTimeRec(false);
            if (d) {
              const hh = d
                .getHours()
                .toString()
                .padStart(2, '0');
              const mm = d
                .getMinutes()
                .toString()
                .padStart(2, '0');
              handleChange(
                'horaRecogida',
                `${hh}:${mm}`
              );
            }
          }}
        />
      )}

      <Text style={styles.labelWhite}>Hora Entrega</Text>
      <Pressable
        style={styles.inputWrapper}
        onPress={() => setShowTimeEnt(true)}
      >
        <Feather name="clock" size={20} color="#999" />
        <Text style={styles.input}>
          {form.horaEntrega || 'HH:MM'}
        </Text>
      </Pressable>
      {showTimeEnt && (
        <DateTimePicker
          value={selectedTimeEnt}
          mode="time"
          display="default"
          is24Hour
          onChange={(_, d) => {
            setShowTimeEnt(false);
            if (d) {
              const hh = d
                .getHours()
                .toString()
                .padStart(2, '0');
              const mm = d
                .getMinutes()
                .toString()
                .padStart(2, '0');
              handleChange(
                'horaEntrega',
                `${hh}:${mm}`
              );
            }
          }}
        />
      )}

      <Text style={styles.labelWhite}>
        Instrucciones Recogida
      </Text>
      <View style={styles.inputWrapper}>
        <Feather name="edit" size={20} color="#999" />
        <TextInput
          style={styles.textarea}
          placeholder="Opcional..."
          placeholderTextColor="#999"
          value={form.instruccionesRecogida}
          onChangeText={t =>
            handleChange('instruccionesRecogida', t)
          }
          multiline
        />
      </View>

      <Text style={styles.labelWhite}>
        Instrucciones Entrega
      </Text>
      <View style={styles.inputWrapper}>
        <Feather name="edit" size={20} color="#999" />
        <TextInput
          style={styles.textarea}
          placeholder="Opcional..."
          placeholderTextColor="#999"
          value={form.instruccionesEntrega}
          onChangeText={t =>
            handleChange('instruccionesEntrega', t)
          }
          multiline
        />
      </View>
    </View>
  );

  // Paso 2: Cargas
  const renderPaso2 = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitleWhite}>Cargas</Text>
      {form.cargas.map((c, i) => (
        <View key={i} style={styles.cardSection}>
          <Text style={styles.labelWhite}>Tipo</Text>
          <Pressable
            style={styles.inputWrapper}
            onPress={() => {
              setCargaModalIndex(i);
              setShowCargaModal(true);
            }}
          >
            <Feather name="layers" size={20} color="#999" />
            <Text style={styles.input}>
              {c.tipo || 'Seleccionar'}
            </Text>
          </Pressable>

          <Text style={styles.labelWhite}>Variedad</Text>
          <Pressable
            style={styles.inputWrapper}
            onPress={() => {
              setVariedadModalIndex(i);
              setShowVariedadModal(true);
            }}
          >
            <Feather name="tag" size={20} color="#999" />
            <Text style={styles.input}>
              {c.variedad || 'Seleccionar'}
            </Text>
          </Pressable>

          <View style={styles.twoColumns}>
            <View style={{ flex: 1 }}>
              <Text style={styles.labelWhite}>Cantidad</Text>
              <View style={styles.counterRow}>
                <Pressable
                  onPress={() =>
                    updateCarga(
                      i,
                      'cantidad',
                      Math.max(0, c.cantidad - 1)
                    )
                  }
                  style={styles.counterBtn}
                >
                  <Text style={styles.counterText}>—</Text>
                </Pressable>
                <Text style={styles.counterValue}>{c.cantidad}</Text>
                <Pressable
                  onPress={() =>
                    updateCarga(i, 'cantidad', c.cantidad + 1)
                  }
                  style={styles.counterBtn}
                >
                  <Text style={styles.counterText}>+</Text>
                </Pressable>
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.labelWhite}>Peso (kg)</Text>
              <View style={styles.counterRow}>
                <Pressable
                  onPress={() =>
                    updateCarga(
                      i,
                      'peso',
                      Math.max(0, c.peso - 1)
                    )
                  }
                  style={styles.counterBtn}
                >
                  <Text style={styles.counterText}>—</Text>
                </Pressable>
                <Text style={styles.counterValue}>{c.peso}</Text>
                <Pressable
                  onPress={() =>
                    updateCarga(i, 'peso', c.peso + 1)
                  }
                  style={styles.counterBtn}
                >
                  <Text style={styles.counterText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      ))}
      <Pressable style={styles.buttonAdd} onPress={agregarCarga}>
        <Ionicons
          name="add-circle"
          size={20}
          color="#fff"
        />
        <Text style={styles.buttonAddText}>
          Añadir otra carga
        </Text>
      </Pressable>

      {/* Modales */}
      <Modal
        transparent
        visible={showCargaModal}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {tiposCarga.map((t, idx) => (
              <Pressable
                key={idx}
                style={styles.modalOption}
                onPress={() => {
                  updateCarga(cargaModalIndex, 'tipo', t);
                  setShowCargaModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{t}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.modalCancelBtn}
              onPress={() => setShowCargaModal(false)}
            >
              <Text style={styles.modalCancelText}>
                Cancelar
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showVariedadModal}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {variedadOptions.map((v, idx) => (
              <Pressable
                key={idx}
                style={styles.modalOption}
                onPress={() => {
                  updateCarga(variedadModalIndex, 'variedad', v);
                  setShowVariedadModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{v}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.modalCancelBtn}
              onPress={() => setShowVariedadModal(false)}
            >
              <Text style={styles.modalCancelText}>
                Cancelar
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );

  // Paso 3: Transporte
  const renderPaso3 = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitleWhite}>Transporte</Text>
      <View style={styles.transportRow}>
        {transportes.map((tipo, idx) => (
          <Pressable
            key={idx}
            style={styles.transportCard}
            onPress={() => {
              setTipoTransporteId(idx);
              handleChange('tipoTransporteLabel', tipo);
            }}
          >

      <Image
        source={transporteIcons[tipo]}
        style={[
          styles.transportIcon,
          form.tipoTransporteLabel === tipo && styles.transportSelected,
        ]}
      />
    </Pressable>
  ))}
</View>
<Text style={styles.descText}>
  {form.tipoTransporteLabel
    ? `Seleccionado: ${form.tipoTransporteLabel}`
    : 'Elige transporte'}
</Text>
</View>
);

// Paso 4: Confirmar
const renderPaso4 = () => (
<View style={styles.card}>
  <Text style={styles.cardTitleWhite}>Resumen</Text>

  <View style={styles.confirmRow}>
    <Feather name="map-pin" size={20} color="#fff" />
    <Text style={styles.confirmText}>{origenLabel}</Text>
  </View>
  <View style={styles.confirmRow}>
    <Feather name="map" size={20} color="#fff" />
    <Text style={styles.confirmText}>{destinoLabel}</Text>
  </View>
  <View style={styles.confirmRow}>
    <Feather name="calendar" size={20} color="#fff" />
    <Text style={styles.confirmText}>{form.fecha}</Text>
  </View>
  <View style={styles.confirmRow}>
    <Feather name="clock" size={20} color="#fff" />
    <Text style={styles.confirmText}>
      {form.horaRecogida} → {form.horaEntrega}
    </Text>
  </View>
  {form.cargas.map((c, i) => (
    <View key={i} style={styles.confirmRow}>
      <Feather name="layers" size={20} color="#fff" />
      <Text style={styles.confirmText}>
        {c.tipo} {c.variedad} ({c.cantidad} uds, {c.peso}kg)
      </Text>
    </View>
  ))}
  <View style={styles.confirmRow}>
    <Feather name="truck" size={20} color="#fff" />
    <Text style={styles.confirmText}>
      {form.tipoTransporteLabel}
    </Text>
  </View>
</View>
);

const renderContenido = () => {
switch (paso) {
  case 0:
    return renderPaso0();
  case 1:
    return renderPaso1();
  case 2:
    return renderPaso2();
  case 3:
    return renderPaso3();
  case 4:
    return renderPaso4();
  default:
    return null;
}
};

return (
<LinearGradient
colors={['#0140CD', '#0140CD']}
style={loginStyles.container}
>
<MotiView
  from={{ opacity: 0, translateX: W }}
  animate={{ opacity: 1, translateX: 0 }}
  transition={{ type: 'timing', duration: 500 }}
  style={loginStyles.formWrapper}
>
  <View style={styles.inner}>
    {/* Stepper */}
    <View style={styles.stepper}>
      {pasos.map((_, i) => (
        <React.Fragment key={i}>
          <View
            style={[
              styles.circle,
              i <= paso && styles.circleActive,
            ]}
          >
            <Text
              style={[
                styles.circleText,
                i <= paso && styles.circleTextActive,
              ]}
            >
              {i + 1}
            </Text>
          </View>
          {i < pasos.length - 1 && (
            <View
              style={[
                styles.line,
                i < paso && styles.lineActive,
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
    <View style={styles.labels}>
      {pasos.map((l, i) => (
        <Text
          key={i}
          style={[
            styles.labelStep,
            i <= paso && styles.labelActive,
          ]}
        >
          {l}
        </Text>
      ))}
    </View>

    <ScrollView contentContainerStyle={styles.scroll}>
      {renderContenido()}
    </ScrollView>

    {/* Navegación */}
    <View style={styles.nav}>
      {paso > 0 && !loading && (
        <Pressable
          style={styles.navBtn}
          onPress={anterior}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color="#fff"
          />
          <Text style={styles.navText}>Atrás</Text>
        </Pressable>
      )}
      {paso < pasos.length - 1 && !loading && (
        <Pressable
          style={styles.navBtn}
          onPress={siguiente}
        >
          <Text style={styles.navText}>
            Siguiente
          </Text>
          <Ionicons
            name="arrow-forward"
            size={20}
            color="#fff"
          />
        </Pressable>
      )}
      {paso === pasos.length - 1 && (
        <Pressable
          style={[styles.navBtn, styles.finishBtn]}
          onPress={crearEnvio}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.navText}>
              Crear Envío
            </Text>
          )}
        </Pressable>
      )}
    </View>
  </View>
</MotiView>
</LinearGradient>
);
}

// Estilos Login
const loginStyles = StyleSheet.create({
container: { flex: 1, backgroundColor: '#0140CD' },
formWrapper: {
flex: 1,
paddingHorizontal: 24,
paddingTop:
Platform.OS === 'ios' ? 60 : 40,
justifyContent: 'center',
},
});

// Estilos generales
const styles = StyleSheet.create({
inner: { flex: 1 },
scroll: { paddingVertical: 16 },
stepper: {
flexDirection: 'row',
alignItems: 'center',
paddingHorizontal: 16,
marginBottom: 8,
},
circle: {
width: CIRCLE_DIAM,
height: CIRCLE_DIAM,
borderRadius: CIRCLE_DIAM / 2,
backgroundColor: '#ccc',
justifyContent: 'center',
alignItems: 'center',
},
circleActive: { backgroundColor: '#fff' },
circleText: { color: '#666' },
circleTextActive: { color: '#0140CD' },
line: { flex: 1, height: 4, backgroundColor: '#ccc' },
lineActive: { backgroundColor: '#fff' },
labels: {
flexDirection: 'row',
justifyContent: 'space-between',
paddingHorizontal: 16,
marginBottom: 16,
},
labelStep: { fontSize: 12, color: '#eee' },
labelActive: { color: '#fff' },

label: { fontSize: 14, color: '#fff', marginBottom: 4 },
labelWhite: {
fontSize: 14,
color: '#fff',
marginBottom: 4,
},
inputWrapper: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: '#fff',
borderRadius: 8,
padding: 12,
marginBottom: 12,
},
input: { flex: 1, marginLeft: 8, color: '#333' },
textarea: {
flex: 1,
marginLeft: 8,
color: '#333',
height: 60,
textAlignVertical: 'top',
},

map: {
width: W - 48,
height: 140,
borderRadius: 8,
marginBottom: 20,
},

card: {
backgroundColor: '#0140CD',
borderRadius: 12,
padding: 16,
marginBottom: 16,
// sombra Android
elevation: 4,
// sombra iOS
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.15,
shadowRadius: 4,
},
cardSection: {
marginBottom: 12,
paddingBottom: 12,
borderBottomWidth: 1,
borderBottomColor: '#005bb5',
},
cardTitleWhite: {
fontSize: 18,
fontWeight: '700',
marginBottom: 12,
color: '#fff',
},

twoColumns: { flexDirection: 'row' },
counterRow: {
flexDirection: 'row',
alignItems: 'center',
marginTop: 4,
},
counterBtn: {
padding: 6,
backgroundColor: '#fff',
borderRadius: 4,
},
counterText: { fontSize: 18, color: '#0140CD' },
counterValue: { marginHorizontal: 12, fontSize: 16, color: '#fff' },

buttonAdd: {
flexDirection: 'row',
alignItems: 'center',
marginTop: 8,
},
buttonAddText: {
marginLeft: 6,
color: '#fff',
fontWeight: '600',
},

modalOverlay: {
flex: 1,
backgroundColor: 'rgba(0,0,0,0.5)',
justifyContent: 'center',
alignItems: 'center',
},
modalBox: {
backgroundColor: '#fff',
borderRadius: 8,
width: '80%',
padding: 16,
},
modalTitle: {
fontSize: 18,
fontWeight: '700',
marginBottom: 12,
textAlign: 'center',
},
modalOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
modalOptionText: { fontSize: 16, color: '#333', textAlign: 'center' },
modalCancelBtn: {
marginTop: 12,
backgroundColor: '#dc3545',
borderRadius: 6,
padding: 10,
},
modalCancelText: { color: '#fff', fontWeight: '700', textAlign: 'center' },

transportRow: {
flexDirection: 'row',
justifyContent: 'space-around',
},
transportCard: {
padding: 12,
backgroundColor: 'rgba(255,255,255,0.2)',
borderRadius: 8,
},
transportIcon: { width: 80, height: 80 },
transportSelected: {
borderWidth: 2,
borderColor: '#fff',
borderRadius: 40,
},
descText: { marginTop: 8, fontSize: 14, color: '#fff', textAlign: 'center' },

confirmRow: {
flexDirection: 'row',
alignItems: 'center',
marginBottom: 8,
},
confirmText: { color: '#fff', marginLeft: 8, fontSize: 14 },

nav: {
flexDirection: 'row',
justifyContent: 'space-between',
marginTop: 16,
paddingBottom: 24,
},
navBtn: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: '#fff',
paddingVertical: 12,
paddingHorizontal: 24,
borderRadius: 24,
// sombra
elevation: 2,
shadowColor: '#000',
shadowOpacity: 0.1,
shadowOffset: { width: 0, height: 1 },
shadowRadius: 2,
},
navText: { color: '#0140CD', fontWeight: '600', marginHorizontal: 6 },
finishBtn: { backgroundColor: '#28a745' },
});
