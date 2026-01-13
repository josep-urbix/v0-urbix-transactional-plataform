# Lemonway API Explorer

## Descripción General

El **Lemonway API Explorer** es una interfaz completa para gestionar, documentar y probar todos los métodos de la API de Lemonway integrados en URBIX. Permite a desarrolladores y usuarios de negocio explorar los endpoints disponibles, ejecutar llamadas de prueba en modo sandbox, y mantener un historial completo de todas las operaciones.

## Características

### 1. Gestión de Métodos API
- **Lista de métodos** organizados por categorías (Auth, Accounts, Transactions, KYC, Payments)
- **Activación/desactivación** de métodos individuales con control RBAC
- **Documentación completa** con schemas de request/response
- **Búsqueda y filtros** por nombre, categoría y estado

### 2. Testing Interactivo
- **Formularios pre-rellenados** con datos de ejemplo
- **Ejecución en tiempo real** contra sandbox de Lemonway
- **Validación de parámetros** antes de enviar
- **Respuestas formateadas** con syntax highlighting JSON

### 3. Historial de Llamadas
- **Registro persistente** de todas las llamadas de prueba
- **Filtros avanzados** por método, usuario, fecha y estado
- **Detalles completos** de request/response
- **Métricas de rendimiento** (duración, status code)

### 4. Presets Reutilizables
- **Guardar configuraciones** de parámetros frecuentes
- **Compartir entre equipo** (opcional)
- **Carga rápida** para testing repetitivo

## Arquitectura

### Base de Datos

#### Tabla: `lemonway_api_methods`
Almacena la definición de cada método API disponible.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `name` | VARCHAR(100) | Nombre del método (ej: "getBearerToken") |
| `endpoint` | VARCHAR(255) | Path del endpoint |
| `http_method` | VARCHAR(10) | GET, POST, PUT, DELETE |
| `description` | TEXT | Descripción funcional |
| `category` | VARCHAR(50) | Categoría (AUTH, ACCOUNTS, etc.) |
| `is_enabled` | BOOLEAN | Estado activo/inactivo |
| `request_schema` | JSONB | Schema de validación de request |
| `response_schema` | JSONB | Schema esperado de response |
| `example_request` | JSONB | Ejemplo de parámetros |
| `example_response` | JSONB | Ejemplo de respuesta |

#### Tabla: `lemonway_api_call_history`
Registra cada llamada de prueba ejecutada.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `method_id` | UUID | FK a lemonway_api_methods |
| `user_id` | UUID | Usuario que ejecutó la llamada |
| `request_payload` | JSONB | Parámetros enviados |
| `response_payload` | JSONB | Respuesta recibida |
| `status_code` | INTEGER | HTTP status code |
| `duration_ms` | INTEGER | Tiempo de ejecución |
| `success` | BOOLEAN | Éxito o error |
| `error_message` | TEXT | Mensaje de error si aplica |
| `created_at` | TIMESTAMP | Fecha de ejecución |

#### Tabla: `lemonway_api_presets`
Almacena configuraciones guardadas por usuario.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `method_id` | UUID | FK a lemonway_api_methods |
| `user_id` | UUID | Propietario del preset |
| `name` | VARCHAR(100) | Nombre del preset |
| `description` | TEXT | Descripción opcional |
| `parameters` | JSONB | Parámetros guardados |

### Permisos RBAC

| Permiso | Descripción | Roles |
|---------|-------------|-------|
| `lemonway_api:view` | Ver métodos y documentación | admin, superadmin |
| `lemonway_api:test` | Ejecutar llamadas de prueba | admin, superadmin |
| `lemonway_api:toggle` | Activar/desactivar métodos | superadmin |
| `lemonway_api:manage_presets` | Gestionar presets | admin, superadmin |

### APIs REST

#### GET /api/lemonway-api/methods
Lista todos los métodos disponibles con filtros opcionales.

**Query Params:**
- `category` - Filtrar por categoría
- `is_enabled` - Filtrar por estado (true/false)
- `search` - Buscar en nombre o descripción

**Response:**
```json
{
  "methods": [
    {
      "id": "uuid",
      "name": "getBearerToken",
      "category": "AUTH",
      "is_enabled": true,
      ...
    }
  ]
}
```

#### PATCH /api/lemonway-api/methods/[methodId]
Activa o desactiva un método.

**Body:**
```json
{
  "is_enabled": false
}
```

#### POST /api/lemonway-api/test
Ejecuta una llamada de prueba.

**Body:**
```json
{
  "method_id": "uuid",
  "parameters": {
    "accountId": "12345"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "duration_ms": 245,
  "status_code": 200,
  "history_id": "uuid"
}
```

#### GET /api/lemonway-api/history
Obtiene el historial de llamadas con filtros y paginación.

**Query Params:**
- `method_id` - Filtrar por método
- `success` - Filtrar por éxito/error
- `start_date` / `end_date` - Rango de fechas
- `page` / `limit` - Paginación

#### POST /api/lemonway-api/presets
Crea un nuevo preset.

**Body:**
```json
{
  "method_id": "uuid",
  "name": "Test con cuenta demo",
  "description": "Parámetros para testing",
  "parameters": { ... }
}
```

#### DELETE /api/lemonway-api/presets/[presetId]
Elimina un preset del usuario.

## Middleware de Seguridad

En `lib/lemonway-client.ts`, cada método verifica si está habilitado antes de ejecutar:

```typescript
if (!methodEnabled) {
  throw new Error(`Método ${methodName} está desactivado`)
}
```

## Uso

### Acceso
1. Navegar a `/dashboard/lemonway-api-explorer`
2. El sistema verifica permisos RBAC automáticamente

### Testing de un Método
1. Seleccionar método de la lista
2. Click en tab "Detalle"
3. Rellenar/ajustar parámetros (pre-rellenados con ejemplos)
4. Click en "Ejecutar Prueba"
5. Ver respuesta en tiempo real
6. Opcionalmente guardar como preset

### Ver Historial
1. Click en tab "Historial"
2. Aplicar filtros si es necesario
3. Expandir cualquier llamada para ver detalles completos

### Activar/Desactivar Métodos
1. Requiere permiso `lemonway_api:toggle`
2. Toggle en la lista de métodos
3. Confirmación automática
4. El método queda bloqueado en todo el sistema

## Seguridad

- **Autenticación**: Requiere sesión activa de usuario
- **Autorización**: Sistema RBAC centralizado
- **Auditoría**: Todas las acciones se registran en `audit_logs`
- **Sandbox**: Solo ejecuta en modo sandbox de Lemonway
- **Validación**: Schemas JSON para todos los requests

## Mantenimiento

### Añadir Nuevo Método
1. Insertar en `lemonway_api_methods` via SQL
2. Implementar en `lib/lemonway-client.ts`
3. Añadir verificación `is_enabled`

### Monitoreo
- Revisar `lemonway_api_call_history` para errores frecuentes
- Analizar `duration_ms` para detectar degradación
- Verificar `audit_logs` para cambios de estado

## Roadmap

- [ ] Exportar historial a CSV/JSON
- [ ] Compartir presets entre usuarios
- [ ] Notificaciones cuando un método falla
- [ ] Dashboard de métricas y uso
- [ ] Modo producción (con confirmación adicional)
