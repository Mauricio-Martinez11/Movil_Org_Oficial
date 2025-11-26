# 📚 Documentación de API - OrgTrack

## 🔐 Autenticación

La API utiliza JWT (JSON Web Tokens) para autenticación. El token debe enviarse en el header `Authorization` con el formato:
```
Authorization: Bearer {token}
```

---

## 📋 Índice

1. [Autenticación](#-autenticación-endpoints)
2. [Usuarios](#-usuarios-endpoints)
3. [Vehículos](#-vehículos-endpoints)
4. [Transportistas](#-transportistas-endpoints)
5. [Envíos](#-envíos-endpoints)
6. [Ubicaciones](#-ubicaciones-endpoints)
7. [Firmas](#-firmas-endpoints)
8. [QR Tokens](#-qr-tokens-endpoints)
9. [Tipos de Transporte](#-tipos-de-transporte-endpoints)

---

## 🔑 Autenticación Endpoints

### POST `/api/auth/register`
**Descripción:** Registrar un nuevo usuario (cliente o transportista)

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "nombre": "Juan",
  "apellido": "Pérez",
  "ci": "12345678",
  "correo": "juan@example.com",
  "contrasena": "password123",
  "telefono": "555-1234",
  "rol": "cliente"
}
```

**Campos:**
- `nombre` (requerido): Nombre del usuario
- `apellido` (requerido): Apellido del usuario
- `ci` (requerido): Cédula de identidad (único)
- `correo` (requerido): Correo electrónico (único)
- `contrasena` (requerido): Contraseña (mínimo 6 caracteres)
- `telefono` (opcional): Número de teléfono
- `rol` (opcional): Rol del usuario - `cliente` o `transportista` (por defecto: `cliente`)

**Respuesta Exitosa (201):**
```json
{
  "mensaje": "Cliente registrado correctamente",
  "usuario": {
    "id": 1,
    "correo": "juan@example.com",
    "nombre": "Juan",
    "apellido": "Pérez",
    "ci": "12345678",
    "telefono": "555-1234",
    "rol": "cliente"
  }
}
```

**Notas:**
- Si `rol` es `transportista`, se crea automáticamente el registro en la tabla `transportistas`
- El mensaje de respuesta variará según el rol: "Cliente registrado correctamente" o "Transportista registrado correctamente"
- **Importante**: Este endpoint NO permite crear usuarios con rol `admin` por seguridad. Para crear admins, usa `POST /api/usuarios` (requiere autenticación)

**Errores:**
- `400`: Todos los campos requeridos son obligatorios / El correo no es válido / La contraseña debe tener al menos 6 caracteres
- `409`: El correo ya está registrado / El CI ya está registrado
- `422`: Error de validación (campos inválidos)

---

### POST `/api/auth/login`
**Descripción:** Iniciar sesión y obtener token JWT

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "correo": "juan@example.com",
  "contrasena": "password123"
}
```

**Respuesta Exitosa (200):**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "usuario": {
    "id": 1,
    "nombre": "Juan",
    "apellido": "Pérez",
    "rol": "cliente"
  }
}
```

**Errores:**
- `400`: Todos los campos son obligatorios
- `401`: Credenciales inválidas

---

## 👥 Usuarios Endpoints

### GET `/api/usuarios`
**Descripción:** Obtener todos los usuarios

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "correo": "juan@example.com",
    "fecha_registro": "2024-01-15T10:30:00Z",
    "nombre": "Juan",
    "apellido": "Pérez",
    "ci": "12345678",
    "telefono": "555-1234",
    "rol": "cliente",
    "rol_nombre": "Cliente"
  }
]
```

---

### GET `/api/usuarios/{id}`
**Descripción:** Obtener usuario por ID

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "id": 1,
  "correo": "juan@example.com",
  "fecha_registro": "2024-01-15T10:30:00Z",
  "nombre": "Juan",
  "apellido": "Pérez",
  "ci": "12345678",
  "telefono": "555-1234",
  "rol": "cliente",
  "rol_nombre": "Cliente"
}
```

**Errores:**
- `404`: Usuario no encontrado

---

### POST `/api/usuarios`
**Descripción:** Crear nuevo usuario (requiere autenticación)

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "nombre": "María",
  "apellido": "González",
  "correo": "maria@example.com",
  "contrasena": "password123",
  "ci": "87654321",
  "telefono": "555-5678",
  "rol": "cliente"
}
```

**Campos:**
- `nombre` (requerido): Nombre del usuario
- `apellido` (requerido): Apellido del usuario
- `correo` (requerido): Correo electrónico (único)
- `contrasena` (requerido): Contraseña (mínimo 6 caracteres)
- `ci` (requerido): Cédula de identidad (único)
- `telefono` (opcional): Número de teléfono
- `rol` (requerido): Rol del usuario - `cliente`, `transportista` o `admin`

**Respuesta Exitosa (201):**
```json
{
  "mensaje": "Usuario creado correctamente",
  "usuario": {
    "id": 2,
    "correo": "maria@example.com",
    "nombre": "María",
    "apellido": "González",
    "rol": "cliente"
  }
}
```

**Notas:**
- Este endpoint permite crear usuarios con cualquier rol, incluyendo `admin`
- Si el rol es `transportista`, se crea automáticamente el registro en la tabla `transportistas`
- Si el rol es `admin`, se crea automáticamente el registro en la tabla `admin` con `nivel_acceso: 1`
- **Importante**: El registro público (`POST /api/auth/register`) NO permite crear usuarios `admin` por seguridad

**Errores:**
- `422`: Datos de validación incorrectos
- `409`: El correo o CI ya está registrado

---

### PUT `/api/usuarios/{id}`
**Descripción:** Editar usuario

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "nombre": "María",
  "apellido": "González",
  "correo": "maria.nueva@example.com",
  "ci": "87654321",
  "telefono": "555-9999",
  "rol": "cliente"
}
```

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "Usuario actualizado correctamente"
}
```

**Errores:**
- `404`: Usuario no encontrado
- `422`: Datos de validación incorrectos

---

### DELETE `/api/usuarios/{id}`
**Descripción:** Eliminar usuario

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "Usuario eliminado correctamente"
}
```

**Errores:**
- `404`: Usuario no encontrado

---

### GET `/api/usuarios/clientes`
**Descripción:** Obtener todos los clientes

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "nombre": "Juan",
    "apellido": "Pérez",
    "correo": "juan@example.com"
  }
]
```

---

### GET `/api/usuarios/rol/{rol}`
**Descripción:** Obtener usuarios por rol

**Parámetros:**
- `rol`: `cliente`, `transportista`, o `admin`

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "nombre": "Juan",
    "apellido": "Pérez",
    "correo": "juan@example.com",
    "rol": "cliente",
    "fecha_registro": "2024-01-15T10:30:00Z"
  }
]
```

---

### PUT `/api/usuarios/{id}/cambiar-rol`
**Descripción:** Cambiar rol de usuario

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "rol": "transportista"
}
```

**Campos:**
- `rol` (requerido): Nuevo rol del usuario - `cliente`, `transportista` o `admin`

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "Rol actualizado correctamente",
  "usuario": {
    "id": 1,
    "nombre": "Juan",
    "apellido": "Pérez",
    "correo": "juan@example.com",
    "rol": "transportista",
    "rol_anterior": "cliente"
  }
}
```

**Notas:**
- Si cambias a `transportista`: se crea automáticamente el registro en `transportistas` si no existe
- Si cambias a `admin`: se crea automáticamente el registro en `admin` con `nivel_acceso: 1` si no existe
- Si cambias desde `transportista` a otro rol: se elimina el registro de `transportistas`
- Si cambias desde `admin` a otro rol: se elimina el registro de `admin`

**Errores:**
- `404`: Usuario no encontrado
- `422`: Rol no válido (debe ser: `cliente`, `transportista` o `admin`)

---

## 🚗 Vehículos Endpoints

### GET `/api/vehiculos`
**Descripción:** Obtener todos los vehículos

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "tipo": "Pesado - Refrigerado",
    "placa": "ABC-123",
    "capacidad": 5000.00,
    "estado": "Disponible",
    "tipo_transporte": {
      "id": 1,
      "nombre": "Refrigerado",
      "descripcion": "Transporte con temperatura controlada"
    },
    "fecha_registro": "2024-01-15T10:30:00Z"
  }
]
```

---

### GET `/api/vehiculos/{id}`
**Descripción:** Obtener vehículo por ID

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "id": 1,
  "tipo": "Pesado - Refrigerado",
  "placa": "ABC-123",
  "capacidad": 5000.00,
  "estado": "Disponible",
  "tipo_transporte": {
    "id": 1,
    "nombre": "Refrigerado",
    "descripcion": "Transporte con temperatura controlada"
  },
  "fecha_registro": "2024-01-15T10:30:00Z"
}
```

**Errores:**
- `404`: Vehículo no encontrado

---

### POST `/api/vehiculos`
**Descripción:** Crear nuevo vehículo con su tipo de transporte

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "id_tipo_vehiculo": 1,
  "id_tipo_transporte": 1,
  "placa": "XYZ-789",
  "capacidad": 3000.00
}
```

**Campos:**
- `id_tipo_vehiculo` (requerido): ID del tipo de vehículo (Pesado, Mediano, etc.)
- `id_tipo_transporte` (requerido): ID del tipo de transporte (Refrigerado, Aislado, Ventilado, etc.)
- `placa` (requerido): Placa del vehículo (única)
- `capacidad` (requerido): Capacidad del vehículo en kg

**Respuesta Exitosa (201):**
```json
{
  "mensaje": "Vehículo creado correctamente",
  "data": {
    "id": 2,
    "tipo": "Pesado - Refrigerado",
    "placa": "XYZ-789",
    "capacidad": 3000.00,
    "estado": "Disponible",
    "tipo_transporte": {
      "id": 1,
      "nombre": "Refrigerado",
      "descripcion": "Transporte con temperatura controlada"
    }
  }
}
```

**Errores:**
- `422`: Datos de validación incorrectos
- `409`: La placa ya está registrada

---

### PUT `/api/vehiculos/{id}`
**Descripción:** Actualizar vehículo

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "id_tipo_vehiculo": 2,
  "id_tipo_transporte": 2,
  "placa": "XYZ-789",
  "capacidad": 3500.00
}
```

**Campos:**
- `id_tipo_vehiculo` (opcional): ID del tipo de vehículo
- `id_tipo_transporte` (opcional): ID del tipo de transporte
- `placa` (opcional): Placa del vehículo
- `capacidad` (opcional): Capacidad del vehículo en kg

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "Vehículo actualizado correctamente",
  "data": {
    "id": 2,
    "tipo": "Mediano - Aislado",
    "placa": "XYZ-789",
    "capacidad": 3500.00,
    "estado": "Disponible",
    "tipo_transporte": {
      "id": 2,
      "nombre": "Aislado",
      "descripcion": "Transporte con aislamiento térmico"
    }
  }
}
```

**Errores:**
- `400`: No se puede modificar un vehículo que está en ruta
- `404`: Vehículo no encontrado
- `422`: Datos de validación incorrectos

---

### DELETE `/api/vehiculos/{id}`
**Descripción:** Eliminar vehículo

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "Vehículo eliminado correctamente"
}
```

**Errores:**
- `400`: No se puede eliminar un vehículo que está en ruta
- `404`: Vehículo no encontrado

---

## 🚛 Transportistas Endpoints

### GET `/api/transportistas`
**Descripción:** Obtener todos los transportistas

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "id_usuario": 2,
    "ci": "12345678",
    "telefono": "555-1234",
    "estado": "Disponible",
    "fecha_registro": "2024-01-15T10:30:00Z",
    "nombre": "Carlos",
    "apellido": "López",
    "correo": "carlos@example.com"
  }
]
```

**Notas:**
- Los campos `ci` y `telefono` se obtienen desde la tabla `persona` relacionada con el usuario
- El campo `id_usuario` permite relacionar directamente el transportista con su usuario

---

### GET `/api/transportistas/{id}`
**Descripción:** Obtener transportista por ID

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "id": 1,
  "id_usuario": 2,
  "ci": "12345678",
  "telefono": "555-1234",
  "estado": "Disponible",
  "fecha_registro": "2024-01-15T10:30:00Z",
  "usuario": {
    "id": 2,
    "correo": "carlos@example.com",
    "nombre": "Carlos",
    "apellido": "López",
    "rol": "transportista"
  }
}
```

**Notas:**
- Los campos `ci` y `telefono` se obtienen desde la tabla `persona` relacionada con el usuario
- El campo `id_usuario` permite relacionar directamente el transportista con su usuario

**Errores:**
- `404`: Transportista no encontrado

---

### POST `/api/transportistas`
**Descripción:** Crear transportista a partir de un usuario existente

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "id_usuario": 5
}
```

**Campos:**
- `id_usuario` (requerido): ID del usuario que se convertirá en transportista

**Respuesta Exitosa (201):**
```json
{
  "mensaje": "Transportista creado correctamente",
  "transportista": {
    "id": 2,
    "id_usuario": 5,
    "id_estado_transportista": 1,
    "fecha_registro": "2024-01-15T10:30:00Z"
  }
}
```

**Errores:**
- `404`: Usuario no encontrado
- `409`: Ya existe un transportista para ese usuario
- `422`: Datos de validación incorrectos

**Notas:**
- El rol del usuario se actualiza automáticamente a `transportista`
- Los datos de CI y teléfono se obtienen desde la tabla `persona` relacionada con el usuario

---

### PUT `/api/transportistas/{id}`
**Descripción:** Editar transportista

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{}
```

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "Transportista actualizado correctamente",
  "nota": "Los datos de CI y teléfono se editan desde el endpoint de usuarios"
}
```

**Errores:**
- `400`: No se puede editar un transportista que está en ruta
- `404`: Transportista no encontrado
- `422`: Datos de validación incorrectos

**Notas:**
- Los datos de CI y teléfono se editan desde `PUT /api/usuarios/{id}` ya que están almacenados en la tabla `persona`
- Este endpoint está preparado para futuras actualizaciones (ej: estado del transportista)

---

### DELETE `/api/transportistas/{id}`
**Descripción:** Eliminar transportista

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "Transportista y usuario eliminados correctamente"
}
```

**Errores:**
- `400`: No se puede eliminar un transportista que está en ruta
- `404`: Transportista no encontrado

---

### POST `/api/transportistas/completo`
**Descripción:** Crear transportista completo (usuario + transportista)

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "usuario": {
    "nombre": "Carlos",
    "apellido": "López",
    "ci": "12345678",
    "correo": "carlos@example.com",
    "contrasena": "password123",
    "telefono": "555-1234"
  }
}
```

**Campos:**
- `usuario.nombre` (requerido): Nombre del transportista
- `usuario.apellido` (requerido): Apellido del transportista
- `usuario.ci` (requerido): Cédula de identidad (único)
- `usuario.correo` (requerido): Correo electrónico (único)
- `usuario.contrasena` (requerido): Contraseña (mínimo 6 caracteres)
- `usuario.telefono` (opcional): Número de teléfono

**Respuesta Exitosa (201):**
```json
{
  "mensaje": "Transportista creado correctamente",
  "transportista": {
    "id": 1,
    "id_usuario": 2,
    "id_estado_transportista": 1,
    "fecha_registro": "2024-01-15T10:30:00Z"
  }
}
```

**Errores:**
- `409`: Ya existe un usuario con ese CI o correo
- `422`: Datos de validación incorrectos

**Notas:**
- Crea automáticamente: persona, usuario con rol `transportista`, y registro en transportistas
- Los datos de CI y teléfono se almacenan en la tabla `persona`, no en `transportistas`

---

### GET `/api/transportistas/estado/{estado}`
**Descripción:** Obtener transportistas por estado

**Parámetros:**
- `estado`: `Disponible`, `No Disponible`, `En ruta`, `Inactivo`

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "id_usuario": 2,
    "ci": "12345678",
    "telefono": "555-1234",
    "estado": "Disponible",
    "fecha_registro": "2024-01-15T10:30:00Z",
    "nombre": "Carlos",
    "apellido": "López",
    "correo": "carlos@example.com"
  }
]
```

**Notas:**
- Los campos `ci` y `telefono` se obtienen desde la tabla `persona` relacionada con el usuario
- El campo `id_usuario` permite relacionar directamente el transportista con su usuario

**Errores:**
- `400`: Estado no válido

---

### GET `/api/transportistas/disponibles`
**Descripción:** Obtener transportistas disponibles

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "id_usuario": 2,
    "ci": "12345678",
    "telefono": "555-1234",
    "estado": "Disponible",
    "fecha_registro": "2024-01-15T10:30:00Z",
    "nombre": "Carlos",
    "apellido": "López",
    "correo": "carlos@example.com"
  }
]
```

**Notas:**
- Los campos `ci` y `telefono` se obtienen desde la tabla `persona` relacionada con el usuario
- El campo `id_usuario` permite relacionar directamente el transportista con su usuario

---

## 📦 Envíos Endpoints

### POST `/api/envios/completo`
**Descripción:** Crear envío completo con particiones (Cliente)

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "id_direccion": 1,
  "particiones": [
    {
      "cargas": [
        {
          "tipo": "Frutas",
          "variedad": "Manzanas",
          "cantidad": 100,
          "empaquetado": "Cajas",
          "peso": 500.50
        }
      ],
      "recogidaEntrega": {
        "fecha_recogida": "2024-01-20",
        "hora_recogida": "08:00:00",
        "hora_entrega": "16:00:00",
        "instrucciones_recogida": "Llamar antes de llegar",
        "instrucciones_entrega": "Entregar en recepción"
      },
      "id_tipo_transporte": 1
    }
  ]
}
```

**Respuesta Exitosa (201):**
```json
{
  "mensaje": "Envío creado exitosamente para el cliente",
  "id_envio": 1
}
```

**Errores:**
- `400`: Faltan datos para crear el envío / La dirección no existe
- `401`: No autorizado

---

### POST `/api/envios/completo-admin`
**Descripción:** Crear envío completo con particiones y asignaciones (Admin)

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "id_usuario_cliente": 1,
  "ubicacion": {
    "nombreorigen": "Almacén Central",
    "origen_lng": -63.1811,
    "origen_lat": -17.8146,
    "nombredestino": "Tienda Norte",
    "destino_lng": -63.1911,
    "destino_lat": -17.8246,
    "rutageojson": "{...}"
  },
  "particiones": [
    {
      "cargas": [
        {
          "tipo": "Frutas",
          "variedad": "Manzanas",
          "cantidad": 100,
          "empaquetado": "Cajas",
          "peso": 500.50
        }
      ],
      "recogidaEntrega": {
        "fecha_recogida": "2024-01-20",
        "hora_recogida": "08:00:00",
        "hora_entrega": "16:00:00",
        "instrucciones_recogida": "Llamar antes de llegar",
        "instrucciones_entrega": "Entregar en recepción"
      },
      "id_tipo_transporte": 1,
      "id_transportista": 1,
      "id_vehiculo": 1
    }
  ]
}
```

**Respuesta Exitosa (201):**
```json
{
  "mensaje": "Envío creado con múltiples particiones, cargas y asignaciones",
  "id_envio": 1,
  "id_direccion": 1
}
```

**Errores:**
- `400`: Transportista o vehículo no disponible
- `422`: Datos de validación incorrectos

---

### GET `/api/envios`
**Descripción:** Obtener todos los envíos (admin ve todos, cliente solo los suyos)

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "id_usuario": 1,
    "estado": "Pendiente",
    "fecha_creacion": "2024-01-15T10:30:00Z",
    "fecha_inicio": null,
    "fecha_entrega": null,
    "id_direccion": 1,
    "usuario": {
      "id": 1,
      "nombre": "Juan",
      "apellido": "Pérez",
      "rol": "cliente"
    },
    "nombre_origen": "Almacén Central",
    "nombre_destino": "Tienda Norte",
    "particiones": []
  }
]
```

---

### GET `/api/envios/{id}`
**Descripción:** Obtener envío por ID con detalles completos

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "id": 1,
  "id_usuario": 1,
  "fecha_creacion": "2024-01-15T10:30:00Z",
  "fecha_inicio": null,
  "fecha_entrega": null,
  "id_direccion": 1,
  "coordenadas_origen": {
    "lng": -63.1811,
    "lat": -17.8146
  },
  "coordenadas_destino": {
    "lng": -63.1911,
    "lat": -17.8246
  },
  "nombre_origen": "Almacén Central",
  "nombre_destino": "Tienda Norte",
  "rutaGeoJSON": "{...}",
  "particiones": [
    {
      "id_asignacion": 1,
      "estado": "Pendiente",
      "fecha_asignacion": "2024-01-15T10:30:00Z",
      "fecha_inicio": null,
      "fecha_fin": null,
      "transportista": {
        "nombre": null,
        "apellido": null,
        "telefono": "555-1234",
        "ci": "12345678"
      },
      "vehiculo": {
        "placa": "ABC-123",
        "tipo": "Pesado - Refrigerado"
      },
      "tipoTransporte": {
        "nombre": "Refrigerado",
        "descripcion": "Transporte con temperatura controlada"
      },
      "recogidaEntrega": {
        "fecha_recogida": "2024-01-20",
        "hora_recogida": "08:00:00",
        "hora_entrega": "16:00:00",
        "instrucciones_recogida": "Llamar antes de llegar",
        "instrucciones_entrega": "Entregar en recepción"
      },
      "cargas": [
        {
          "id": 1,
          "tipo": "Frutas",
          "variedad": "Manzanas",
          "empaquetado": "Cajas",
          "cantidad": 100,
          "peso": 500.50
        }
      ]
    }
  ],
  "estado_resumen": "En curso (1 de 1 camiones activos)"
}
```

**Errores:**
- `403`: No tienes permiso para ver este envío
- `404`: Envío no encontrado

---

### GET `/api/envios/mis-envios`
**Descripción:** Obtener mis envíos (cliente o admin)

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "id_usuario": 1,
    "estado": "Pendiente",
    "fecha_creacion": "2024-01-15T10:30:00Z",
    "nombre_origen": "Almacén Central",
    "nombre_destino": "Tienda Norte",
    "particiones": [
      {
        "id_asignacion": 1,
        "estado": "Pendiente",
        "fecha_asignacion": "2024-01-15T10:30:00Z",
        "fecha_inicio": null,
        "fecha_fin": null,
        "transportista": {
          "nombre": null,
          "apellido": null,
          "ci": "12345678",
          "telefono": "555-1234"
        },
        "vehiculo": {
          "placa": "ABC-123",
          "tipo": "Pesado - Refrigerado"
        },
        "tipoTransporte": {
          "nombre": "Refrigerado",
          "descripcion": "Transporte con temperatura controlada"
        },
        "recogidaEntrega": {
          "fecha_recogida": "2024-01-20",
          "hora_recogida": "08:00:00",
          "hora_entrega": "16:00:00",
          "instrucciones_recogida": "Llamar antes de llegar",
          "instrucciones_entrega": "Entregar en recepción"
        },
        "cargas": [
          {
            "id": 1,
            "tipo": "Frutas",
            "variedad": "Manzanas",
            "empaquetado": "Cajas",
            "cantidad": 100,
            "peso": 500.50
          }
        ]
      }
    ]
  }
]
```

---

### GET `/api/envios/transportista/asignados`
**Descripción:** Obtener envíos asignados al transportista autenticado

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id_asignacion": 1,
    "estado": "Pendiente",
    "fecha_inicio": null,
    "fecha_fin": null,
    "fecha_asignacion": "2024-01-15T10:30:00Z",
    "id_envio": 1,
    "id_vehiculo": 1,
    "id_recogida_entrega": 1,
    "id_tipo_transporte": 1,
    "estado_envio": "Pendiente",
    "fecha_creacion": "2024-01-15T10:30:00Z",
    "id_usuario": 1,
    "id_ubicacion_mongo": 1,
    "placa": "ABC-123",
    "tipo_vehiculo": "Pesado - Refrigerado",
    "tipo_transporte": "Refrigerado",
    "descripcion_transporte": "Transporte con temperatura controlada",
    "nombre_cliente": "Juan",
    "apellido_cliente": "Pérez",
    "nombre_origen": "Almacén Central",
    "nombre_destino": "Tienda Norte",
    "coordenadas_origen": {
      "lng": -63.1811,
      "lat": -17.8146
    },
    "coordenadas_destino": {
      "lng": -63.1911,
      "lat": -17.8246
    },
    "rutaGeoJSON": "{...}",
    "cargas": [
      {
        "id": 1,
        "tipo": "Frutas",
        "variedad": "Manzanas",
        "empaquetado": "Cajas",
        "cantidad": 100,
        "peso": 500.50
      }
    ],
    "recogidaEntrega": {
      "fecha_recogida": "2024-01-20",
      "hora_recogida": "08:00:00",
      "hora_entrega": "16:00:00",
      "instrucciones_recogida": "Llamar antes de llegar",
      "instrucciones_entrega": "Entregar en recepción"
    }
  }
]
```

**Errores:**
- `404`: No eres un transportista válido

---

### GET `/api/envios/particiones/en-curso`
**Descripción:** Obtener particiones en curso del cliente

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id_asignacion": 1,
    "estado": "En curso",
    "fecha_asignacion": "2024-01-15T10:30:00Z",
    "fecha_inicio": "2024-01-20T08:00:00Z",
    "nombre_origen": "Almacén Central",
    "nombre_destino": "Tienda Norte",
    "vehiculo": {
      "placa": "ABC-123",
      "tipo": "Pesado - Refrigerado"
    },
    "tipoTransporte": {
      "nombre": "Refrigerado",
      "descripcion": "Transporte con temperatura controlada"
    },
    "recogidaEntrega": {
      "fecha_recogida": "2024-01-20",
      "hora_recogida": "08:00:00",
      "hora_entrega": "16:00:00",
      "instrucciones_recogida": "Llamar antes de llegar",
      "instrucciones_entrega": "Entregar en recepción"
    },
    "cargas": [
      {
        "id": 1,
        "tipo": "Frutas",
        "variedad": "Manzanas",
        "empaquetado": "Cajas",
        "cantidad": 100,
        "peso": 500.50
      }
    ]
  }
]
```

**Errores:**
- `403`: Solo los clientes pueden ver sus particiones en curso

---

### PUT `/api/envios/asignacion/{id_asignacion}/asignar`
**Descripción:** Asignar transportista y vehículo a una partición existente

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "id_transportista": 1,
  "id_vehiculo": 1
}
```

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "Transportista y vehículo asignados correctamente a la partición"
}
```

**Errores:**
- `400`: Transportista o vehículo no disponible / Partición ya completada
- `404`: Partición no encontrada

---

### POST `/api/envios/asignacion/{id_asignacion}/iniciar`
**Descripción:** Iniciar viaje (transportista) - Genera QR automáticamente

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "Viaje iniciado correctamente para esta asignación",
  "id_asignacion": 1,
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "imagenQR": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "fecha_creacion": "2024-01-20T08:00:00Z"
}
```

**Errores:**
- `400`: Debes completar el checklist antes de iniciar el viaje
- `403`: Solo los transportistas pueden iniciar el viaje / No tienes acceso

---

### POST `/api/envios/asignacion/{id_asignacion}/finalizar`
**Descripción:** Finalizar envío (transportista)

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "Asignación finalizada correctamente"
}
```

**Errores:**
- `400`: Debes completar el checklist de incidentes / Debes capturar las firmas
- `403`: No tienes permiso para finalizar esta asignación

---

### POST `/api/envios/asignacion/{id_asignacion}/checklist-condiciones`
**Descripción:** Registrar checklist de condiciones antes de iniciar viaje

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "condiciones": [
    {
      "id_condicion": 1,
      "valor": true,
      "comentario": "Todo en orden"
    },
    {
      "id_condicion": 2,
      "valor": false,
      "comentario": "Falta verificar temperatura"
    }
  ],
  "observaciones": "Vehículo en buen estado general"
}
```

**Respuesta Exitosa (201):**
```json
{
  "mensaje": "Checklist de condiciones registrado correctamente"
}
```

**Errores:**
- `400`: El checklist solo se puede registrar si la asignación está pendiente / Ya fue registrado
- `403`: No tienes permiso para esta asignación
- `422`: Datos de validación incorrectos

---

### POST `/api/envios/asignacion/{id_asignacion}/checklist-incidentes`
**Descripción:** Registrar checklist de incidentes luego de iniciar el viaje

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "incidentes": [
    {
      "id_tipo_incidente": 1,
      "descripcion_incidente": "Retraso por tráfico pesado"
    },
    {
      "id_tipo_incidente": 2,
      "descripcion_incidente": "Problema menor con el vehículo"
    }
  ]
}
```

**Respuesta Exitosa (201):**
```json
{
  "mensaje": "Checklist de incidentes registrado correctamente"
}
```

**Errores:**
- `400`: Solo puedes registrar el checklist si el viaje está en curso
- `403`: No tienes permiso para esta asignación
- `422`: Datos de validación incorrectos

---

### PUT `/api/envios/{id_envio}/asignar`
**Descripción:** Asignar transportista y vehículo a un envío (método original)

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "id_transportista": 1,
  "id_vehiculo": 1,
  "carga": {
    "tipo": "Frutas",
    "variedad": "Manzanas",
    "cantidad": 100,
    "empaquetado": "Cajas",
    "peso": 500.50
  },
  "recogidaEntrega": {
    "fecha_recogida": "2024-01-20",
    "hora_recogida": "08:00:00",
    "hora_entrega": "16:00:00",
    "instrucciones_recogida": "Llamar antes de llegar",
    "instrucciones_entrega": "Entregar en recepción"
  },
  "id_tipo_transporte": 1
}
```

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "Asignación registrada correctamente con carga y detalles completos"
}
```

**Errores:**
- `400`: Transportista o vehículo no disponible / Envío ya completado
- `404`: Envío no encontrado
- `422`: Datos de validación incorrectos

---

### PUT `/api/envios/{id_envio}/estado-global`
**Descripción:** Actualizar estado global del envío (solo admin)

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "Estado global del envío actualizado correctamente"
}
```

**Errores:**
- `403`: Solo los administradores pueden actualizar el estado global
- `404`: Envío no encontrado

---

### GET `/api/envios/{id_envio}/documento`
**Descripción:** Generar documento de envío completo (solo cuando está completamente entregado)

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "id_envio": 1,
  "nombre_cliente": "Juan Pérez",
  "estado": "Entregado",
  "fecha_creacion": "2024-01-15T10:30:00Z",
  "fecha_inicio": "2024-01-20T08:00:00Z",
  "fecha_entrega": "2024-01-20T16:00:00Z",
  "nombre_origen": "Almacén Central",
  "nombre_destino": "Tienda Norte",
  "particiones": [
    {
      "id_asignacion": 1,
      "estado": "Entregado",
      "fecha_asignacion": "2024-01-15T10:30:00Z",
      "fecha_inicio": "2024-01-20T08:00:00Z",
      "fecha_fin": "2024-01-20T16:00:00Z",
      "transportista": {
        "nombre": null,
        "apellido": null,
        "telefono": "555-1234",
        "ci": "12345678"
      },
      "vehiculo": {
        "placa": "ABC-123",
        "tipo": "Pesado - Refrigerado"
      },
      "tipo_transporte": {
        "nombre": "Refrigerado",
        "descripcion": "Transporte con temperatura controlada"
      },
      "recogidaEntrega": {
        "fecha_recogida": "2024-01-20",
        "hora_recogida": "08:00:00",
        "hora_entrega": "16:00:00",
        "instrucciones_recogida": "Llamar antes de llegar",
        "instrucciones_entrega": "Entregar en recepción"
      },
      "cargas": [
        {
          "id": 1,
          "tipo": "Frutas",
          "variedad": "Manzanas",
          "empaquetado": "Cajas",
          "cantidad": 100,
          "peso": 500.50
        }
      ],
      "firmaTransportista": "data:image/png;base64,...",
      "firma": "data:image/png;base64,...",
      "checklistCondiciones": [...],
      "checklistIncidentes": [...]
    }
  ]
}
```

**Errores:**
- `400`: El documento solo se puede generar cuando el envío esté completamente entregado
- `403`: No tienes acceso a este envío
- `404`: Envío no encontrado

**Notas:**
- Los checklists solo se incluyen si el usuario es admin

---

### GET `/api/envios/asignacion/{id_asignacion}/documento`
**Descripción:** Generar documento de partición específica

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "id_envio": 1,
  "nombre_cliente": "Juan Pérez",
  "estado_envio": "Entregado",
  "fecha_creacion": "2024-01-15T10:30:00Z",
  "fecha_inicio": "2024-01-20T08:00:00Z",
  "fecha_entrega": "2024-01-20T16:00:00Z",
  "nombre_origen": "Almacén Central",
  "nombre_destino": "Tienda Norte",
  "particion": {
    "id_asignacion": 1,
    "estado": "Entregado",
    "fecha_asignacion": "2024-01-15T10:30:00Z",
    "fecha_inicio": "2024-01-20T08:00:00Z",
    "fecha_fin": "2024-01-20T16:00:00Z",
    "transportista": {
      "nombre": null,
      "apellido": null,
      "telefono": "555-1234",
      "ci": "12345678"
    },
    "vehiculo": {
      "placa": "ABC-123",
      "tipo": "Pesado - Refrigerado"
    },
    "tipo_transporte": {
      "nombre": "Refrigerado",
      "descripcion": "Transporte con temperatura controlada"
    },
    "recogidaEntrega": {
      "fecha_recogida": "2024-01-20",
      "hora_recogida": "08:00:00",
      "hora_entrega": "16:00:00",
      "instrucciones_recogida": "Llamar antes de llegar",
      "instrucciones_entrega": "Entregar en recepción"
    },
    "cargas": [
      {
        "id": 1,
        "tipo": "Frutas",
        "variedad": "Manzanas",
        "empaquetado": "Cajas",
        "cantidad": 100,
        "peso": 500.50
      }
    ],
    "firma": "data:image/png;base64,...",
    "firma_transportista": "data:image/png;base64,...",
    "checklistCondiciones": [...],
    "checklistIncidentes": [...]
  }
}
```

**Errores:**
- `403`: No tienes acceso a esta asignación
- `404`: Asignación no encontrada

**Notas:**
- Los checklists solo se incluyen si el usuario es admin

---

## 📍 Ubicaciones Endpoints

### GET `/api/ubicaciones`
**Descripción:** Obtener todas las ubicaciones del usuario autenticado

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "nombreorigen": "Almacén Central",
    "origen_lng": -63.1811,
    "origen_lat": -17.8146,
    "nombredestino": "Tienda Norte",
    "destino_lng": -63.1911,
    "destino_lat": -17.8246,
    "rutageojson": "{...}",
    "segmentos": [
      {
        "id": 1,
        "direccion_id": 1,
        "segmentogeojson": "{...}"
      }
    ]
  }
]
```

**Errores:**
- `401`: No autorizado

---

### GET `/api/ubicaciones/{id}`
**Descripción:** Obtener ubicación por ID

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "id": 1,
  "nombreorigen": "Almacén Central",
  "origen_lng": -63.1811,
  "origen_lat": -17.8146,
  "nombredestino": "Tienda Norte",
  "destino_lng": -63.1911,
  "destino_lat": -17.8246,
  "rutageojson": "{...}",
  "segmentos": [
    {
      "id": 1,
      "direccion_id": 1,
      "segmentogeojson": "{...}"
    }
  ]
}
```

**Errores:**
- `401`: No autorizado
- `404`: Dirección no encontrada o no autorizada

---

### POST `/api/ubicaciones`
**Descripción:** Crear nueva ubicación

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "nombreOrigen": "Almacén Central",
  "origen_lng": -63.1811,
  "origen_lat": -17.8146,
  "nombreDestino": "Tienda Norte",
  "destino_lng": -63.1911,
  "destino_lat": -17.8246,
  "rutaGeoJSON": "{...}",
  "segmentos": [
    {
      "segmentogeojson": "{...}"
    }
  ]
}
```

**Respuesta Exitosa (201):**
```json
{
  "id": 1,
  "nombreorigen": "Almacén Central",
  "origen_lng": -63.1811,
  "origen_lat": -17.8146,
  "nombredestino": "Tienda Norte",
  "destino_lng": -63.1911,
  "destino_lat": -17.8246,
  "rutageojson": "{...}"
}
```

**Errores:**
- `401`: No autorizado
- `422`: Datos de validación incorrectos

---

### PUT `/api/ubicaciones/{id}`
**Descripción:** Actualizar ubicación

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "nombreOrigen": "Almacén Central Actualizado",
  "origen_lng": -63.1811,
  "origen_lat": -17.8146,
  "nombreDestino": "Tienda Norte Actualizada",
  "destino_lng": -63.1911,
  "destino_lat": -17.8246,
  "rutaGeoJSON": "{...}"
}
```

**Respuesta Exitosa (200):**
```json
{
  "id": 1,
  "nombreorigen": "Almacén Central Actualizado",
  "origen_lng": -63.1811,
  "origen_lat": -17.8146,
  "nombredestino": "Tienda Norte Actualizada",
  "destino_lng": -63.1911,
  "destino_lat": -17.8246,
  "rutageojson": "{...}"
}
```

**Errores:**
- `401`: No autorizado
- `404`: Dirección no encontrada o no autorizada
- `422`: Datos de validación incorrectos

---

### DELETE `/api/ubicaciones/{id}`
**Descripción:** Eliminar ubicación

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Dirección eliminada correctamente"
}
```

**Errores:**
- `400`: Esta dirección está en uso por un envío activo y no puede eliminarse
- `401`: No autorizado
- `404`: Dirección no encontrada o no autorizada

---

## ✍️ Firmas Endpoints

### POST `/api/firmas/envio/{id_asignacion}`
**Descripción:** Guardar firma de envío (cliente)

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "imagenFirma": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Respuesta Exitosa (201):**
```json
{
  "mensaje": "Firma guardada correctamente",
  "id_asignacion": 1
}
```

**Errores:**
- `400`: Ya existe una firma para esta asignación
- `404`: Asignación no encontrada
- `422`: Datos de validación incorrectos

---

### POST `/api/firmas/transportista/{id_asignacion}`
**Descripción:** Guardar firma de transportista

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "imagenFirma": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Respuesta Exitosa (201):**
```json
{
  "mensaje": "Firma de transportista guardada correctamente",
  "id_asignacion": 1
}
```

**Errores:**
- `400`: Ya existe una firma de transportista para esta asignación
- `404`: Asignación no encontrada
- `422`: Datos de validación incorrectos

---

### GET `/api/firmas/envio/{id_asignacion}`
**Descripción:** Obtener firma de envío

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "id_asignacion": 1,
  "imagenFirma": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "fechaFirma": "2024-01-20T16:00:00Z"
}
```

**Errores:**
- `404`: Firma no encontrada

---

### GET `/api/firmas/transportista/{id_asignacion}`
**Descripción:** Obtener firma de transportista

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "id_asignacion": 1,
  "imagenFirma": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "fechaFirma": "2024-01-20T16:00:00Z"
}
```

**Errores:**
- `404`: Firma de transportista no encontrada

---

### GET `/api/firmas/transportista/asignacion/{id_asignacion}`
**Descripción:** Obtener firma por asignación (método específico para transportistas)

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "id_asignacion": 1,
  "imagenFirma": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "fechaFirma": "2024-01-20T16:00:00Z"
}
```

**Errores:**
- `400`: ID de asignación inválido
- `404`: No se encontró una firma para esta asignación

---

### PUT `/api/firmas/envio/{id_asignacion}`
**Descripción:** Actualizar firma de envío

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "imagenFirma": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "Firma actualizada correctamente",
  "id_asignacion": 1
}
```

**Errores:**
- `404`: Firma no encontrada
- `422`: Datos de validación incorrectos

---

### DELETE `/api/firmas/envio/{id_asignacion}`
**Descripción:** Eliminar firma de envío

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "Firma eliminada correctamente",
  "id_asignacion": 1
}
```

**Errores:**
- `404`: Firma no encontrada

---

## 📱 QR Tokens Endpoints

### POST `/api/qr/generar/{id_asignacion}`
**Descripción:** Generar QR token para una asignación (solo transportistas)

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (201):**
```json
{
  "mensaje": "QR token generado correctamente",
  "id_asignacion": 1,
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "imagenQR": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "fecha_creacion": "2024-01-20T08:00:00Z",
  "fecha_expiracion": "2024-01-21T08:00:00Z"
}
```

**Respuesta si ya existe (200):**
```json
{
  "mensaje": "QR token ya existe para esta asignación",
  "id_asignacion": 1,
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "imagenQR": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "fecha_creacion": "2024-01-20T08:00:00Z",
  "fecha_expiracion": "2024-01-21T08:00:00Z"
}
```

**Errores:**
- `403`: Solo los transportistas pueden generar QR tokens
- `404`: Asignación no encontrada

---

### GET `/api/qr/{id_asignacion}`
**Descripción:** Obtener QR token por asignación

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "id_asignacion": 1,
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "imagenQR": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "estado": "Activo",
  "fecha_creacion": "2024-01-20T08:00:00Z",
  "fecha_expiracion": "2024-01-21T08:00:00Z"
}
```

**Errores:**
- `404`: QR token no encontrado

---

### GET `/api/qr/transportista/{id_asignacion}`
**Descripción:** Obtener QR específico para transportista (con validaciones de acceso)

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "QR encontrado correctamente",
  "id_asignacion": 1,
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "imagenQR": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "estado": "Activo",
  "fecha_creacion": "2024-01-20T08:00:00Z",
  "fecha_expiracion": "2024-01-21T08:00:00Z",
  "frontend_url": "https://orgtrackprueba.netlify.app/validar-qr/550e8400-e29b-41d4-a716-446655440000"
}
```

**Errores:**
- `403`: Solo los transportistas pueden ver los QR / No tienes acceso a esta asignación
- `404`: QR no encontrado para esta asignación

---

### POST `/api/qr/validar`
**Descripción:** Validar y usar QR token

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "Token QR válido",
  "valido": true,
  "asignacion": {
    "id_asignacion": 1,
    "estado": "En curso",
    "cliente": {
      "nombre": "Juan",
      "apellido": "Pérez"
    },
    "origen": "Almacén Central",
    "destino": "Tienda Norte",
    "vehiculo": {
      "placa": "ABC-123",
      "tipo": "Pesado - Refrigerado"
    },
    "transportista": {
      "ci": "12345678",
      "telefono": "555-1234"
    }
  }
}
```

**Errores:**
- `400`: Token QR expirado / Token QR ya fue utilizado
- `404`: Token QR no válido

---

### GET `/api/qr/cliente/tokens`
**Descripción:** Obtener QR tokens por cliente

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id_asignacion": 1,
    "token": "550e8400-e29b-41d4-a716-446655440000",
    "imagenQR": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "estado": "Activo",
    "fecha_creacion": "2024-01-20T08:00:00Z",
    "fecha_expiracion": "2024-01-21T08:00:00Z",
    "asignacion": {
      "estado": "En curso",
      "estado_envio": "En curso",
      "vehiculo": {
        "placa": "ABC-123",
        "tipo": "Pesado - Refrigerado"
      },
      "transportista": {
        "ci": "12345678",
        "telefono": "555-1234"
      }
    }
  }
]
```

---

### DELETE `/api/qr/{id_asignacion}`
**Descripción:** Eliminar QR token

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "QR token eliminado correctamente",
  "id_asignacion": 1
}
```

**Errores:**
- `404`: QR token no encontrado

---

## 🚚 Tipos de Transporte Endpoints

### GET `/api/tipotransporte`
**Descripción:** Obtener todos los tipos de transporte

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "nombre": "Refrigerado",
    "descripcion": "Transporte con temperatura controlada"
  },
  {
    "id": 2,
    "nombre": "Aislado",
    "descripcion": "Transporte con aislamiento térmico"
  },
  {
    "id": 3,
    "nombre": "Ventilado",
    "descripcion": "Transporte con ventilación"
  }
]
```

---

### POST `/api/tipotransporte`
**Descripción:** Crear un nuevo tipo de transporte

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "nombre": "Refrigerado",
  "descripcion": "Transporte con temperatura controlada"
}
```

**Respuesta Exitosa (201):**
```json
{
  "mensaje": "Tipo de transporte creado correctamente",
  "data": {
    "id": 4,
    "nombre": "Refrigerado",
    "descripcion": "Transporte con temperatura controlada"
  }
}
```

**Errores:**
- `422`: Datos de validación incorrectos
- `409`: Ya existe un tipo de transporte con ese nombre

---

### PUT `/api/tipotransporte/{id}`
**Descripción:** Actualizar un tipo de transporte existente

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "nombre": "Refrigerado - Nuevo",
  "descripcion": "Descripción actualizada"
}
```

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "Tipo de transporte actualizado correctamente",
  "data": {
    "id": 1,
    "nombre": "Refrigerado - Nuevo",
    "descripcion": "Descripción actualizada"
  }
}
```

**Errores:**
- `404`: Tipo de transporte no encontrado
- `422`: Datos de validación incorrectos

---

### DELETE `/api/tipotransporte/{id}`
**Descripción:** Eliminar un tipo de transporte

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "Tipo de transporte eliminado correctamente"
}
```

**Errores:**
- `404`: Tipo de transporte no encontrado
- `400`: No se puede eliminar porque está siendo usado por vehículos o envíos

---

## 🚙 Tipos de Vehículo Endpoints

### GET `/api/tipos-vehiculo`
**Descripción:** Obtener todos los tipos de vehículo

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "nombre": "Pesado",
    "descripcion": "Vehículo de gran capacidad"
  }
]
```

---

### POST `/api/tipos-vehiculo`
**Descripción:** Crear un nuevo tipo de vehículo

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "nombre": "Mediano",
  "descripcion": "Vehículo de capacidad media"
}
```

**Respuesta Exitosa (201):**
```json
{
  "mensaje": "Tipo de vehículo creado correctamente",
  "data": {
    "id": 2,
    "nombre": "Mediano",
    "descripcion": "Vehículo de capacidad media"
  }
}
```

**Errores:**
- `422`: Datos de validación incorrectos
- `409`: Ya existe un tipo de vehículo con ese nombre

---

### PUT `/api/tipos-vehiculo/{id}`
**Descripción:** Actualizar un tipo de vehículo

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "nombre": "Mediano - Actualizado",
  "descripcion": "Descripción actualizada"
}
```

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "Tipo de vehículo actualizado correctamente",
  "data": {
    "id": 2,
    "nombre": "Mediano - Actualizado",
    "descripcion": "Descripción actualizada"
  }
}
```

**Errores:**
- `404`: Tipo de vehículo no encontrado
- `422`: Datos de validación incorrectos

---

### DELETE `/api/tipos-vehiculo/{id}`
**Descripción:** Eliminar un tipo de vehículo

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "mensaje": "Tipo de vehículo eliminado correctamente"
}
```

**Errores:**
- `404`: Tipo de vehículo no encontrado
- `400`: No se puede eliminar porque está vinculado a vehículos existentes


## 📝 Notas Importantes

### Estados de Envío
Los estados posibles son:
- `Pendiente`: Envío creado pero sin asignaciones
- `Asignado`: Envío con asignaciones pendientes
- `En curso`: Al menos una asignación está en curso
- `Parcialmente entregado`: Algunas asignaciones entregadas, otras no
- `Entregado`: Todas las asignaciones entregadas

### Estados de Asignación
Los estados posibles son:
- `Pendiente`: Asignación creada, esperando inicio
- `En curso`: Viaje iniciado
- `Entregado`: Viaje finalizado y entregado

### Estados de Vehículo
Los estados posibles son:
- `Disponible`: Vehículo disponible para asignar
- `No Disponible`: Vehículo asignado
- `En ruta`: Vehículo en viaje
- `Mantenimiento`: Vehículo en mantenimiento

### Estados de Transportista
Los estados posibles son:
- `Disponible`: Transportista disponible para asignar
- `No Disponible`: Transportista asignado
- `En ruta`: Transportista en viaje
- `Inactivo`: Transportista inactivo

### Estados de QR Token
Los estados posibles son:
- `Activo`: QR token válido y disponible
- `Usado`: QR token ya fue utilizado
- `Expirado`: QR token expirado

### Roles de Usuario
Los roles posibles son:
- `cliente`: Cliente que realiza envíos
  - Puede crearse desde el registro público (`POST /api/auth/register`)
  - Puede crearse desde `POST /api/usuarios` (requiere autenticación)
- `transportista`: Transportista que realiza entregas
  - Puede crearse desde el registro público (`POST /api/auth/register`) con `"rol": "transportista"`
  - Puede crearse desde `POST /api/usuarios` (requiere autenticación)
  - Al crearse, se genera automáticamente un registro en la tabla `transportistas`
- `admin`: Administrador del sistema
  - **NO puede crearse desde el registro público** por seguridad
  - Solo puede crearse desde `POST /api/usuarios` (requiere autenticación)
  - Al crearse, se genera automáticamente un registro en la tabla `admin` con `nivel_acceso: 1`

### Autenticación
- El token JWT tiene una duración de 4 horas
- El token debe enviarse en el header `Authorization: Bearer {token}`
- Algunos endpoints requieren roles específicos (admin, transportista, cliente)

### Estructura de Cargas
Las cargas ahora usan `CatalogoCarga`:
- `tipo`: Tipo de carga (ej: "Frutas", "Verduras")
- `variedad`: Variedad específica (ej: "Manzanas", "Lechuga")
- `empaque`: Tipo de empaque (ej: "Cajas", "Bolsas")

### Checklist de Condiciones
Estructura nueva:
```json
{
  "condiciones": [
    {
      "id_condicion": 1,  // ID de condiciones_transporte
      "valor": true,      // true/false
      "comentario": "Todo en orden"
    }
  ],
  "observaciones": "Observaciones generales"
}
```

### Checklist de Incidentes
Estructura nueva:
```json
{
  "incidentes": [
    {
      "id_tipo_incidente": 1,  // ID de tipos_incidente_transporte
      "descripcion_incidente": "Descripción del incidente"
    }
  ]
}
```

---

## 🔄 Cambios en la Nueva Base de Datos

### Campos que ya no existen directamente:
- `usuario.nombre`, `usuario.apellido`, `usuario.rol` → Ahora en `persona` y `roles_usuario`
- `vehiculo.tipo`, `vehiculo.estado` → Ahora en `tipos_vehiculo` y `estados_vehiculo`
- `transportista.ci`, `transportista.telefono` → Ahora en `persona` (a través de `usuarios`)
- `transportista.id_usuario` → Ahora existe como foreign key directa a `usuarios`
- `transportista.estado` → Ahora en `estados_transportista`
- `envio.estado` → Ahora en `historialestados`
- `carga.tipo`, `carga.variedad`, `carga.empaquetado` → Ahora en `catalogo_carga`
- `qrtoken.usado`, `qrtoken.id_usuario_cliente` → Ahora en `estados_qrtoken`
- `direccion.id_usuario` → Ya no existe, relación a través de `envios`

### Nuevas tablas:
- `persona`: Almacena datos personales
- `roles_usuario`: Catálogo de roles
- `tipos_vehiculo`: Catálogo de tipos de vehículos
- `estados_vehiculo`: Catálogo de estados de vehículos
- `estados_transportista`: Catálogo de estados de transportistas
- `estados_envio`: Catálogo de estados de envíos
- `estados_asignacion_multiple`: Catálogo de estados de asignaciones
- `catalogo_carga`: Catálogo de tipos de carga
- `condiciones_transporte`: Catálogo de condiciones para checklist
- `tipos_incidente_transporte`: Catálogo de tipos de incidentes
- `estados_qrtoken`: Catálogo de estados de QR tokens
- `checklist_condicion`: Checklist de condiciones
- `checklist_condicion_detalle`: Detalles del checklist de condiciones
- `incidentes_transporte`: Incidentes registrados

---

## 📞 Códigos de Estado HTTP

- `200`: OK - Solicitud exitosa
- `201`: Created - Recurso creado exitosamente
- `400`: Bad Request - Solicitud incorrecta
- `401`: Unauthorized - No autenticado
- `403`: Forbidden - No autorizado
- `404`: Not Found - Recurso no encontrado
- `409`: Conflict - Conflicto (ej: recurso ya existe)
- `422`: Unprocessable Entity - Error de validación
- `500`: Internal Server Error - Error del servidor

---

## 🚀 Base URL

```
http://localhost:8000/api
```

o en producción:
```
https://tu-dominio.com/api
```

---

**Última actualización:** 2024-11-10
**Versión de API:** 1.1.0

### Cambios Recientes (v1.1.0):
- **Registro de usuarios**: 
  - Ahora permite elegir rol (`cliente` o `transportista`) en el registro público
  - **NO permite crear usuarios `admin`** desde el registro público por seguridad
  - Para crear admins, usar `POST /api/usuarios` (requiere autenticación)
- **Creación de usuarios Admin**:
  - Al crear un usuario con rol `admin` mediante `POST /api/usuarios`, se crea automáticamente el registro en la tabla `admin` con `nivel_acceso: 1`
  - Al cambiar el rol de un usuario a `admin` mediante `PUT /api/usuarios/{id}/cambiar-rol`, también se crea automáticamente el registro en `admin`
  - Al cambiar el rol desde `admin` a otro, se elimina automáticamente el registro de `admin`
- **Transportistas**: 
  - Eliminados campos `ci` y `telefono` de la tabla `transportistas`
  - Agregado campo `id_usuario` como foreign key directa
  - Los datos de CI y teléfono se obtienen desde `persona` a través de `usuarios`
  - Endpoint `POST /api/transportistas` ahora requiere `id_usuario` en lugar de `ci` y `telefono`
  - Endpoint `PUT /api/transportistas/{id}` ya no permite editar CI y teléfono (se editan desde usuarios)
- **Cambio de roles**:
  - El endpoint `PUT /api/usuarios/{id}/cambiar-rol` ahora maneja automáticamente la creación/eliminación de registros en `transportistas` y `admin` según el rol asignado

