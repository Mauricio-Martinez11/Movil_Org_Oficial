import { getBackendApiBase, getOpenRouteServiceApiKey } from '../config/api-config';

export const API_BASE = getBackendApiBase();
export const RUTA_KEY = getOpenRouteServiceApiKey();

export const tiposCarga = ['Frutas', 'Verduras', 'Granos', 'Lácteos', 'Carnes', 'Pescados', 'Otros'];

export const variedadOptions = [
  'Orgánico certificado',
  'Libre de pesticidas',
  'Comercio justo',
  'Local',
  'Importado',
  'Procesado',
  'Fresco'
];

export const empaquetadoOptions = [
  'Cajas de cartón',
  'Bolsas plásticas', 
  'Sacos de yute',
  'Contenedores refrigerados',
  'Bolsas de malla',
  'Cajas de madera',
  'Envases de vidrio',
  'Bandejas de foam',
  'Bolsas de papel'
];

export const tiposTransporte = [
  { 
    id: 1, 
    nombre: 'Refrigerado', 
    descripcion: 'Para productos que requieren temperatura controlada (0-4°C)'
  },
  { 
    id: 2, 
    nombre: 'Ventilado', 
    descripcion: 'Para productos frescos que necesitan ventilación constante'
  },
  { 
    id: 3, 
    nombre: 'Aislado', 
    descripcion: 'Para productos que requieren protección térmica sin refrigeración'
  }
];

export const transporteIcons: Record<string, any> = {
  Refrigerado: require('../../assets/ico-refrigerado.png'),
  Ventilado:   require('../../assets/ico-ventilado.png'),
  Aislado:     require('../../assets/ico-aislado.png'),
};

export const pasosLabels = ['Ubicación', 'Partición', 'Carga', 'Transporte', 'Confirmar'];

export default {
  pasosLabels,
  tiposCarga,
  variedadOptions,
  empaquetadoOptions,
  tiposTransporte,
  transporteIcons
};
