# Servicios Internos - Referencia Completa

## Tabla de Contenidos
1. [Autenticación y Seguridad](#autenticación-y-seguridad)
2. [Base de Datos](#base-de-datos)
3. [Lemonway Integration](#lemonway-integration)
4. [Workflow Engine](#workflow-engine)
5. [Repositorios y Datos](#repositorios-y-datos)
6. [Utilities y Helpers](#utilities-y-helpers)
7. [HubSpot Integration](#hubspot-integration)
8. [Investor Auth](#investor-auth)

---

## Autenticación y Seguridad

### 1. **lib/auth.ts**
- **Propósito**: Gestión central de autenticación y permisos
- **Funciones principales**:
  - `getSession()` - Obtiene sesión actual del usuario
  - `requireAdmin(user, resource, action)` - Middleware de permisos RBAC
  - `requireAuth()` - Middleware de autenticación requerida
  - `hasPermission(user, resource, action)` - Verifica permiso específico
- **Dependencias**: NextAuth, Base de datos
- **Uso**:
```typescript
import { getSession, requireAdmin } from '@/lib/auth'
const user = await getSession()
await requireAdmin(user, 'lemonway:queue', 'view', request)
```

### 2. **lib/permissions.ts**
- **Propósito**: Definición y validación de permisos RBAC
- **Funciones principales**:
  - `checkPermission(userId, resource, action)` - Valida permiso en BD
  - `getAllPermissions(roleId)` - Lista permisos de rol
  - `assignPermission(userId, permission)` - Asigna permiso nuevo
- **Recursos**: `users`, `lemonway`, `documents`, `workflows`, `admin`
- **Acciones**: `view`, `create`, `update`, `delete`, `execute`

### 3. **lib/rate-limiter.ts**
- **Propósito**: Limitar tasa de solicitudes por usuario/IP
- **Funciones principales**:
  - `rateLimit(key, limit, window)` - Verifica límite
  - `getRemainingRequests(key)` - Obtiene solicitudes restantes
  - `resetCounter(key)` - Reinicia contador
- **Almacenamiento**: Redis/Upstash
- **Configuración**: 100 req/5min por defecto

### 4. **lib/audit-logger.ts**
- **Propósito**: Auditoría de acciones críticas
- **Funciones principales**:
  - `logAccess(userId, action, resource, status)` - Registra acceso
  - `logChange(userId, entity, before, after)` - Registra cambios
  - `getAuditLog(userId, days)` - Obtiene historial
- **Almacenamiento**: Tabla `access_logs` en BD

### 5. **lib/webhook-verification.ts**
- **Propósito**: Verificar autenticidad de webhooks
- **Funciones principales**:
  - `verifyWebhookSignature(payload, signature, secret)` - Valida firma
  - `generateSignature(payload, secret)` - Genera firma HMAC-SHA256
- **Usado por**: HubSpot, Lemonway webhooks

### 6. **lib/session-manager.ts**
- **Propósito**: Gestión de sesiones y tokens
- **Funciones principales**:
  - `createSession(userId)` - Crea nueva sesión
  - `validateSession(token)` - Valida token
  - `refreshToken(oldToken)` - Renueva token
  - `destroySession(userId)` - Cierra sesión

---

## Base de Datos

### 1. **lib/db.ts**
- **Propósito**: Conexión centralizada a Neon PostgreSQL
- **Exports principales**:
  - `sql` - Cliente SQL directo (conexión pooled)
  - `db()` - Conexión no-pooled para transacciones
  - `query(sql, params)` - Ejecuta query con parámetros
- **Configuración**: Usa `DATABASE_URL` de Neon
- **Uso**:
```typescript
import { sql } from '@/lib/db'
const result = await sql('SELECT * FROM users WHERE id = $1', [userId])
```

### 2. **lib/db-logger.ts**
- **Propósito**: Logging de queries SQL en desarrollo
- **Funciones principales**:
  - `logQuery(sql, params, duration)` - Registra query y tiempo
  - `enableDebugMode()` - Activa logging
  - `disableDebugMode()` - Desactiva logging
- **Salida**: Console con colores para desarrollo

### 3. **lib/neon-config.ts**
- **Propósito**: Configuración y validación de conexión Neon
- **Funciones principales**:
  - `getPoolConfig()` - Retorna config de pool
  - `validateConnection()` - Verifica conexión activa
  - `getConnectionStatus()` - Estado actual de conexión
- **Variables de entorno**: `POSTGRES_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`

---

## Lemonway Integration

### 1. **lib/lemonway-client.ts**
- **Propósito**: Cliente principal para API de Lemonway
- **Métodos principales** (10 queries externas):
  - `getBearerToken()` - OAuth 2.0 bearer token (90 días)
  - `getAccountDetails(accountId)` - Datos completos de cuenta
  - `getAccountsByIds(ids[])` - Múltiples cuentas
  - `getTransactions(walletId, startDate, endDate)` - Transacciones
  - `getAccountTransactions(accountId, startDate, endDate)` - Por cuenta
  - `getWalletTransactions()` - Específico de wallet
  - `getAccountBalances(walletIds[])` - Saldos de wallets
  - `getKycStatus(walletId?)` - Estado KYC/AML
  - `getWalletByVirtualAccount(vaId)` - Wallet de cuenta virtual
  - `listMerchants()` - Lista de merchants
- **Autenticación**: Bearer token en headers
- **Manejo de errores**: Retry automático con backoff exponencial
- **Almacenamiento de config**: Tabla `LemonwayConfig`

### 2. **lib/lemonway-queue-processor.ts**
- **Propósito**: Procesa cola dual FIFO (URGENT > NORMAL)
- **Funciones principales**:
  - `processQueue()` - Ejecuta items pendientes
  - `enqueueRequest(priority, operation)` - Agrega a cola
  - `getQueueStats()` - Estadísticas de cola
  - `prioritizeRequest(itemId)` - Cambia prioridad
- **Reintentos**: Hasta 5 intentos con backoff exponencial
- **Ejecución**: Cron job cada 30 segundos

### 3. **lib/lemonway-sandbox-executor.ts**
- **Propósito**: Modo sandbox para testing seguro
- **Funciones principales**:
  - `executeSandbox(query, params)` - Dry-run sin efectos
  - `validatePayload(query)` - Valida estructura
  - `getSandboxResults(executionId)` - Resultados almacenados
- **Almacenamiento**: Tabla `lemonway_sandbox_executions`

### 4. **lib/lemonway-health-monitor.ts**
- **Propósito**: Monitoreo en tiempo real de Lemonway
- **Funciones principales**:
  - `checkHealth()` - Verifica disponibilidad
  - `getHealthStatus()` - Estado actual
  - `recordHealthCheck(status, latency)` - Registra health check
- **Alertas**: Si latencia > 5s o errores > 10%

### 5. **lib/lemonway-rate-limiter.ts**
- **Propósito**: Limita tasa de llamadas a Lemonway
- **Funciones principales**:
  - `checkRateLimit(operationType)` - Verifica límite
  - `updateRateLimit(operationType, count)` - Actualiza contador
  - `getConfig()` - Obtiene límites configurados
- **Límites**: 100 req/min por operación, configurable

### 6. **lib/lemonway-versioning.ts**
- **Propósito**: Versionado y rollback de queries
- **Funciones principales**:
  - `createVersion(query)` - Crea versión
  - `rollback(queryId, versionId)` - Revierte a versión anterior
  - `diffVersions(v1, v2)` - Compara versiones
  - `listVersions(queryId)` - Lista historial
- **Almacenamiento**: Tabla `lemonway_query_versions`

### 7. **lib/lemonway-snapshot-comparison.ts**
- **Propósito**: Comparación de requests/responses antes-después
- **Funciones principales**:
  - `createSnapshot(operation, request, response)` - Guarda snapshot
  - `compareSnapshots(snap1, snap2)` - Compara diferencias
  - `getSnapshot(snapshotId)` - Obtiene snapshot
- **Almacenamiento**: Tabla `lemonway_snapshots`

### 8. **lib/lemonway-schema-validator.ts**
- **Propósito**: Validación de schemas de request/response
- **Funciones principales**:
  - `validateRequest(operation, payload)` - Valida request
  - `validateResponse(operation, response)` - Valida response
  - `generateForm(operation)` - Genera formulario desde schema
- **Schemas**: JSON Schema definido para cada operación

### 9. **lib/lemonway-type-mapper.ts**
- **Propósito**: Mapeo de campos entre BD local y Lemonway
- **Funciones principales**:
  - `mapToLemonway(dbObject)` - BD local → Lemonway
  - `mapFromLemonway(lwObject)` - Lemonway → BD local
  - `getMapping(entity)` - Obtiene mapeo de entidad
- **Configuración**: Tabla `MappedFields`

### 10. **lib/lemonway-deduplication.ts**
- **Propósito**: Evita procesamiento duplicado de transacciones
- **Funciones principales**:
  - `isDuplicate(txnId)` - Verifica si ya procesado
  - `markProcessed(txnId)` - Marca como procesado
  - `getDeduplicationWindow()` - Obtiene ventana (24h)

### 11. **lib/lemonway-retry-config.ts**
- **Propósito**: Configuración de reintentos automáticos
- **Funciones principales**:
  - `getRetryConfig(operationType)` - Obtiene config
  - `updateRetryConfig(type, maxRetries, backoff)` - Actualiza config
  - `calculateNextRetry(attempt)` - Calcula próximo reintento
- **Backoff**: Exponencial (2^n segundos)

### 12. **lib/lemonway-webhook-handler.ts**
- **Propósito**: Procesa webhooks entrantes de Lemonway
- **Funciones principales**:
  - `handleWebhook(payload)` - Procesa webhook
  - `validateWebhookSource(signature)` - Valida procedencia
  - `parseWebhookPayload(raw)` - Parse de payload
  - `storeWebhookEvent(event)` - Almacena en BD
- **Eventos soportados**: transaction, kyc_update, wallet_change, error

---

## Workflow Engine

### 1. **lib/workflow-engine.ts**
- **Propósito**: Motor de ejecución de workflows BPM
- **Funciones principales**:
  - `executeWorkflow(workflowId, context)` - Ejecuta workflow
  - `getWorkflowStatus(executionId)` - Estado actual
  - `pauseWorkflow(executionId)` - Pausa ejecución
  - `resumeWorkflow(executionId)` - Reanuda ejecución
  - `cancelWorkflow(executionId)` - Cancela workflow
- **Tipos de nodos**: API call, conditional, delay, parallel, email, log, variables
- **Almacenamiento**: Tabla `workflows` y `workflow_executions`

### 2. **lib/workflow-handlers/\***
- **api-handler.ts**: Llama APIs externas con retry
- **webhook-handler.ts**: Dispara webhooks a terceros
- **conditional-handler.ts**: Evalúa condiciones (IF/THEN)
- **delay-handler.ts**: Espera X segundos/minutos/horas
- **email-handler.ts**: Envía emails (resend o SMTP)
- **log-handler.ts**: Registra eventos en log
- **variables-handler.ts**: Procesa variables dinámicas

### 3. **lib/workflow-registry.ts**
- **Propósito**: Registro de todos los tipos de nodos
- **Funciones principales**:
  - `registerHandler(nodeType, handler)` - Registra handler
  - `getHandler(nodeType)` - Obtiene handler
  - `listAvailableHandlers()` - Lista handlers disponibles
- **Pre-registrados**: 7 handlers iniciales

### 4. **lib/template-engine.ts**
- **Propósito**: Procesa templates con variables
- **Funciones principales**:
  - `compileTemplate(template)` - Compila template
  - `renderTemplate(template, context)` - Renderiza con valores
  - `validateTemplate(template)` - Valida sintaxis
  - `extractVariables(template)` - Lista variables requeridas
- **Sintaxis**: `{{variable}}`, `{{object.property}}`

---

## Repositorios y Datos

### 1. **lib/repositories/api-repository.ts**
- **Propósito**: CRUD de endpoints API externos
- **Funciones principales**:
  - `createEndpoint(endpoint)` - Crea nuevo
  - `getEndpoint(id)` - Obtiene por ID
  - `listEndpoints(filter)` - Lista con filtros
  - `updateEndpoint(id, data)` - Actualiza
  - `deleteEndpoint(id)` - Elimina
- **Almacenamiento**: Tabla `lemonway_api_methods`

### 2. **lib/repositories/imports-repository.ts**
- **Propósito**: Gestión de importaciones de datos
- **Funciones principales**:
  - `createImport(importData)` - Inicia importación
  - `getImportStatus(importId)` - Estado actual
  - `getImportedData(importId)` - Datos importados
  - `retryImport(importId)` - Reintentar fallidos
- **Almacenamiento**: Tabla `lemonway_imports`

### 3. **lib/repositories/payment-accounts-repository.ts**
- **Propósito**: CRUD de cuentas de pago
- **Funciones principales**:
  - `createAccount(account)` - Nueva cuenta
  - `getAccountById(id)` - Por ID
  - `syncAccount(lemonwayId)` - Sincroniza desde Lemonway
  - `updateBalance(accountId, amount)` - Actualiza saldo
- **Almacenamiento**: Tabla `payment_accounts`

### 4. **lib/repositories/virtual-accounts-repository.ts**
- **Propósito**: Gestión de cuentas virtuales
- **Funciones principales**:
  - `createVirtualAccount(userId, accountData)` - Nueva VA
  - `getVirtualAccountsByUser(userId)` - Por usuario
  - `linkToPaymentAccount(vaId, paymentAccountId)` - Vincular
  - `getBalance(vaId)` - Saldo actual
- **Almacenamiento**: Tabla `cuentas_virtuales`

---

## Utilities y Helpers

### 1. **lib/logger.ts**
- **Propósito**: Logging centralizado con niveles
- **Funciones principales**:
  - `logger.info(msg, context)` - Información
  - `logger.warn(msg, context)` - Advertencia
  - `logger.error(msg, error, context)` - Error
  - `logger.debug(msg, context)` - Debug
- **Salida**: Console en dev, external service en prod
- **Niveles**: DEBUG, INFO, WARN, ERROR

### 2. **lib/security-utils.ts**
- **Propósito**: Utilidades de seguridad
- **Funciones principales**:
  - `hashPassword(password)` - Hash bcrypt
  - `verifyPassword(password, hash)` - Verifica contraseña
  - `generateSecureToken()` - Token aleatorio 32 bytes
  - `sanitizeInput(input)` - Sanitiza para prevenir XSS
  - `encryptData(data, key)` - Encripta sensible
  - `decryptData(encrypted, key)` - Desencripta
- **Algoritmos**: bcrypt (passwords), AES-256 (datos)

### 3. **lib/device-tracking.ts**
- **Propósito**: Seguimiento de dispositivos por IP
- **Funciones principales**:
  - `trackDeviceAccess(userId, ipAddress)` - Registra acceso
  - `isNewDevice(userId, ipAddress)` - Detecta nuevo dispositivo
  - `getDeviceHistory(userId)` - Historial de IPs
  - `blockDevice(userId, ipAddress)` - Bloquea IP
- **Almacenamiento**: Tabla `user_device_history`

### 4. **lib/sms-validator.ts**
- **Propósito**: Validación y envío de SMS OTP
- **Funciones principales**:
  - `generateOTP()` - Genera código 6 dígitos
  - `sendOTP(phoneNumber)` - Envía OTP por SMS
  - `validateOTP(phoneNumber, code)` - Valida código
  - `markOTPAsUsed(phoneNumber)` - Marca como usado
- **Proveedor**: Twilio (configurable)
- **Expiración**: 10 minutos

### 5. **lib/url-extractor.ts**
- **Propósito**: Extrae URLs de texto
- **Funciones principales**:
  - `extractUrls(text)` - Extrae todas URLs
  - `validateUrl(url)` - Valida formato
  - `getMetadata(url)` - Obtiene título, descripción, imagen
- **Validación**: Protocolo HTTP/HTTPS requerido

### 6. **lib/currency-utils.ts**
- **Propósito**: Conversiones y formateo de monedas
- **Funciones principales**:
  - `convertCurrency(amount, from, to)` - Convierte moneda
  - `formatCurrency(amount, currency)` - Formatea con símbolo
  - `parseAmount(amount)` - Parse a número
  - `roundAmount(amount, decimals)` - Redondea correctamente
- **Tasas**: API de cambio actualizada

### 7. **lib/uuid-utils.ts**
- **Propósito**: Generación y validación de UUIDs
- **Funciones principales**:
  - `generateUUID()` - Genera UUID v4
  - `validateUUID(uuid)` - Valida formato
  - `generateShortId()` - ID corto (12 chars)
- **Biblioteca**: uuid v4

### 8. **lib/date-utils.ts**
- **Propósito**: Manejo de fechas
- **Funciones principales**:
  - `addDays(date, days)` - Suma días
  - `startOfDay(date)` - Inicio de día (00:00)
  - `endOfDay(date)` - Fin de día (23:59)
  - `formatDate(date, format)` - Formatea fecha
  - `parseDate(dateString)` - Parse de string
- **Librería**: date-fns

### 9. **lib/retry-utils.ts**
- **Propósito**: Utilidades de reintento
- **Funciones principales**:
  - `retry(fn, options)` - Reintentos automáticos
  - `exponentialBackoff(attempt)` - Calcula espera
  - `circuitBreaker(fn)` - Patrón circuit breaker
- **Opciones**: maxRetries, backoffMs, timeout

### 10. **lib/pagination-utils.ts**
- **Propósito**: Utilidades para paginación
- **Funciones principales**:
  - `calculateOffset(page, pageSize)` - Calcula offset
  - `validatePageParams(page, pageSize)` - Valida parámetros
  - `buildPaginationResponse(data, page, total)` - Respuesta
- **Límites**: Min 1, Max 100 items por página

### 11. **lib/cache-utils.ts**
- **Propósito**: Caché en memoria o Redis
- **Funciones principales**:
  - `set(key, value, ttl)` - Guarda en caché
  - `get(key)` - Obtiene de caché
  - `invalidate(pattern)` - Invalida patrón
  - `clear()` - Limpia todo caché
- **Almacenamiento**: Upstash Redis o memoria

### 12. **lib/validation-utils.ts**
- **Propósito**: Validaciones comunes
- **Funciones principales**:
  - `isValidEmail(email)` - Valida email
  - `isValidPhoneNumber(phone)` - Valida teléfono
  - `isValidIBAN(iban)` - Valida IBAN
  - `isValidURL(url)` - Valida URL
  - `isStrongPassword(password)` - Valida contraseña fuerte
- **Patrones**: Regex validados

### 13. **lib/environment-utils.ts**
- **Propósito**: Acceso seguro a variables de entorno
- **Funciones principales**:
  - `getEnv(key, defaultValue)` - Obtiene con default
  - `requireEnv(key)` - Requiere variable (error si falta)
  - `parseEnvNumber(key)` - Parse a número
  - `parseEnvBoolean(key)` - Parse a booleano
- **Validación**: Lanza error si falta variable requerida

### 14. **lib/error-handler.ts**
- **Propósito**: Manejo centralizado de errores
- **Funciones principales**:
  - `handleError(error)` - Procesa error
  - `createErrorResponse(code, message)` - Respuesta normalizada
  - `logError(error, context)` - Registra error
  - `getErrorMessage(error)` - Mensaje usuario-friendly
- **Códigos de error**: VALIDATION, AUTH, NOT_FOUND, SERVER_ERROR

---

## HubSpot Integration

### 1. **lib/hubspot-client.ts**
- **Propósito**: Cliente para HubSpot CRM API
- **Funciones principales**:
  - `createContact(contactData)` - Crea contacto
  - `updateContact(contactId, data)` - Actualiza contacto
  - `getContact(contactId)` - Obtiene contacto
  - `searchContacts(query)` - Busca contactos
  - `createCompany(companyData)` - Crea empresa
  - `linkContactToCompany(contactId, companyId)` - Vincula
- **Autenticación**: API Key en headers
- **Rate Limit**: 100 req/10 seg

---

## Investor Auth

### 1. **lib/investor-auth/middleware.ts**
- **Propósito**: Middleware para inversores
- **Funciones principales**:
  - `verifyInvestorToken(token)` - Valida token inversor
  - `requireInvestor(req, res, next)` - Middleware
  - `extractInvestorId(token)` - Obtiene ID del token

### 2. **lib/investor-auth/session.ts**
- **Propósito**: Gestión de sesión de inversores
- **Funciones principales**:
  - `createInvestorSession(investorId)` - Crea sesión
  - `validateInvestorSession(token)` - Valida sesión
  - `destroyInvestorSession(token)` - Cierra sesión

### 3. **lib/investor-auth/cors.ts**
- **Propósito**: CORS configurado para inversores
- **Configuración**: Dominios permitidos en env

### 4. **lib/investor-auth/utils.ts**
- **Propósito**: Utilidades generales
- **Funciones principales**:
  - `getInvestorProfile(investorId)` - Perfil del inversor
  - `updateInvestorProfile(investorId, data)` - Actualiza perfil

---

## Hooks de React

### 1. **hooks/use-mobile.ts**
- **Propósito**: Detectar vista mobile
- **Hook**: `const isMobile = useMobile()` - Retorna boolean

### 2. **hooks/use-toast.ts**
- **Propósito**: Sistema de notificaciones
- **Hook**: `const { toast } = useToast()`
- **Métodos**: `toast({ title, description, variant })`

### 3. **hooks/use-auth.ts** (si existe)
- **Propósito**: Acceso a datos de autenticación
- **Hook**: `const { user, isAuthenticated } = useAuth()`

---

## Tipos TypeScript

### 1. **lib/types/lemonway-api.ts**
- `LemonwayConfig` - Configuración de Lemonway
- `LemonwayAccount` - Cuenta en Lemonway
- `LemonwayTransaction` - Transacción
- `LemonwayError` - Estructura de error
- `LemonwayWebhook` - Evento webhook
- `ApiMethod` - Definición de método API
- `CustomQuery` - Query personalizada
- `QueueItem` - Item de cola

### 2. **lib/types/workflow.ts** (si existe)
- `Workflow` - Definición de workflow
- `WorkflowNode` - Nodo del workflow
- `WorkflowExecution` - Ejecución en curso
- `WorkflowContext` - Contexto de ejecución

### 3. Otros tipos normalizados
- `User` - Datos de usuario
- `Session` - Datos de sesión
- `Permission` - Permiso RBAC
- `VirtualAccount` - Cuenta virtual
- `PaymentAccount` - Cuenta de pago

---

## Resumen de Dependencias entre Servicios

```
auth → permissions, audit-logger
lemonway-client → db, auth, logger
workflow-engine → workflow-handlers, template-engine
queue-processor → lemonway-client, retry-utils
sandbox-executor → schema-validator, lemonway-client
health-monitor → lemonway-client, logger
repositories → db, logger
hubspot-client → logger, security-utils
```

---

## Patrones Comunes

### Error Handling
```typescript
try {
  const result = await service.doSomething()
  return { success: true, data: result }
} catch (error) {
  logger.error('Failed to do something', error)
  return { success: false, error: error.message }
}
```

### Autenticación en Endpoints
```typescript
import { getSession, requireAdmin } from '@/lib/auth'

export async function GET(request) {
  const user = await getSession()
  await requireAdmin(user, 'resource:action', request)
  // Tu código aquí
}
```

### Queries de BD
```typescript
import { sql } from '@/lib/db'

const result = await sql(
  'SELECT * FROM table WHERE id = $1 AND status = $2',
  [id, 'active']
)
```

---

## Contacto y Soporte

Para dudas sobre servicios específicos, revisar:
- Documentación de API Reference en `docs/API-REFERENCE.md`
- Documentación de Lemonway en `docs/LEMONWAY-*.md`
- Tests unitarios en `__tests__/` como ejemplos
