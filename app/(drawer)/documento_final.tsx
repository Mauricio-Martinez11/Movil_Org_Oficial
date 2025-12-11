import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, Image, Alert, BackHandler } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getBackendApiBase } from '../config/api-config';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

interface DocumentoData {
  nombre_cliente: string;
  fecha_creacion: string;
  nombre_origen: string;
  nombre_destino: string;
  particion: {
    id_asignacion: number;
    recogidaEntrega: {
      fecha_recogida: string;
      hora_recogida: string;
      hora_entrega: string;
      instrucciones_recogida: string;
      instrucciones_entrega: string;
    };
    transportista: {
      nombre: string;
      apellido: string;
      telefono: string;
      ci: string;
    };
    vehiculo: {
      tipo: string;
      placa: string;
    };
    tipo_transporte: {
      nombre: string;
      descripcion: string;
    };
    cargas: Array<{
      tipo: string;
      variedad: string;
      empaquetado: string;
      cantidad: number;
      peso: number;
    }>;
    firma: string;
  };
}

const DocumentoFinal = () => {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentoData, setDocumentoData] = useState<DocumentoData | null>(null);
  const [idAsignacion, setIdAsignacion] = useState<string | null>(null);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  const cargarDocumento = useCallback(async () => {
    try {
      setLoading(true);
      // Obtener el ID de la asignación - replicando la lógica del JS original
      let asignacionId = params.idAsignacion as string || await AsyncStorage.getItem('idAsignacionSeleccionada');

      if (!asignacionId) {
        console.error('❌ No se encontró idAsignacionSeleccionada');
        setError('No se encontró el ID de la asignación');
        setLoading(false);
        return;
      }

      setIdAsignacion(asignacionId);

      // Limpiar el localStorage como en el original
      await AsyncStorage.removeItem('idAsignacionSeleccionada');

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Token no disponible');
      }

      console.log('📄 Cargando documento para asignación:', asignacionId);

      const response = await fetch(
        `${getBackendApiBase()}/envios/asignacion/${asignacionId}/documento`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data: DocumentoData = await response.json();
      console.log('✅ Documento cargado:', data);

      setDocumentoData(data);
    } catch (error) {
      console.error('❌ Error al cargar documento de partición:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar el documento');
    } finally {
      setLoading(false);
    }
  }, [params.idAsignacion]);

  // Usar useFocusEffect para recargar los datos cuando la pantalla recibe el foco
  useFocusEffect(
    useCallback(() => {
      cargarDocumento();
    }, [cargarDocumento])
  );

  const volverAParticiones = () => {
    router.replace('/documento_particiones');
  };

  // Interceptar el botón de retroceso físico
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        volverAParticiones();
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return 'Sin rellenar';
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatearHora = (hora: string | null) => {
    if (!hora) return 'Sin rellenar';
    // Si viene como HH:MM:SS
    if (hora.includes(':') && hora.length >= 5 && !hora.includes('T')) {
      return hora.substring(0, 5);
    }

    try {
      const date = new Date(hora);
      if (isNaN(date.getTime())) return hora.substring(0, 5);

      const horaFormateada = date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      return horaFormateada;
    } catch {
      return hora.slice(0, 5) || 'Sin rellenar';
    }
  };

  const descargarPDF = async () => {
    if (!documentoData) {
      Alert.alert('Error', 'No hay datos para generar el PDF');
      return;
    }

    setGenerandoPDF(true);

    try {
      const htmlContent = generarHTMLDocumento(documentoData);

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      // Renombrar el archivo y moverlo al directorio de documentos de la app
      const fileName = `documento_cliente_${documentoData.particion.id_asignacion}.pdf`;
      const newUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.moveAsync({ from: uri, to: newUri });

      // Verificar si el dispositivo puede compartir
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Guardar o compartir documento',
        });
      } else {
        Alert.alert(
          'PDF Generado',
          `El documento se ha guardado en: ${newUri}`,
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Error al generar PDF:', error);
      Alert.alert(
        'Error',
        'No se pudo generar el PDF. Por favor intenta nuevamente.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setGenerandoPDF(false);
    }
  };

  const generarHTMLDocumento = (datos: DocumentoData): string => {
    const recogidaEntrega = datos.particion.recogidaEntrega || {};
    const transportista = datos.particion.transportista || {};
    const vehiculo = datos.particion.vehiculo || {};
    const transporte = datos.particion.tipo_transporte || {};
    const cargas = datos.particion.cargas || [];

    const filasCargas = cargas.map(carga => `
      <tr>
        <td>${carga.tipo || 'Sin rellenar'}</td>
        <td>${carga.variedad || 'Sin rellenar'}</td>
        <td>${carga.empaquetado || 'Sin rellenar'}</td>
        <td>${carga.cantidad || '0'}</td>
        <td>${carga.peso || '0'} kg</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            padding: 0;
            font-size: 12px;
            line-height: 1.3;
          }
          
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          
          .header h1 {
            font-size: 20px;
            font-weight: bold;
            margin: 0 0 5px 0;
            color: #000;
          }
          
          .header p {
            margin: 0;
            color: #000;
            font-size: 12px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0px;
          }
          
          th, td {
            border: 1px solid #000;
            padding: 6px 8px;
            text-align: center;
            vertical-align: middle;
            font-size: 11px;
          }
          
          th {
            font-weight: bold;
            background-color: #fff;
          }
          
          .section-title {
            background-color: #fff;
            font-weight: bold;
            text-align: center;
          }
          
          .signature-section {
            margin-top: 40px;
            text-align: center;
            page-break-inside: avoid;
          }
          
          .signature-line {
            width: 60%;
            height: 2px;
            background-color: #000;
            margin: 20px auto 10px auto;
          }
          
          .signature-text {
            font-weight: bold;
            font-size: 12px;
            margin-top: 10px;
          }
          
          .signature-image {
            max-width: 200px;
            max-height: 60px;
            margin: 0 auto 10px auto;
            display: block;
          }
        </style>
      </head>
      <body>
        <!-- Encabezado -->
        <div class="header">
          <h1>Ortrack</h1>
          <p>"Documento de Envío"</p>
        </div>

        <!-- Tabla Cliente -->
        <table>
          <tr>
            <th style="width: 50%;">Nombre de cliente</th>
            <th style="width: 50%;">Fecha</th>
          </tr>
          <tr>
            <td>${datos.nombre_cliente || 'Sin rellenar'}</td>
            <td>${formatearFecha(datos.fecha_creacion)}</td>
          </tr>
        </table>

        <!-- Tabla Recogida/Entrega -->
        <table>
          <tr>
            <th style="width: 50%;">Punto de recogida</th>
            <th style="width: 50%;">Punto de Entrega</th>
          </tr>
          <tr>
            <td>${datos.nombre_origen || 'Sin rellenar'}</td>
            <td>${datos.nombre_destino || 'Sin rellenar'}</td>
          </tr>
        </table>

        <!-- Detalles de Bloque de Envío -->
        <table>
          <tr>
            <th colspan="3" class="section-title">Detalles de Bloque de Envío</th>
          </tr>
          <tr>
            <th style="width: 33.33%;">Día</th>
            <th style="width: 33.33%;">Hora de Recogida</th>
            <th style="width: 33.33%;">Hora de Entrega</th>
          </tr>
          <tr>
            <td>${formatearFecha(recogidaEntrega.fecha_recogida)}</td>
            <td>${formatearHora(recogidaEntrega.hora_recogida)}</td>
            <td>${formatearHora(recogidaEntrega.hora_entrega)}</td>
          </tr>
        </table>

        <!-- Instrucciones -->
        <table>
          <tr>
            <th style="width: 50%;">Instrucciones en punto de recogida</th>
            <th style="width: 50%;">Instrucciones en punto de entrega</th>
          </tr>
          <tr>
            <td>${recogidaEntrega.instrucciones_recogida || 'Sin rellenar'}</td>
            <td>${recogidaEntrega.instrucciones_entrega || 'Sin rellenar'}</td>
          </tr>
        </table>

        <!-- Transportista -->
        <table>
          <tr>
            <th colspan="3" class="section-title">Transportista</th>
          </tr>
          <tr>
            <th style="width: 50%;">Nombre y Apellido</th>
            <th style="width: 25%;">Teléfono</th>
            <th style="width: 25%;">CI</th>
          </tr>
          <tr>
            <td>${transportista.nombre || 'Sin rellenar'} ${transportista.apellido || ''}</td>
            <td>${transportista.telefono || 'Sin rellenar'}</td>
            <td>${transportista.ci || 'Sin rellenar'}</td>
          </tr>
        </table>

        <!-- Vehículo -->
        <table>
          <tr>
            <th colspan="2" class="section-title">Vehículo</th>
          </tr>
          <tr>
            <th style="width: 50%;">Tipo</th>
            <th style="width: 50%;">Placa</th>
          </tr>
          <tr>
            <td>${vehiculo.tipo || 'Sin rellenar'}</td>
            <td>${vehiculo.placa || 'Sin rellenar'}</td>
          </tr>
        </table>

        <!-- Transporte -->
        <table>
          <tr>
            <th colspan="2" class="section-title">Transporte</th>
          </tr>
          <tr>
            <th style="width: 30%;">Tipo</th>
            <th style="width: 70%;">Descripción</th>
          </tr>
          <tr>
            <td>${transporte.nombre || 'Sin rellenar'}</td>
            <td>${transporte.descripcion || 'Sin rellenar'}</td>
          </tr>
        </table>

        <!-- Detalles de Cargamento -->
        <table>
          <tr>
            <th colspan="5" class="section-title">Detalles de Cargamento</th>
          </tr>
          <tr>
            <th style="width: 20%;">Tipo</th>
            <th style="width: 20%;">Variedad</th>
            <th style="width: 20%;">Empaquetado</th>
            <th style="width: 20%;">Cantidad</th>
            <th style="width: 20%;">Peso Kg</th>
          </tr>
          ${filasCargas}
        </table>

        <!-- Sección de Firma -->
        <div class="signature-section">
          ${datos.particion.firma ? `<img src="${datos.particion.firma}" class="signature-image" alt="Firma del Cliente">` : ''}
          <div class="signature-line"></div>
          <div class="signature-text">Firma del Cliente</div>
        </div>
      </body>
      </html>
    `;
  };

  const renderTablaBasica = (headers: string[], rows: string[][], titulo?: string, widths?: string[]) => (
    <View style={tw`mb-0`}>
      {titulo && (
        <View style={tw`bg-white border border-gray-800 border-b-0`}>
          <Text style={tw`text-center font-bold text-gray-900 py-2 px-2 text-sm`}>
            {titulo}
          </Text>
        </View>
      )}

      {/* Headers */}
      <View style={tw`flex-row bg-white border border-gray-800 border-b-0`}>
        {headers.map((header, index) => (
          <View
            key={index}
            style={tw`${widths ? widths[index] : 'flex-1'} border-r border-gray-800 ${index === headers.length - 1 ? 'border-r-0' : ''}`}
          >
            <Text style={tw`text-center font-bold text-gray-900 py-2 px-2 text-xs`}>
              {header}
            </Text>
          </View>
        ))}
      </View>

      {/* Rows */}
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={tw`flex-row bg-white border border-gray-800 ${rowIndex === rows.length - 1 ? '' : 'border-b-0'}`}>
          {row.map((cell, cellIndex) => (
            <View
              key={cellIndex}
              style={tw`${widths ? widths[cellIndex] : 'flex-1'} border-r border-gray-800 ${cellIndex === row.length - 1 ? 'border-r-0' : ''}`}
            >
              <Text style={tw`text-center text-gray-700 py-2 px-2 text-xs`}>
                {cell || 'Sin rellenar'}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color="#0140CD" />
        <Text style={tw`text-gray-600 mt-4`}>Cargando documento...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white p-4`}>
        <Ionicons name="alert-circle-outline" size={48} color="#dc3545" />
        <Text style={tw`text-red-600 text-lg mt-2 text-center`}>{error}</Text>
        <Pressable
          style={tw`mt-4 bg-blue-500 px-6 py-3 rounded-lg`}
          onPress={volverAParticiones}
        >
          <Text style={tw`text-white font-semibold`}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  if (!documentoData) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white p-4`}>
        <Text style={tw`text-gray-600 text-lg`}>No hay datos disponibles</Text>
        <Pressable
          style={tw`mt-4 bg-blue-500 px-6 py-3 rounded-lg`}
          onPress={volverAParticiones}
        >
          <Text style={tw`text-white font-semibold`}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Header Fijo */}
      <View style={tw`bg-white border-b border-gray-300 px-6 pt-12 pb-4`}>
        <View style={tw`flex-row items-center justify-between mb-1`}>
          <Pressable
            style={tw`p-2`}
            onPress={volverAParticiones}
          >
            <Ionicons name="arrow-back" size={24} color="#212529" />
          </Pressable>

          <View style={tw`flex-1 items-center`}>
            <Text style={tw`text-lg font-medium text-[#212529]`}>
              Documentos de Clientes
            </Text>
          </View>

          <View style={tw`w-10`} />
        </View>
      </View>

      <ScrollView style={tw`flex-1`}>
        <View style={tw`max-w-6xl mx-auto bg-white m-6 p-8 rounded shadow-md`}>
          {/* Encabezado */}
          <View style={tw`items-center mb-6`}>
            <Text style={tw`text-2xl font-bold text-gray-900 mb-1`}>Ortrack</Text>
            <Text style={tw`text-gray-700 text-sm`}>"Documento de Envío"</Text>
          </View>

          {/* Tabla Cliente */}
          {renderTablaBasica(
            ['Nombre de cliente', 'Fecha'],
            [[
              documentoData.nombre_cliente || 'Sin rellenar',
              formatearFecha(documentoData.fecha_creacion)
            ]],
            undefined,
            ['flex-1', 'flex-1']
          )}

          {/* Tabla Recogida/Entrega */}
          {renderTablaBasica(
            ['Punto de recogida', 'Punto de Entrega'],
            [[
              documentoData.nombre_origen || 'Sin rellenar',
              documentoData.nombre_destino || 'Sin rellenar'
            ]],
            undefined,
            ['flex-1', 'flex-1']
          )}

          {/* Tabla Detalles de Bloque de Envío */}
          {renderTablaBasica(
            ['Día', 'Hora de Recogida', 'Hora de Entrega'],
            [[
              formatearFecha(documentoData.particion.recogidaEntrega.fecha_recogida),
              formatearHora(documentoData.particion.recogidaEntrega.hora_recogida),
              formatearHora(documentoData.particion.recogidaEntrega.hora_entrega)
            ]],
            'Detalles de Bloque de Envío',
            ['flex-1', 'flex-1', 'flex-1']
          )}

          {/* Tabla Instrucciones */}
          {renderTablaBasica(
            ['Instrucciones en punto de recogida', 'Instrucciones en punto de entrega'],
            [[
              documentoData.particion.recogidaEntrega.instrucciones_recogida || 'Sin rellenar',
              documentoData.particion.recogidaEntrega.instrucciones_entrega || 'Sin rellenar'
            ]],
            undefined,
            ['flex-1', 'flex-1']
          )}

          {/* Tabla Transportista */}
          {renderTablaBasica(
            ['Nombre y Apellido', 'Teléfono', 'CI'],
            [[
              `${documentoData.particion.transportista.nombre || 'Sin rellenar'} ${documentoData.particion.transportista.apellido || ''}`.trim(),
              documentoData.particion.transportista.telefono || 'Sin rellenar',
              documentoData.particion.transportista.ci || 'Sin rellenar'
            ]],
            'Transportista',
            ['flex-2', 'flex-1', 'flex-1']
          )}

          {/* Tabla Vehículo */}
          {renderTablaBasica(
            ['Tipo', 'Placa'],
            [[
              documentoData.particion.vehiculo.tipo || 'Sin rellenar',
              documentoData.particion.vehiculo.placa || 'Sin rellenar'
            ]],
            'Vehículo',
            ['flex-1', 'flex-1']
          )}

          {/* Tabla Transporte */}
          {renderTablaBasica(
            ['Tipo', 'Descripción'],
            [[
              documentoData.particion.tipo_transporte.nombre || 'Sin rellenar',
              documentoData.particion.tipo_transporte.descripcion || 'Sin rellenar'
            ]],
            'Transporte',
            ['flex-1', 'flex-2']
          )}

          {/* Tabla Detalles de Cargamento */}
          {renderTablaBasica(
            ['Tipo', 'Variedad', 'Empaquetado', 'Cantidad', 'Peso Kg'],
            documentoData.particion.cargas.map(carga => [
              carga.tipo || 'Sin rellenar',
              carga.variedad || 'Sin rellenar',
              carga.empaquetado || 'Sin rellenar',
              carga.cantidad?.toString() || '0',
              `${carga.peso || 0} kg`
            ]),
            'Detalles de Cargamento',
            ['flex-1', 'flex-1', 'flex-1', 'flex-1', 'flex-1']
          )}

          {/* Sección de Firma */}
          <View style={tw`items-center mt-12 mb-16`}>
            {documentoData.particion.firma && (
              <View style={tw`mb-4`}>
                <Image
                  source={{ uri: documentoData.particion.firma }}
                  style={tw`w-60 h-20`}
                  resizeMode="contain"
                />
              </View>
            )}

            {/* Línea de firma */}
            <View style={tw`w-60 border-t-2 border-black mb-3`} />
            <Text style={tw`text-sm font-semibold text-gray-800`}>
              Firma del Cliente
            </Text>
          </View>
        </View>

        {/* Botón de descarga */}
        <View style={tw`items-center my-6`}>
          <Pressable
            style={tw`${generandoPDF ? 'bg-[#007bff]' : 'bg-[#007bff]'} px-6 py-3 rounded-lg flex-row items-center ${generandoPDF ? '' : 'active:bg-blue-700'}`}
            onPress={descargarPDF}
            disabled={generandoPDF}
          >
            {generandoPDF && (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
                style={tw`mr-2`}
              />
            )}
            <Ionicons
              name="download"
              size={16}
              color="#FFFFFF"
              style={tw`mr-2`}
            />
            <Text style={tw`text-white font-bold text-center`}>
              {generandoPDF ? 'Generando PDF...' : 'Descargar PDF'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

export default DocumentoFinal;