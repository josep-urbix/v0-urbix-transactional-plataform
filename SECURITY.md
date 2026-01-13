# Security Guidelines

## Arquitectura de Seguridad

Esta aplicación implementa múltiples capas de seguridad para proteger datos sensibles y prevenir ataques comunes.

## Autenticación y Autorización

### Sistema de Sesiones
- **Cookie-based Sessions**: Sesiones almacenadas en cookies HTTP-only
- **Expiración**: 7 días de duración
- **Validación**: Verificación en cada request via middleware
- **Bcrypt Hashing**: Passwords hasheados con bcrypt (10 rounds)

### Control de Acceso Basado en Roles (RBAC)
- **Roles**: admin, manager, user
- **Permisos Granulares**: Sistema de permisos por recurso (users.view, settings.update, etc.)
- **Middleware de Autorización**: `requirePermission()` y `requireRole()` en todas las rutas protegidas

### Recuperación de Contraseña
- **Tokens Temporales**: Generados con crypto.randomBytes
- **Expiración**: 1 hora de validez
- **Un Solo Uso**: Tokens marcados como usados después de resetear
- **Validación de Fuerza**: Mínimo 8 caracteres, debe contener números y letras
- **Rate Limiting**: 5 intentos por 15 minutos

## Protecciones Contra Ataques

### SQL Injection
- **Parametrized Queries**: Uso de Neon tagged templates en todas las queries
- **No String Concatenation**: Nunca se construyen queries con strings concatenados
- **Input Sanitization**: Validación y sanitización de todos los inputs

### XSS (Cross-Site Scripting)
- **Input Sanitization**: Función `sanitizeInput()` remueve caracteres peligrosos
- **Content Security Policy**: Headers CSP estrictos
- **React Escaping**: React escapa automáticamente el contenido

### CSRF (Cross-Site Request Forgery)
- **SameSite Cookies**: strict mode en todas las cookies de sesión
- **HTTP-only Cookies**: Previene acceso JavaScript
- **Origin Validation**: Verificación de origen en requests sensibles

### Rate Limiting
- **Login**: 5 intentos por 15 minutos
- **Forgot Password**: 3 intentos por 1 hora
- **Reset Password**: 5 intentos por 15 minutos (nuevo)
- **Change Password**: 5 intentos por 15 minutos (nuevo)
- **Settings Update**: 10 intentos por 1 hora
- **In-memory Store**: Map con limpieza automática
- **Por IP/Email/User**: Tracking por identificador único

### Timing Attacks
- **Constant-time Comparison**: Comparación segura para passwords, tokens y API keys
- **Generic Error Messages**: No revela si usuario existe o password incorrecto

## Seguridad de Webhooks

### Autenticación de Webhooks HubSpot
- **API Key Authentication**: Header custom `agendas` requerido
- **Simple String Comparison**: Validación directa de API key
- **Configuración Flexible**: 
  - Header Name: "agendas" (custom header de HubSpot)
  - Configurable desde Settings UI
  - Variable de entorno: `HUBSPOT_WEBHOOK_SECRET`
  - Prioridad: Base de datos > Variable de entorno
- **Headers Logging con Redacción**: Headers sensibles son redactados antes de guardarse

### Validación de Requests
- **401 Unauthorized**: Requests sin API key válido
- **Logging Seguro**: Headers sensibles (agendas, authorization, cookie) se redactan con [REDACTED]
- **Auditoría Completa**: Cada request del webhook genera registros de auditoría seguros

### Logging Seguro en Producción
- **No Console Logs en Producción**: Los console.log se reemplazan por `secureLog()` que solo loguea en desarrollo
- **Headers Redactados**: Headers sensibles como API keys se guardan como [REDACTED] en la base de datos
- **Funciones Seguras**: 
  - `secureLog(message, data)`: Solo loguea en desarrollo
  - `secureError(message, error)`: Loguea mensaje genérico en producción
  - `maskSensitiveData(data, visibleChars)`: Enmascara datos sensibles mostrando solo inicio y fin

## Headers de Seguridad HTTP

\`\`\`
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-XSS-Protection: 1; mode=block
Permissions-Policy: geolocation=(), microphone=(), camera=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
  style-src 'self' 'unsafe-inline'; 
  img-src 'self' data: https:; 
  connect-src 'self'; 
  frame-ancestors 'none';
\`\`\`

## Gestión de Secrets

### Variables de Entorno
- **DATABASE_URL**: Conexión a base de datos (Neon)
- **NEXTAUTH_SECRET**: Secret para sesiones
- **HUBSPOT_ACCESS_TOKEN**: Token de acceso HubSpot (opcional si está en DB)
- **HUBSPOT_WEBHOOK_SECRET**: API key del webhook (fallback si no está en DB)
- **ADMIN_PASSWORD**: Password inicial del admin
- **ALLOWED_EMAIL_DOMAINS**: Dominios de email permitidos

### Configuración en Base de Datos
- **hubspot_access_token**: Token de HubSpot almacenado encriptado
- **webhook_api_key**: API key del webhook (min 16 caracteres)
- **Prioridad**: Base de datos > Variables de entorno
- **Masking**: Tokens mostrados parcialmente en UI (****últimos 4 caracteres)

## Auditoría y Logging

### Transaction Log
Todas las acciones importantes se registran en la tabla `Transaction`:
- LOGIN / LOGOUT
- PASSWORD_RESET / PASSWORD_CHANGED
- USER_CREATED / USER_UPDATED / USER_DELETED
- WEBHOOK_* (eventos de webhook)
- HUBSPOT_* (operaciones con HubSpot)
- **WEBHOOK_HEADERS_RECEIVED**: Headers con datos sensibles redactados

### Logging Seguro
- **Producción**: Solo mensajes genéricos, sin datos sensibles
- **Desarrollo**: Logs detallados para debugging
- **Headers Sensibles**: Redactados como [REDACTED] antes de guardarse
- **Passwords/Tokens**: Nunca logueados, ni siquiera en desarrollo
- **API Keys**: Redactadas en logs y base de datos

### Información Logueada
- Timestamp de cada acción
- Usuario que ejecutó la acción
- Tipo de transacción
- Headers seguros (sensibles redactados)
- Metadata relevante sin datos sensibles

## Validación de Inputs

### Emails
- Formato válido (regex estricto)
- Longitud máxima 255 caracteres
- Dominios permitidos (opcional via `ALLOWED_EMAIL_DOMAINS`)

### Passwords
- Mínimo 8 caracteres, máximo 128
- Al menos un número
- Al menos una letra
- Hasheados con bcrypt (10 rounds)
- Validación mejorada con `isStrongPassword()` del módulo security

### Otros Inputs
- Sanitización de caracteres especiales (<, >)
- Límite de longitud (1000 caracteres)
- Trim de espacios

## Endpoints Públicos

Solo estos endpoints son accesibles sin autenticación:
- `/login`
- `/forgot-password`
- `/reset-password`
- `/api/auth/login`
- `/api/auth/forgot-password`
- `/api/auth/reset-password`
- `/api/hubspot/meetings/webhook`

## Endpoints de Debug Removidos

Los siguientes endpoints han sido completamente eliminados del código:
- ~~`/api/hubspot/meetings/webhook-test`~~ (ELIMINADO)
- ~~`/api/hubspot/meetings/webhook-simple`~~ (ELIMINADO)
- ~~`/api/hubspot/meetings/webhook-diagnostic`~~ (ELIMINADO)

Estos endpoints representaban un riesgo de seguridad en producción y han sido removidos permanentemente.

## Mejoras de Seguridad Implementadas (Última Revisión)

### 1. Logging Seguro en Webhook
- Todos los `console.log` reemplazados por `secureLog()` y `secureError()`
- Headers sensibles redactados antes de guardarse en base de datos
- Solo logs genéricos en producción, detalles en desarrollo

### 2. Rate Limiting Completo
- Agregado a reset-password (5 intentos / 15 min)
- Agregado a change-password (5 intentos / 15 min)
- Protección contra ataques de fuerza bruta en todos los endpoints sensibles

### 3. Validación de Passwords Mejorada
- Uso consistente de `isStrongPassword()` en todos los endpoints
- Validación de longitud máxima (128 caracteres)
- Mensajes de error claros y específicos

### 4. Protección de Datos Sensibles
- API keys nunca expuestas en logs de consola
- Headers sensibles redactados en logs de base de datos
- Función `maskSensitiveData()` para enmascarar datos cuando sea necesario

## Mejores Prácticas Implementadas

1. **Defense in Depth**: Múltiples capas de seguridad
2. **Least Privilege**: Usuarios solo tienen permisos necesarios
3. **Secure by Default**: Configuración segura por defecto
4. **Fail Securely**: Errores no exponen información sensible
5. **Security in Transit**: HTTPS en producción (HSTS)
6. **Security at Rest**: Passwords hasheados, tokens encriptados
7. **Input Validation**: Validación en cliente Y servidor
8. **Output Encoding**: React escapa automáticamente
9. **Audit Logging**: Registro de acciones importantes con datos sensibles redactados
10. **Regular Updates**: Dependencias actualizadas
11. **Secure Logging**: No exposición de datos sensibles en logs de producción
12. **Rate Limiting Universal**: Protección en todos los endpoints críticos

## Configuración del Webhook de HubSpot

Para configurar el webhook en HubSpot:

1. Ve a Settings > Integrations > Private Apps o Webhooks
2. Crea un nuevo webhook para "Engagements → Meeting"
3. URL: `https://integrations.urbix.es/api/hubspot/meetings/webhook`
4. Agrega custom header: `agendas: TU_API_KEY`
5. La API key debe coincidir con:
   - Valor configurado en Settings > Webhook API Key, O
   - Variable de entorno `HUBSPOT_WEBHOOK_SECRET`

**IMPORTANTE**: El header debe llamarse exactamente `agendas` (no `x-api-key`), ya que es el nombre personalizado configurado en HubSpot.

## Reporte de Vulnerabilidades

Si encuentras una vulnerabilidad de seguridad:

1. **NO** la publiques públicamente
2. Envía un email a: security@tu-dominio.com
3. Incluye:
   - Descripción de la vulnerabilidad
   - Pasos para reproducirla
   - Impacto potencial
   - Tu información de contacto

Responderemos dentro de 48 horas.

## Checklist de Seguridad Final

- [x] Bcrypt para passwords con validación de fuerza mejorada
- [x] Rate limiting en TODOS los endpoints sensibles (login, forgot, reset, change, settings)
- [x] Session expiration (7 días)
- [x] HTTPS en producción con HSTS
- [x] Security headers completos (CSP, XSS, Frame Options, etc.)
- [x] SQL injection protection (parametrized queries)
- [x] CSRF protection (SameSite cookies)
- [x] Input validation y sanitization mejorada
- [x] Error sanitization en producción
- [x] Webhook API key validation con header custom "agendas"
- [x] Webhook headers logging con redacción de datos sensibles
- [x] Token masking en UI
- [x] Audit logging completo con protección de datos sensibles
- [x] Role-based access control (RBAC) con permisos granulares
- [x] Password reset con tokens temporales de un solo uso
- [x] Prevención de user enumeration
- [x] XSS protection (CSP + input sanitization)
- [x] Logging seguro sin exposición de datos sensibles en producción
- [x] Debug endpoints ELIMINADOS permanentemente
- [x] Email validation robusta
- [x] Token format validation (HubSpot)
- [x] Secure logging functions (secureLog, secureError, maskSensitiveData)
- [x] Todos los console.log reemplazados por funciones seguras
- [x] Headers sensibles redactados en logs de base de datos
- [x] Autenticación del webhook funcionando correctamente

**Estado de Seguridad**: ✅ PRODUCCIÓN-READY

**Última actualización**: 22 de diciembre de 2025 - Revisión completa de seguridad con todas las mejoras implementadas
