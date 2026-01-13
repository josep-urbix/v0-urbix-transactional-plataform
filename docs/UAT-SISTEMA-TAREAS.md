# Plan de UAT - Sistema de Gestión de Tareas

## Objetivo
Validar el funcionamiento completo del Sistema de Gestión de Tareas para gestores de cuentas, incluyendo creación, asignación, comentarios, escalado automático y vinculación con wallets.

---

## Pre-requisitos

### Datos de Prueba
Ejecutar los siguientes scripts en orden:
1. `104-create-task-management-system.sql` - Crear esquema y tablas
2. `105-add-task-cron-jobs.sql` - Configurar cron jobs
3. `106-wallet-linking-one-time.sql` - Vincular wallets existentes

### Usuarios de Prueba
- **Admin**: Usuario con permisos completos
- **Gestor 1**: Usuario con rol "Gestor de Cuentas"
- **Gestor 2**: Usuario con rol "Gestor de Cuentas"
- **Supervisor**: Usuario con rol "Supervisor" e `is_supervisor=true`

---

## Casos de Prueba

### 1. Creación de Tareas Manuales

**Escenario 1.1: Crear tarea manual básica**
- **Pasos:**
  1. Login como Admin
  2. Ir a `/dashboard/tasks`
  3. Clic en "Nueva Tarea"
  4. Completar formulario:
     - Título: "Revisar documentación KYC"
     - Tipo: REVISION_KYC
     - Prioridad: MEDIA
     - Descripción: "Cliente necesita actualizar documentos"
     - Proceso: REVISION_KYC
     - Objeto Tipo: payment_account
     - Objeto ID: [wallet existente]
  5. Clic en "Crear Tarea"

- **Resultado Esperado:**
  - Tarea creada exitosamente
  - Aparece en lista "Todas las Tareas"
  - Estado: PENDIENTE
  - Fecha de vencimiento calculada según SLA

**Escenario 1.2: Crear tarea CRÍTICA**
- **Pasos:**
  1. Crear tarea con prioridad CRÍTICA
  2. Verificar emails enviados

- **Resultado Esperado:**
  - Email enviado a TODOS los administradores
  - Tarea aparece en sección "Críticas"
  - Badge rojo en el menú principal

---

### 2. Asignación de Tareas

**Escenario 2.1: Asignar tarea a gestor**
- **Pasos:**
  1. Login como Admin
  2. Ir a tarea pendiente
  3. Clic en "Asignar"
  4. Seleccionar Gestor 1
  5. Guardar

- **Resultado Esperado:**
  - Tarea asignada correctamente
  - Aparece en "Mis Tareas" de Gestor 1
  - Estado cambia a EN_PROGRESO automáticamente
  - Registro en auditoría

**Escenario 2.2: Reasignar tarea**
- **Pasos:**
  1. Tarea asignada a Gestor 1
  2. Reasignar a Gestor 2

- **Resultado Esperado:**
  - Tarea reasignada
  - Historial muestra ambas asignaciones
  - Gestor 1 ya no la ve en "Mis Tareas"

**Escenario 2.3: Asignación masiva**
- **Pasos:**
  1. Seleccionar 3 tareas pendientes (checkbox)
  2. Clic en "Asignar Seleccionadas"
  3. Elegir Gestor 1
  4. Confirmar

- **Resultado Esperado:**
  - Las 3 tareas asignadas al mismo gestor
  - Notificación de éxito

---

### 3. Sistema de Comentarios

**Escenario 3.1: Añadir comentario**
- **Pasos:**
  1. Login como Gestor 1
  2. Abrir tarea asignada
  3. Escribir comentario: "Contacté al cliente, pendiente respuesta"
  4. Enviar

- **Resultado Esperado:**
  - Comentario visible en tarea
  - Timestamp correcto
  - Avatar y nombre del usuario

**Escenario 3.2: Comentarios colaborativos**
- **Pasos:**
  1. Gestor 1 añade comentario
  2. Login como Admin en otra ventana
  3. Esperar 10 segundos (polling)
  4. Verificar que aparece el comentario sin recargar

- **Resultado Esperado:**
  - Comentario aparece automáticamente
  - Polling funciona correctamente

---

### 4. Completar Tareas

**Escenario 4.1: Completar tarea simple**
- **Pasos:**
  1. Login como Gestor 1
  2. Abrir tarea asignada
  3. Clic en "Completar Tarea"
  4. Escribir notas: "Documentación verificada y aprobada"
  5. Confirmar

- **Resultado Esperado:**
  - Tarea marcada como COMPLETADA
  - Fecha de completado registrada
  - Notas guardadas
  - Ya no aparece en "Mis Tareas"

**Escenario 4.2: Completar con desbloqueo**
- **Pasos:**
  1. Tarea vinculada a cuenta virtual BLOQUEADA
  2. Completar tarea
  3. Verificar checkbox "Desbloquear cuenta virtual"
  4. Confirmar

- **Resultado Esperado:**
  - Tarea completada
  - Cuenta virtual desbloqueada automáticamente
  - campo `vinculacion_bloqueada = false`

**Escenario 4.3: Completar sin desbloqueo**
- **Pasos:**
  1. Tarea vinculada a cuenta bloqueada
  2. Completar SIN marcar checkbox de desbloqueo
  3. Confirmar

- **Resultado Esperado:**
  - Tarea completada
  - Cuenta virtual sigue BLOQUEADA
  - Requiere acción adicional de Admin

---

### 5. Vinculación de Wallets

**Escenario 5.1: Wallet sin cuenta virtual**
- **Pasos:**
  1. Crear wallet con status=6 sin cuenta virtual
  2. Esperar ejecución del cron diario (o ejecutar manualmente)
  
- **Resultado Esperado:**
  - Tarea automática creada: VINCULACION_PENDIENTE
  - Prioridad: MEDIA
  - Contexto incluye datos del wallet

**Escenario 5.2: Vincular wallet manualmente**
- **Pasos:**
  1. Login como Admin
  2. Ir a `/dashboard/virtual-accounts/unlinked-wallets`
  3. Ver wallet sin vincular
  4. Clic en "Vincular"
  5. Confirmar

- **Resultado Esperado:**
  - Cuenta virtual creada
  - Campos vinculados: account_id, internal_id, email
  - `vinculacion_timestamp` registrado
  - Tarea completada automáticamente

**Escenario 5.3: Detección de vinculación rota**
- **Pasos:**
  1. Wallet vinculado correctamente
  2. Manualmente cambiar `payment_accounts.account_id` en DB
  3. Esperar cron diario

- **Resultado Esperado:**
  - Tarea CRITICA creada: VINCULACION_ROTA
  - Cuenta virtual BLOQUEADA automáticamente
  - Email a todos los admins
  - Contexto incluye old_value y new_value

---

### 6. Escalado Automático

**Escenario 6.1: Tarea CRÍTICA vencida**
- **Pasos:**
  1. Crear tarea CRÍTICA
  2. Modificar `fecha_vencimiento` a hace 1 hora
  3. Esperar ejecución cron SLA (cada hora)

- **Resultado Esperado:**
  - Tarea escalada a Supervisor
  - Campo `escalada = true`
  - Email enviado a Supervisor
  - Registro en `task_escalations`

**Escenario 6.2: Escalado múltiple**
- **Pasos:**
  1. 5 tareas críticas vencidas
  2. Ejecutar cron SLA

- **Resultado Esperado:**
  - Todas escaladas
  - Email único con listado completo
  - No duplicar escalados

---

### 7. Badges y Notificaciones

**Escenario 7.1: Badge en wallets**
- **Pasos:**
  1. Crear 2 tareas CRÍTICAS y 1 MEDIA para un wallet
  2. Ir a `/dashboard/investors/wallets`
  3. Verificar badge en wallet

- **Resultado Esperado:**
  - Badge muestra: "2 CRÍTICAS, 1 MEDIA"
  - Color rojo por prioridad más alta
  - Clic abre modal con lista de tareas

**Escenario 7.2: Widget en dashboard**
- **Pasos:**
  1. Login como Gestor 1 con 3 tareas asignadas
  2. Ir a `/dashboard`

- **Resultado Esperado:**
  - Widget muestra top 5 tareas más urgentes
  - Badge en header con total de tareas pendientes
  - Contador de tareas críticas sin asignar (solo admin)

---

### 8. Configuración SLA

**Escenario 8.1: Crear configuración SLA**
- **Pasos:**
  1. Login como Admin
  2. Ir a `/dashboard/tasks/sla-config`
  3. Clic "Nueva Configuración"
  4. Completar:
     - Prioridad: ALTA
     - Tipo: VINCULACION_ROTA
     - Horas asignación: 2
     - Horas resolución: 8
     - Escalar: Sí
     - Notificar: Sí
  5. Guardar

- **Resultado Esperado:**
  - Configuración creada
  - Visible en tabla
  - Aplica a nuevas tareas de ese tipo

---

### 9. Tipos de Tareas

**Escenario 9.1: Crear tipo personalizado**
- **Pasos:**
  1. Login como Admin
  2. Ir a `/dashboard/tasks/types`
  3. Crear nuevo tipo:
     - Código: AUDITORIA_SALDO
     - Nombre: Auditoría de Saldo
     - Descripción: Revisar inconsistencias en saldos

- **Resultado Esperado:**
  - Tipo creado
  - Disponible en dropdown al crear tareas

---

### 10. Permisos RBAC

**Escenario 10.1: Gestor sin permisos de desbloqueo**
- **Pasos:**
  1. Login como Gestor 1 (sin permiso VIRTUAL_ACCOUNTS:UNBLOCK)
  2. Intentar completar tarea con desbloqueo

- **Resultado Esperado:**
  - Checkbox de desbloqueo DESHABILITADO
  - Mensaje: "No tienes permisos para desbloquear cuentas"

**Escenario 10.2: Admin con todos los permisos**
- **Pasos:**
  1. Login como Admin
  2. Verificar acceso a todas las funciones

- **Resultado Esperado:**
  - Puede ver, crear, asignar, completar, desbloquear
  - Acceso a SLA config y tipos de tareas

---

## Checklist de Validación

### Funcionalidades Core
- [ ] Crear tarea manual
- [ ] Asignar tarea a usuario
- [ ] Reasignar tarea
- [ ] Asignación masiva
- [ ] Añadir comentarios
- [ ] Completar tarea
- [ ] Completar con desbloqueo
- [ ] Cancelar tarea

### Automatizaciones
- [ ] Cron detección wallets sin vincular
- [ ] Cron detección vinculaciones rotas
- [ ] Cron verificación SLA
- [ ] Escalado automático
- [ ] Bloqueo automático de cuentas
- [ ] Creación de tareas automáticas

### Notificaciones
- [ ] Email tarea crítica creada
- [ ] Email tarea próxima a vencer
- [ ] Email tarea vencida
- [ ] Email cuenta bloqueada
- [ ] Badge en header
- [ ] Badge en wallets

### UI/UX
- [ ] Dashboard principal con métricas
- [ ] Filtros y búsqueda
- [ ] Tabs de vistas
- [ ] Modal de comentarios
- [ ] Widget en dashboard
- [ ] Responsive design

### Integraciones
- [ ] Registro en sql_logs
- [ ] Registro en LemonwayTransaction
- [ ] Vinculación bidireccional wallets
- [ ] Verificación RBAC

---

## Datos de Prueba SQL

```sql
-- Crear usuarios de prueba
INSERT INTO public."User" (id, email, name, is_supervisor) VALUES
('gestor1', 'gestor1@urbix.es', 'María García', false),
('gestor2', 'gestor2@urbix.es', 'Juan Pérez', false),
('supervisor1', 'supervisor@urbix.es', 'Ana Supervisor', true);

-- Asignar roles
INSERT INTO public."UserRole" ("userId", "roleId")
SELECT 'gestor1', id FROM public."Role" WHERE name = 'gestor_cuentas'
UNION ALL
SELECT 'gestor2', id FROM public."Role" WHERE name = 'gestor_cuentas'
UNION ALL
SELECT 'supervisor1', id FROM public."Role" WHERE name = 'supervisor';

-- Crear wallets de prueba
INSERT INTO payments.payment_accounts (account_id, internal_id, email, status, balance, first_name, last_name)
VALUES 
('TEST_WALLET_001', 1001, 'test1@example.com', '6', 1000.00, 'Test', 'User 1'),
('TEST_WALLET_002', 1002, 'test2@example.com', '6', 500.00, 'Test', 'User 2'),
('TEST_WALLET_003', 1003, 'test3@example.com', '3', 0.00, 'Test', 'User 3');

-- Crear tareas de prueba variadas
INSERT INTO tasks.tasks (tipo, titulo, descripcion, prioridad, proceso, objeto_tipo, objeto_id, estado, creado_por)
VALUES 
('VINCULACION_PENDIENTE', 'Vincular wallet TEST_WALLET_001', 'Wallet sin cuenta virtual', 'MEDIA', 'VINCULACION_WALLETS', 'payment_account', 'TEST_WALLET_001', 'PENDIENTE', 'SISTEMA'),
('REVISION_KYC', 'Revisar documentación cliente', 'Documentos pendientes', 'ALTA', 'REVISION_KYC', 'payment_account', 'TEST_WALLET_002', 'PENDIENTE', 'admin'),
('VERIFICACION_SALDOS', 'Auditar saldos inconsistentes', 'Diferencia de 100 EUR', 'CRITICA', 'VERIFICACION_SALDOS', 'cuenta_virtual', gen_random_uuid()::TEXT, 'PENDIENTE', 'SISTEMA');
```

---

## Criterios de Aceptación

### Must Have (Crítico)
- ✅ Todas las tareas automáticas se crean correctamente
- ✅ Escalado automático funciona según SLA
- ✅ Cuentas virtuales se bloquean/desbloquean correctamente
- ✅ Emails se envían en todos los escenarios
- ✅ Permisos RBAC se respetan

### Should Have (Importante)
- ✅ Comentarios en tiempo real (polling)
- ✅ Badges visuales en wallets
- ✅ Widget en dashboard principal
- ✅ Asignación masiva
- ✅ Auditoría completa de cambios

### Nice to Have (Deseable)
- ✅ Plantillas de tareas
- ✅ Configuración SLA por UI
- ✅ Exportar reportes
- ✅ Gráficos de métricas

---

## Reporte de Bugs

| ID | Descripción | Severidad | Estado | Asignado |
|----|-------------|-----------|--------|----------|
| - | - | - | - | - |

---

## Notas Finales
- Ejecutar UAT en entorno de staging antes de producción
- Validar con usuarios reales (gestores de cuentas)
- Medir tiempos de respuesta en operaciones críticas
- Verificar logs y trazabilidad completa
