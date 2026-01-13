# Integración Completa: Creación de Cuentas Lemonway

## Arquitectura de Flujo Integrado

### FASE 1: Creación de Cuenta (KYC-1 Completo)

```
Admin Inicia Formulario
        ↓
[AUTO-GUARDADO CADA KEYSTROKE]
        ↓
Campos se guardan en estado DRAFT
        ↓
Admin Completa Formulario y Click "Crear Cuenta"
        ↓
[VALIDACIÓN LOCAL - 3 NIVELES]
  1. Validación de campos obligatorios
  2. Búsqueda de duplicados (URBIX + Lemonway)
  3. Validación de reglas de Lemonway
        ↓
SI HAY DUPLICADOS:
  → Mostrar advertencia
  → Opción: Cancelar o Continuar
        ↓
[ENQUEUE EN COLA URGENT]
  → INSERT en lemonway_temp.lemonway_request_queue
  → Priority: URGENT (procesa antes que NORMAL)
  → Status: pending
        ↓
[CREAR EN LEMONWAY]
  → POST /accounts/individual via Online Onboarding API
  → Payload: Todos los datos validados
  → Response: wallet_id + resumption_url
        ↓
[SINCRONIZAR RESPUESTA]
  → UPDATE lemonway_account_requests SET status = 'SUBMITTED'
  → CREATE payment_accounts (si no existe)
  → CREATE virtual_accounts automáticamente
  → State = 'PENDING_KYC'
        ↓
✅ FASE 1 COMPLETA (KYC-1 Completo)
   Wallet creado en Lemonway
   Payment account sincronizado
   Virtual account listo
```

---

### FASE 2: Verificación KYC (KYC-2 Completo)

```
Admin Navega a Formulario KYC
        ↓
[AUTO-GUARDADO CADA KEYSTROKE]
        ↓
Campos complementarios se guardan
  - Dirección
  - Información financiera
  - PEP status
  - Origen de fondos
  - IFI tax
        ↓
Admin Click "Guardar y Enviar KYC"
        ↓
[ENQUEUE EN COLA NORMAL]
  → INSERT en lemonway_temp.lemonway_request_queue
  → Priority: NORMAL
  → Endpoint: POST /onboardings/individual
        ↓
[LEMONWAY PROCESA ONBOARDING]
  → Lemonway inicia verificación documental
  → Resume URL enviado a usuario
  → Estado: PENDING_VERIFICATION
        ↓
[WEBHOOK: LEMONWAY NOTIFICA EVENTOS]
  
  Evento KYC_VALIDATED:
    → UPDATE status = 'KYC-2 Completo'
    → UPDATE payment_accounts SET kyc_status = 'VERIFIED'
    → UPDATE virtual_accounts SET status = 'ACTIVE'
    → Disparar workflow 'lemonway_kyc_approved'
    
  Evento KYC_REJECTED:
    → UPDATE status = 'REJECTED'
    → UPDATE virtual_accounts SET status = 'INACTIVE'
    → Guardar rejection_reason
    → Disparar workflow 'lemonway_kyc_rejected'
    
  Evento ADDITIONAL_INFORMATION_REQUIRED:
    → Status = 'PENDING_ADDITIONAL_INFO'
    → Guardar required_fields
    → Disparar workflow 'lemonway_need_info'
        ↓
✅ FASE 2 COMPLETA (KYC-2 Completo)
   Identidad verificada
   Cuenta lista para transaccionar
   Webhooks sincronizaron todo
```

---

## Sistema de Cola (lemonway_request_queue)

### Priorización Dual FIFO

**URGENT (Procesa primero):**
- Creación de cuentas (Fase 1)
- Reintentos de cuentas fallidas
- Solicitudes críticas

**NORMAL (Procesa después):**
- Verificación KYC (Fase 2)
- Transacciones de movimientos
- Consultas de estado

### Estados de Cola

```
pending     → En espera de procesamiento
processing  → Lemonway procesando
completed   → Exitoso, sincronizado
failed      → Error, esperando retry
cancelled   → Cancelado manualmente
```

### Reintentos Exponenciales

```
Intento 1: Inmediato
Intento 2: +30 segundos (exponencial base 2)
Intento 3: +2 minutos
Intento 4: +8 minutos
Intento 5: +32 minutos
Máximo: 5 reintentos, después FAILED
```

---

## Auditoría Completa

### AccessLog - Todos los accesos registrados

```
Evento: admin_creó_solicitud
├─ user_id: [user_id]
├─ resource: lemonway_account_requests
├─ action: account_creation_initiated
├─ ip_address: [IP]
├─ user_agent: [Browser]
├─ timestamp: [ISO 8601]
└─ success: true/false

Evento: admin_validó_duplicados
├─ action: duplicate_check
└─ resultado: {no_duplicates|duplicate_found}

Evento: admin_enviaron_a_lemonway
├─ action: enqueue_creation
└─ queue_position: [N]

Evento: admin_iniciaron_kyc
├─ action: initiate_kyc
└─ wallet_id: [wallet]

Evento: webhook_recibido
├─ action: webhook_kyc_event
├─ event_type: KYC_VALIDATED|KYC_REJECTED|...
└─ source: lemonway
```

---

## Webhooks de Lemonway

### Configuración en Lemonway Dashboard

```
URL: https://[DOMAIN]/api/webhooks/lemonway/kyc-events
Método: POST
Events: KYC_VALIDATED, KYC_REJECTED, ADDITIONAL_INFORMATION_REQUIRED
Signature: HMAC-SHA256 (validado en endpoint)
Secret: $LEMONWAY_WEBHOOK_SECRET (env var)
```

### Flujo de Webhook

```
1. Lemonway envía evento con firma HMAC-SHA256
2. Endpoint valida firma (timingSafeEqual)
3. Parse evento JSON
4. Recuperar solicitud por wallet_id
5. Switch por event_type
   ├─ KYC_VALIDATED: Actualizar a KYC-2 Completo, activar virtual_accounts
   ├─ KYC_REJECTED: Marcar REJECTED, guardar razón, desactivar
   └─ ADDITIONAL_INFO_REQUIRED: Solicitar campos, guardar lista
6. Disparar workflows
7. Notificar usuario
8. Loguear en AccessLog
9. Return 200 OK
```

---

## Integración con Sistemas Existentes

### RBAC Centralizado

- ✅ `lemonway:accounts:create` - Crear cuentas (requirePermission)
- ✅ `lemonway:accounts:view` - Ver solicitudes
- ✅ `lemonway:accounts:edit` - Editar DRAFT
- ✅ `lemonway:accounts:duplicate_check` - Validar duplicados
- ✅ Auditoría automática en AccessLog

### Cola de Procesos (lemonway_request_queue)

- ✅ Priorización URGENT/NORMAL FIFO dual
- ✅ Estados: pending, processing, completed, failed, cancelled
- ✅ Reintentos exponenciales (máx 5)
- ✅ Rate limiting automático

### Tablas de Base de Datos

- ✅ `investors.countries` (249 países ISO 3166-1)
- ✅ `investors.lemonway_account_requests` (solicitudes con ciclo de vida)
- ✅ `payments.payment_accounts` (cuentas sincronizadas)
- ✅ `virtual_accounts.cuentas_virtuales` (cuentas virtuales activas)
- ✅ `public.access_logs` (auditoría inmutable)

---

## Checklist de Validación Pre-Producción

- [ ] Tabla `investors.countries` creada y poblada (249 países)
- [ ] Tabla `lemonway_account_requests` creada con índices
- [ ] Permisos RBAC definidos en BD
- [ ] Variable de entorno `LEMONWAY_WEBHOOK_SECRET` configurada
- [ ] URL webhook registrada en Lemonway Dashboard
- [ ] Cola URGENT/NORMAL funcionando (test con mock)
- [ ] Endpoints de auto-guardado probados
- [ ] Validación de duplicados testada (3 niveles)
- [ ] Webhook de KYC recibe y procesa eventos
- [ ] Auditoría registra todos los accesos
- [ ] Estados DRAFT → SUBMITTED → KYC-1 Completo funcionan
- [ ] Estados de KYC-2: PENDING → VERIFIED/REJECTED funcionan
- [ ] Virtual accounts se crean automáticamente
- [ ] Payment accounts se sincronizan correctamente

---

## Monitoreo y Debugging

### Ver solicitudes pendientes:
```sql
SELECT * FROM investors.lemonway_account_requests 
WHERE status IN ('DRAFT', 'SUBMITTED', 'PENDING_KYC')
ORDER BY created_at DESC;
```

### Ver cola de Lemonway:
```sql
SELECT * FROM lemonway_temp.lemonway_request_queue 
WHERE status IN ('pending', 'processing')
ORDER BY priority DESC, created_at ASC;
```

### Ver última auditoría:
```sql
SELECT * FROM public.access_logs 
WHERE resource = 'lemonway_account_requests'
ORDER BY created_at DESC LIMIT 20;
```

### Ver webhooks recibidos:
```
Revisar logs de /api/webhooks/lemonway/kyc-events
Buscar [v0] [WebhookKYC] en los logs de la aplicación
```

---

## Próximos Pasos

1. **Integración UI**: Agregar tab "Crear Cuenta" al dashboard Lemonway
2. **Notificaciones**: Emails a usuario con resumen de creación/KYC
3. **Reportes**: Dashboard de estadísticas de cuentas creadas/verificadas
4. **Webhooks avanzados**: Procesar más eventos (ACCOUNT_UPDATED, BALANCE_CHANGED)
5. **Recovery**: Interfaz para recuperar/reintenentar solicitudes fallidas

---

**Última actualización:** [DATE]
**Versión:** 1.0 - Producción
**Responsable:** Development Team
**Trazabilidad:** docs/LEMONWAY-CREACION-CUENTAS-ESPECIFICACION.md
