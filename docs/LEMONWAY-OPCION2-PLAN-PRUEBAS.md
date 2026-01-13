# PLAN DE PRUEBAS PORMENORIZADO - OPCIÓN 2 Lemonway
# Documento de Testing Ejecutable por v0

## TABLA DE CONTENIDOS

1. Estrategia de Pruebas
2. Matriz de Cobertura
3. Suite de Pruebas Unitarias
4. Suite de Pruebas de Integración
5. Suite de Pruebas de API
6. Suite de Pruebas RBAC/Seguridad
7. Suite de Pruebas de Cola
8. Suite de Pruebas de UI/Frontend
9. Suite de Pruebas de Performance
10. Validaciones de Base de Datos
11. Checklist Manual de Testing
12. Rollback y Recovery Testing

---

## 1. ESTRATEGIA DE PRUEBAS

### 1.1 Enfoque General

\`\`\`
Pirámide de Testing:
        🔺 E2E (5% - 3 tests)
       / \
      /   \  API (25% - 15 tests)
     /     \
    / Unit  \ (70% - 35 tests)
   /         \
  ___________
\`\`\`

- **Unitarias (70%)**: Lógica pura, funciones isoladas, sin BD
- **Integración (25%)**: APIs + BD, flujos completos
- **E2E (5%)**: Flujos críticos de usuario completo

### 1.2 Ambientes de Testing

\`\`\`
┌─────────────────────────────────────┐
│  Development (Local)                │
│  - SQLite o Neon test DB            │
│  - Sandbox Lemonway API             │
│  - Mocking de webhooks              │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  Staging (Pre-prod)                 │
│  - Neon staging DB (datos de test)  │
│  - Lemonway sandbox completo        │
│  - Webhooks reales internos          │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  Production (Go-live)               │
│  - Neon production DB               │
│  - Lemonway producción              │
│  - Webhooks reales                  │
└─────────────────────────────────────┘
\`\`\`

### 1.3 Métricas de Éxito

- **Cobertura de código**: ≥ 80%
- **Cobertura de rutas**: ≥ 95% (todos los endpoints)
- **Cobertura de permisos**: ≥ 100% (todos los 26)
- **Performance**: < 500ms para API explorer
- **SLA**: 99.9% uptime

---

## 2. MATRIZ DE COBERTURA

| Componente | Unitario | Integración | E2E | Manual | Total |
|------------|----------|-------------|-----|--------|-------|
| Queue Manager | ✅ 12 | ✅ 4 | ⚠️ 1 | ✅ | 17 |
| RBAC Middleware | ✅ 8 | ✅ 3 | ⚠️ 1 | ✅ | 12 |
| API Explorer | ✅ 6 | ✅ 5 | ⚠️ 2 | ✅ | 13 |
| Query Manager | ✅ 10 | ✅ 3 | ⚠️ 1 | ✅ | 14 |
| Field Mappings | ✅ 5 | ✅ 2 | ⚠️ 1 | ✅ | 8 |
| Snapshots | ✅ 7 | ✅ 2 | ⚠️ 0 | ✅ | 9 |
| Dry-run Mode | ✅ 8 | ✅ 4 | ⚠️ 2 | ✅ | 14 |
| Webhooks | ✅ 4 | ✅ 3 | ⚠️ 1 | ✅ | 8 |
| Monitoring | ✅ 5 | ✅ 2 | ⚠️ 0 | ✅ | 7 |
| UI Components | ✅ 4 | ✅ 2 | ⚠️ 3 | ✅ | 9 |
| **TOTAL** | **59** | **30** | **12** | ✅ | **101** |

---

## 3. SUITE DE PRUEBAS UNITARIAS (59 tests)

### 3.1 Pruebas de Queue Manager (12 tests)

**Archivo: `lib/lemonway/queue-manager.test.ts`**

\`\`\`typescript
describe('QueueManager - Pruebas Unitarias', () => {
  
  // CATEGORÍA: Inserción en cola
  describe('insertQueueItem', () => {
    test('✅ Debe insertar item NORMAL en cola correctamente', () => {
      // Arrange: Crear item normal
      // Act: Insertar
      // Assert: Verificar posición en cola NORMAL
    })
    
    test('✅ Debe insertar item URGENT en cola correctamente', () => {
      // Arrange: Crear item urgente
      // Act: Insertar
      // Assert: Verificar posición en cola URGENT
    })
    
    test('✅ Debe rechazar item sin categoría', () => {
      // Arrange: Item sin category
      // Act: Intentar insertar
      // Assert: Debe lanzar error ValidationError
    })
    
    test('✅ Debe asignar timestamp_created automáticamente', () => {
      // Act: Insertar item
      // Assert: Verificar timestamp_created es now()
    })
  })
  
  // CATEGORÍA: Extracción de cola
  describe('dequeueNext', () => {
    test('✅ Debe extraer URGENT antes que NORMAL', () => {
      // Arrange: 2 items (1 urgente, 1 normal)
      // Act: Dequeue
      // Assert: Debe ser el urgente
    })
    
    test('✅ Debe respetar FIFO dentro de URGENT', () => {
      // Arrange: 3 items URGENT (orden: A, B, C)
      // Act: Dequeue 3 veces
      // Assert: Debe ser A, B, C (en orden)
    })
    
    test('✅ Debe respetar FIFO dentro de NORMAL', () => {
      // Arrange: 3 items NORMAL (orden: X, Y, Z)
      // Act: Dequeue 3 veces
      // Assert: Debe ser X, Y, Z (en orden)
    })
    
    test('✅ Debe retornar null si cola está vacía', () => {
      // Act: Dequeue cola vacía
      // Assert: Debe retornar null
    })
    
    test('✅ Debe actualizar status a PROCESSING', () => {
      // Arrange: Item en cola
      // Act: Dequeue
      // Assert: Verificar status = PROCESSING
    })
  })
  
  // CATEGORÍA: Estadísticas
  describe('getQueueStats', () => {
    test('✅ Debe retornar conteos correctos de cola', () => {
      // Arrange: 3 URGENT, 5 NORMAL, 2 FAILED
      // Act: getQueueStats()
      // Assert: {urgent: 3, normal: 5, failed: 2, total: 10}
    })
    
    test('✅ Debe calcular edad promedio de item', () => {
      // Arrange: Items con diferentes edades
      // Act: getQueueStats()
      // Assert: avg_age coincide con cálculo manual
    })
    
    test('✅ Debe retornar tiempo estimado de procesamiento', () => {
      // Act: getQueueStats()
      // Assert: estimated_wait_time > 0
    })
  })
})
\`\`\`

### 3.2 Pruebas de RBAC Middleware (8 tests)

**Archivo: `lib/auth/rbac-middleware.test.ts`**

\`\`\`typescript
describe('RBAC Middleware - Pruebas Unitarias', () => {
  
  // CATEGORÍA: Verificación de permisos
  describe('hasPermission', () => {
    test('✅ Debe permitir SuperAdmin en todo', () => {
      // Act: hasPermission(superAdminUser, 'lemonway:*')
      // Assert: true
    })
    
    test('✅ Debe permitir usuario con permiso específico', () => {
      // Act: hasPermission(adminUser, 'lemonway:config:read')
      // Assert: true
    })
    
    test('✅ Debe denegar usuario sin permiso', () => {
      // Act: hasPermission(operatorUser, 'lemonway:config:write')
      // Assert: false
    })
    
    test('✅ Debe usar caché de permisos (5 min)', () => {
      // Arrange: Llamar hasPermission 2x en < 1 min
      // Assert: Segunda llamada debe usar caché (no consultó BD)
    })
    
    test('✅ Debe invalidar caché al actualizar permisos', () => {
      // Arrange: hasPermission cached
      // Act: updatePermission()
      // Assert: hasPerm,ission ahora consulta BD actualizada
    })
    
    test('✅ Debe soportar wildcards en permisos', () => {
      // Act: hasPermission(adminUser, 'lemonway:*')
      // Assert: true (si tiene algún permiso lemonway:*)
    })
    
    test('✅ Debe denegar null si usuario no autenticado', () => {
      // Act: hasPermission(null, 'lemonway:read')
      // Assert: false
    })
    
    test('✅ Debe registrar acceso denegado en AccessLog', () => {
      // Arrange: Usuario sin permiso
      // Act: requireAdmin(...) falla
      // Assert: AccessLog contiene registro de denegación
    })
  })
})
\`\`\`

### 3.3 Pruebas de Query Manager (10 tests)

**Archivo: `lib/lemonway/query-manager.test.ts`**

\`\`\`typescript
describe('QueryManager - Pruebas Unitarias', () => {
  
  describe('createCustomQuery', () => {
    test('✅ Debe crear query con validación de schema', () => {
      // Act: Crear query con schema válido
      // Assert: Query guardada con id
    })
    
    test('✅ Debe rechazar query con schema inválido', () => {
      // Act: Crear query con schema roto
      // Assert: Error ValidationError
    })
    
    test('✅ Debe auto-incrementar versión', () => {
      // Act: Crear query v1, luego actualizar
      // Assert: Nueva versión es v2
    })
    
    test('✅ Debe guardar snapshot de versión anterior', () => {
      // Act: Actualizar query existente
      // Assert: Versión anterior guardada en snapshots
    })
    
    test('✅ Debe validar nombre único de query', () => {
      // Arrange: Query "GetAccounts" ya existe
      // Act: Crear otra "GetAccounts"
      // Assert: Error DuplicateError
    })
    
    test('✅ Debe detectar SQL injection en query', () => {
      // Act: Crear query con DROP TABLE en SQL
      // Assert: Error SecurityError
    })
    
    test('✅ Debe castear campos automáticamente', () => {
      // Arrange: Query con campos custom
      // Act: Usar query
      // Assert: Campos casteados al type correcto
    })
    
    test('✅ Debe generar documentación automática', () => {
      // Act: Crear query
      // Assert: docs.md generado con ejemplos
    })
    
    test('✅ Debe permitir rollback a versión anterior', () => {
      // Arrange: Query en v3
      // Act: rollbackVersion(2)
      // Assert: Query vuelve a v2
    })
    
    test('✅ Debe exportar query en formato Postman', () => {
      // Act: exportAsPostman(query)
      // Assert: Retorna JSON válido de Postman
    })
  })
})
\`\`\`

### 3.4 Pruebas de Dry-run Mode (8 tests)

**Archivo: `lib/lemonway/dry-run-mode.test.ts`**

\`\`\`typescript
describe('DryRunMode - Pruebas Unitarias', () => {
  
  describe('executeDryRun', () => {
    test('✅ Debe ejecutar sin cambiar BD (rollback automático)', () => {
      // Arrange: DB con 5 items
      // Act: executeDryRun(updateQuery)
      // Assert: DB sigue con 5 items, pero response es correcta
    })
    
    test('✅ Debe retornar mismo response que ejecución real', () => {
      // Act: Comparar dryRun vs real
      // Assert: Ambas retornan mismo JSON
    })
    
    test('✅ Debe capturar queries SQL ejecutadas', () => {
      // Act: executeDryRun(complexQuery)
      // Assert: capturedQueries contiene todas las SQL
    })
    
    test('✅ Debe medir performance de query', () => {
      // Act: executeDryRun(query)
      // Assert: duration_ms > 0 y registrada
    })
    
    test('✅ Debe simular errores de Lemonway API', () => {
      // Act: executeDryRun con mock error 500
      // Assert: Retorna mismo error que real, sin afectar BD
    })
    
    test('✅ Debe permitir múltiples dry-runs concurrentes', () => {
      // Act: Lanzar 5 dry-runs simultáneamente
      // Assert: Todos ejecutan sin conflictos
    })
    
    test('✅ Debe registrar dry-run en OperationLog', () => {
      // Act: executeDryRun()
      // Assert: OperationLog contiene registro mode=DRY_RUN
    })
    
    test('✅ Debe permitir guardar resultado como snapshot', () => {
      // Act: executeDryRun + saveSnapshot()
      // Assert: Snapshot creado para comparar después
    })
  })
})
\`\`\`

### 3.5 Pruebas de Snapshots (7 tests)

**Archivo: `lib/lemonway/snapshots.test.ts`**

\`\`\`typescript
describe('Snapshots - Pruebas Unitarias', () => {
  
  describe('createSnapshot', () => {
    test('✅ Debe capturar request completo', () => {
      // Act: createSnapshot(request)
      // Assert: Snapshot contiene: headers, body, params, timestamp
    })
    
    test('✅ Debe capturar response completo', () => {
      // Act: createSnapshot(response)
      // Assert: Snapshot contiene: status, headers, body, duration
    })
    
    test('✅ Debe enmascarar datos sensibles en snapshot', () => {
      // Arrange: Request con API token
      // Act: createSnapshot()
      // Assert: Token está hasheado, no visible en claro
    })
    
    test('✅ Debe comprimir payload grande', () => {
      // Arrange: Response de 5MB
      // Act: createSnapshot()
      // Assert: Snapshot comprimido, size < 500KB
    })
    
    test('✅ Debe comparar 2 snapshots y retornar diff', () => {
      // Arrange: Snapshot A y B
      // Act: compareSnapshots(A, B)
      // Assert: Retorna diff detallado
    })
    
    test('✅ Debe generar reporte visual de diferencias', () => {
      // Act: compareSnapshots con options.format='html'
      // Assert: Retorna HTML con diff coloreado
    })
    
    test('✅ Debe permitir guardar snapshot con nombre y tags', () => {
      // Act: createSnapshot(..., {name: 'investmentFlow', tags: ['critical']})
      // Assert: Snapshot guardado y queryable por tags
    })
  })
})
\`\`\`

[Continúa con otras suites: Field Mappings (5), Webhooks (4), Monitoring (5), UI Components (4)]

---

## 4. SUITE DE PRUEBAS DE INTEGRACIÓN (30 tests)

### 4.1 Pruebas de Integración Queue + RBAC (4 tests)

**Archivo: `__tests__/integration/queue-rbac.integration.test.ts`**

\`\`\`typescript
describe('Queue Manager + RBAC - Pruebas de Integración', () => {
  
  beforeEach(async () => {
    await setupTestDatabase()
    await seedTestUser()
    await seedTestPermissions()
  })
  
  afterEach(async () => {
    await cleanupTestDatabase()
  })
  
  test('✅ Debe permitir al usuario con permiso queue:insert insertar item', async () => {
    // Arrange
    const user = await getTestUser('LemonwayAdmin')
    const item = createTestQueueItem('URGENT')
    
    // Act
    const result = await insertQueueItem(user, item)
    
    // Assert
    expect(result.success).toBe(true)
    expect(result.id).toBeDefined()
    expect(await getQueueItemCount('URGENT')).toBe(1)
  })
  
  test('✅ Debe denegar al usuario sin permiso queue:insert', async () => {
    // Arrange
    const user = await getTestUser('LemonwayOperator')
    const item = createTestQueueItem('URGENT')
    
    // Act & Assert
    expect(async () => {
      await insertQueueItem(user, item)
    }).rejects.toThrow('PERMISSION_DENIED')
  })
  
  test('✅ Debe registrar operación en AccessLog + OperationLog', async () => {
    // Arrange
    const user = await getTestUser('LemonwayAdmin')
    const item = createTestQueueItem('NORMAL')
    
    // Act
    await insertQueueItem(user, item)
    
    // Assert
    const accessLog = await queryDb(
      'SELECT * FROM public."AccessLog" WHERE resource = ? AND user_email = ?',
      ['lemonway:queue:insert', user.email]
    )
    expect(accessLog.length).toBe(1)
    expect(accessLog[0].allowed).toBe(true)
  })
  
  test('✅ Debe invalidar caché de permisos tras actualizar rol', async () => {
    // Arrange
    const user = await getTestUser('LemonwayOperator')
    const item = createTestQueueItem('URGENT')
    
    // Act 1: Primer intento debe fallar
    expect(async () => {
      await insertQueueItem(user, item)
    }).rejects.toThrow('PERMISSION_DENIED')
    
    // Act 2: Dar permiso al usuario
    await grantPermissionToUser(user, 'lemonway:queue:*')
    
    // Act 3: Segundo intento debe éxito
    const result = await insertQueueItem(user, item)
    expect(result.success).toBe(true)
  })
})
\`\`\`

### 4.2 Pruebas de Integración API Explorer + Dry-run (5 tests)

**Archivo: `__tests__/integration/api-explorer-dryrun.integration.test.ts`**

\`\`\`typescript
describe('API Explorer + Dry-run - Pruebas de Integración', () => {
  
  beforeEach(async () => {
    setupTestLemonwayAPI()
    await seedTestQueries()
  })
  
  test('✅ Debe ejecutar query en dry-run sin cambiar datos reales', async () => {
    // Arrange
    const query = await getTestQuery('GetWalletsBalance')
    const params = { wallet_id: 'TEST_WALLET_001' }
    
    // Act: Dry-run
    const dryRunResult = await executeQuery(query, params, { dryRun: true })
    
    // Assert
    expect(dryRunResult.isDryRun).toBe(true)
    expect(dryRunResult.response).toBeDefined()
    
    // Verificar que no hay cambios en BD
    const dbChanges = await getDbChanges('since_last_checkpoint')
    expect(dbChanges.length).toBe(0)
  })
  
  test('✅ Debe retornar mismo resultado en dry-run que en producción', async () => {
    // Arrange
    const query = await getTestQuery('GetTransactions')
    const params = { account_id: 'TEST_ACC_001', limit: 10 }
    
    // Act
    const dryRunResult = await executeQuery(query, params, { dryRun: true })
    const prodResult = await executeQuery(query, params, { dryRun: false })
    
    // Assert: La data debe ser idéntica
    expect(dryRunResult.response).toEqual(prodResult.response)
    expect(dryRunResult.duration_ms).toBeLessThan(prodResult.duration_ms) // Dry-run más rápido
  })
  
  test('✅ Debe permitir comparar snapshot antes/después', async () => {
    // Arrange
    const query = await getTestQuery('UpdateWalletBalance')
    const beforeSnapshot = await createSnapshot({ type: 'db_state' })
    
    // Act
    const result = await executeQuery(query, { amount: 1000 })
    const afterSnapshot = await createSnapshot({ type: 'db_state' })
    
    // Assert
    const diff = compareSnapshots(beforeSnapshot, afterSnapshot)
    expect(diff.changes.length).toBeGreaterThan(0)
    expect(diff.changes[0].table).toBe('lemonway_temp.wallets')
  })
  
  test('✅ Debe capturar queries SQL ejecutadas en dry-run', async () => {
    // Arrange
    const query = await getTestQuery('ComplexMultiJoinQuery')
    
    // Act
    const result = await executeQuery(query, {}, { 
      dryRun: true,
      captureSQL: true 
    })
    
    // Assert
    expect(result.executedSQL.length).toBeGreaterThan(0)
    expect(result.executedSQL[0]).toContain('SELECT')
  })
  
  test('✅ Debe simular errores de Lemonway en dry-run', async () => {
    // Arrange
    const query = await getTestQuery('GetAccounts')
    mockLemonwayAPI({ statusCode: 503 })
    
    // Act
    const result = await executeQuery(query, {}, { dryRun: true })
    
    // Assert
    expect(result.error).toBeDefined()
    expect(result.error.code).toBe('SERVICE_UNAVAILABLE')
    expect(result.isDryRun).toBe(true)
  })
})
\`\`\`

### 4.3 Pruebas de Integración Query Manager + Versionado (3 tests)

**Archivo: `__tests__/integration/query-versioning.integration.test.ts`**

\`\`\`typescript
describe('Query Manager + Versionado - Pruebas de Integración', () => {
  
  test('✅ Debe crear, actualizar, y rollback de query', async () => {
    // Act 1: Crear query v1
    let query = await createQuery({
      name: 'GetInvestments',
      endpoint: '/api/GetInvestments',
      method: 'POST'
    })
    expect(query.version).toBe(1)
    const v1Id = query.id
    
    // Act 2: Actualizar query → v2
    query = await updateQuery(v1Id, {
      endpoint: '/api/GetInvestmentsV2'
    })
    expect(query.version).toBe(2)
    
    // Act 3: Actualizar query → v3
    query = await updateQuery(v1Id, {
      timeout: 5000
    })
    expect(query.version).toBe(3)
    
    // Act 4: Rollback a v1
    query = await rollbackQuery(v1Id, 1)
    expect(query.version).toBe(1)
    expect(query.endpoint).toBe('/api/GetInvestments')
    
    // Assert: Verificar historial
    const history = await getQueryHistory(v1Id)
    expect(history.length).toBe(4) // v1, v2, v3, rollback to v1
  })
  
  test('✅ Debe mantener auditoría completa de cambios', async () => {
    // Arrange
    const query = await createQuery({ name: 'TestQuery' })
    
    // Act
    await updateQuery(query.id, { description: 'Updated' })
    await updateQuery(query.id, { timeout: 10000 })
    
    // Assert
    const audit = await getQueryAuditLog(query.id)
    expect(audit.length).toBe(3) // 1 create + 2 updates
    expect(audit[0].action).toBe('CREATE')
    expect(audit[1].action).toBe('UPDATE')
    expect(audit[1].changed_fields).toContain('description')
    expect(audit[2].changed_fields).toContain('timeout')
  })
  
  test('✅ Debe permitir exportar query en diferentes formatos', async () => {
    // Arrange
    const query = await createQuery({
      name: 'ExportTest',
      endpoint: '/api/test'
    })
    
    // Act & Assert
    const postmanJson = await exportQuery(query.id, 'postman')
    expect(postmanJson.name).toBe('ExportTest')
    expect(postmanJson.url).toBe(LEMONWAY_BASE_URL + '/api/test')
    
    const curlCommand = await exportQuery(query.id, 'curl')
    expect(curlCommand).toContain('curl')
    expect(curlCommand).toContain(LEMONWAY_BASE_URL)
  })
})
\`\`\`

[Continúa con más suites de integración...]

---

## 5. SUITE DE PRUEBAS DE API (15 tests)

### 5.1 Endpoint: POST /api/admin/lemonway/queue/insert

**Archivo: `__tests__/api/queue-insert.api.test.ts`**

\`\`\`typescript
describe('POST /api/admin/lemonway/queue/insert', () => {
  
  test('✅ Debe retornar 201 al insertar item válido', async () => {
    const response = await fetch('/api/admin/lemonway/queue/insert', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testAdminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        category: 'URGENT',
        operation_type: 'GetWallets',
        payload: { wallet_id: 'TEST_001' }
      })
    })
    
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.id).toBeDefined()
    expect(data.category).toBe('URGENT')
  })
  
  test('✅ Debe retornar 400 si falta category', async () => {
    const response = await fetch('/api/admin/lemonway/queue/insert', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${testAdminToken}` },
      body: JSON.stringify({ operation_type: 'GetWallets' })
    })
    
    expect(response.status).toBe(400)
    const error = await response.json()
    expect(error.error).toContain('category')
  })
  
  test('✅ Debe retornar 403 si usuario no tiene permiso', async () => {
    const response = await fetch('/api/admin/lemonway/queue/insert', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testOperatorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ category: 'NORMAL' })
    })
    
    expect(response.status).toBe(403)
  })
  
  test('✅ Debe retornar 401 si no autenticado', async () => {
    const response = await fetch('/api/admin/lemonway/queue/insert', {
      method: 'POST',
      body: JSON.stringify({ category: 'URGENT' })
    })
    
    expect(response.status).toBe(401)
  })
  
  test('✅ Debe registrar en AccessLog', async () => {
    await fetch('/api/admin/lemonway/queue/insert', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${testAdminToken}` },
      body: JSON.stringify({ category: 'NORMAL' })
    })
    
    const accessLog = await queryDb(
      'SELECT * FROM public."AccessLog" WHERE resource = ? ORDER BY created_at DESC LIMIT 1',
      ['lemonway:queue:insert']
    )
    expect(accessLog[0].allowed).toBe(true)
    expect(accessLog[0].userEmail).toBe('admin@test.com')
  })
})
\`\`\`

### 5.2 Endpoint: GET /api/admin/lemonway/queue/stats

**Archivo: `__tests__/api/queue-stats.api.test.ts`**

\`\`\`typescript
describe('GET /api/admin/lemonway/queue/stats', () => {
  
  beforeEach(async () => {
    await insertQueueItems([
      { category: 'URGENT', status: 'PENDING', qty: 5 },
      { category: 'NORMAL', status: 'PENDING', qty: 12 },
      { category: 'NORMAL', status: 'PROCESSING', qty: 3 },
      { category: 'NORMAL', status: 'FAILED', qty: 2 }
    ])
  })
  
  test('✅ Debe retornar estadísticas correctas', async () => {
    const response = await fetch('/api/admin/lemonway/queue/stats', {
      headers: { 'Authorization': `Bearer ${testAdminToken}` }
    })
    
    expect(response.status).toBe(200)
    const stats = await response.json()
    
    expect(stats).toEqual({
      urgent: { pending: 5, processing: 0, failed: 0, total: 5 },
      normal: { pending: 12, processing: 3, failed: 2, total: 17 },
      all: { total: 22, avg_age_seconds: expect.any(Number) }
    })
  })
  
  test('✅ Debe retornar 403 si usuario no tiene permiso', async () => {
    const response = await fetch('/api/admin/lemonway/queue/stats', {
      headers: { 'Authorization': `Bearer ${testLimitedToken}` }
    })
    
    expect(response.status).toBe(403)
  })
})
\`\`\`

[Continúa con más endpoints: POST /api/admin/lemonway/query, GET /api/admin/lemonway/api-explorer/execute, etc.]

---

## 6. SUITE DE PRUEBAS RBAC/SEGURIDAD (10 tests)

### 6.1 Matriz de Permisos (26 permisos x 5 roles)

**Archivo: `__tests__/security/rbac-matrix.security.test.ts`**

\`\`\`typescript
describe('RBAC Matrix - 26 Permisos x 5 Roles', () => {
  
  // Definir matriz esperada
  const permissionMatrix = {
    'lemonway:config:read': ['SuperAdmin', 'LemonwayAdmin', 'LemonwayOperator'],
    'lemonway:config:write': ['SuperAdmin', 'LemonwayAdmin'],
    'lemonway:config:delete': ['SuperAdmin', 'LemonwayAdmin'],
    'lemonway:queue:read': ['SuperAdmin', 'LemonwayAdmin', 'LemonwayOperator'],
    'lemonway:queue:insert': ['SuperAdmin', 'LemonwayAdmin'],
    'lemonway:queue:priority': ['SuperAdmin', 'LemonwayAdmin'],
    'lemonway:queue:cancel': ['SuperAdmin', 'LemonwayAdmin'],
    'lemonway:api-explorer:read': ['SuperAdmin', 'LemonwayAdmin', 'LemonwayOperator'],
    'lemonway:api-explorer:test': ['SuperAdmin', 'LemonwayAdmin', 'LemonwayDeveloper'],
    'lemonway:api-explorer:test-sandbox': ['SuperAdmin', 'LemonwayAdmin', 'LemonwayDeveloper', 'LemonwayOperator'],
    'lemonway:query:read': ['SuperAdmin', 'LemonwayAdmin', 'LemonwayOperator'],
    'lemonway:query:create': ['SuperAdmin', 'LemonwayAdmin', 'LemonwayDeveloper'],
    'lemonway:query:update': ['SuperAdmin', 'LemonwayAdmin'],
    'lemonway:query:delete': ['SuperAdmin', 'LemonwayAdmin'],
    'lemonway:query:version': ['SuperAdmin', 'LemonwayAdmin', 'LemonwayDeveloper'],
    'lemonway:snapshots:create': ['SuperAdmin', 'LemonwayAdmin', 'LemonwayDeveloper'],
    'lemonway:snapshots:compare': ['SuperAdmin', 'LemonwayAdmin', 'LemonwayDeveloper'],
    'lemonway:snapshots:delete': ['SuperAdmin', 'LemonwayAdmin'],
    'lemonway:webhooks:read': ['SuperAdmin', 'LemonwayAdmin', 'LemonwayOperator'],
    'lemonway:webhooks:configure': ['SuperAdmin', 'LemonwayAdmin'],
    'lemonway:webhooks:test': ['SuperAdmin', 'LemonwayAdmin', 'LemonwayDeveloper'],
    'lemonway:monitoring:read': ['SuperAdmin', 'LemonwayAdmin', 'LemonwayOperator'],
    'lemonway:monitoring:alerts': ['SuperAdmin', 'LemonwayAdmin'],
    'lemonway:import:process': ['SuperAdmin', 'LemonwayAdmin'],
    'lemonway:import:retry': ['SuperAdmin', 'LemonwayAdmin'],
    'lemonway:audit:read': ['SuperAdmin', 'LemonwayAdmin']
  }
  
  // Iterar y validar cada permiso
  Object.entries(permissionMatrix).forEach(([permission, allowedRoles]) => {
    test(`✅ Permiso ${permission} debe tener acceso: ${allowedRoles.join(', ')}`, async () => {
      for (const role of ['SuperAdmin', 'LemonwayAdmin', 'LemonwayOperator', 'LemonwayDeveloper', 'Investor']) {
        const user = await createTestUserWithRole(role)
        const hasAccess = await userHasPermission(user, permission)
        
        if (allowedRoles.includes(role)) {
          expect(hasAccess).toBe(true)
        } else {
          expect(hasAccess).toBe(false)
        }
      }
    })
  })
})
\`\`\`

### 6.2 Pruebas de Inyección/Seguridad

**Archivo: `__tests__/security/injection.security.test.ts`**

\`\`\`typescript
describe('Seguridad - Inyección y Validación', () => {
  
  test('✅ Debe prevenir SQL injection en query params', async () => {
    const maliciousInput = "'; DROP TABLE lemonway_temp.queue; --"
    
    const response = await fetch('/api/admin/lemonway/queue/stats?filter=' + encodeURIComponent(maliciousInput), {
      headers: { 'Authorization': `Bearer ${testAdminToken}` }
    })
    
    expect(response.status).toBe(200)
    
    // Verificar que tabla no fue eliminada
    const queueItems = await queryDb('SELECT COUNT(*) FROM lemonway_temp.queue')
    expect(queueItems[0].count).toBeGreaterThan(0)
  })
  
  test('✅ Debe prevenir XSS en snapshots', async () => {
    const maliciousPayload = '<script>alert("xss")</script>'
    
    const response = await fetch('/api/admin/lemonway/snapshots', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${testAdminToken}` },
      body: JSON.stringify({ name: maliciousPayload })
    })
    
    expect(response.status).toBe(201)
    const snapshot = await response.json()
    
    // Verificar que script está escapado
    expect(snapshot.name).not.toContain('<script>')
  })
  
  test('✅ Debe enmascarar datos sensibles en logs', async () => {
    const request = {
      api_token: 'SECRET_TOKEN_12345',
      endpoint: '/api/test'
    }
    
    const response = await fetch('/api/admin/lemonway/api-explorer/execute', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${testAdminToken}` },
      body: JSON.stringify(request)
    })
    
    expect(response.status).toBe(200)
    
    // Verificar que token no está en logs
    const operationLog = await queryDb(
      'SELECT request_body FROM public."OperationLog" ORDER BY created_at DESC LIMIT 1'
    )
    expect(operationLog[0].request_body).not.toContain('SECRET_TOKEN')
  })
})
\`\`\`

---

## 7. SUITE DE PRUEBAS DE COLA (8 tests)

### 7.1 Pruebas de FIFO Dual

**Archivo: `__tests__/queue/fifo-dual.queue.test.ts`**

\`\`\`typescript
describe('Cola FIFO Dual - URGENT vs NORMAL', () => {
  
  test('✅ Debe procesar URGENT antes que NORMAL', async () => {
    // Arrange
    const processingOrder = []
    
    // Insertar items
    await queueManager.insert({ category: 'NORMAL', id: 'N1' })
    await queueManager.insert({ category: 'NORMAL', id: 'N2' })
    await queueManager.insert({ category: 'URGENT', id: 'U1' })
    await queueManager.insert({ category: 'NORMAL', id: 'N3' })
    await queueManager.insert({ category: 'URGENT', id: 'U2' })
    
    // Act: Dequeue 5 items
    for (let i = 0; i < 5; i++) {
      const item = await queueManager.dequeue()
      processingOrder.push(item.id)
    }
    
    // Assert: U1, U2, N1, N2, N3
    expect(processingOrder).toEqual(['U1', 'U2', 'N1', 'N2', 'N3'])
  })
  
  test('✅ Debe respetar FIFO dentro de URGENT', async () => {
    // Arrange
    const processingOrder = []
    
    // Insertar urgentes en orden específico
    for (let i = 1; i <= 5; i++) {
      await queueManager.insert({ category: 'URGENT', id: `U${i}` })
      await sleep(100) // Asegurar orden
    }
    
    // Act: Dequeue todos
    for (let i = 0; i < 5; i++) {
      const item = await queueManager.dequeue()
      processingOrder.push(item.id)
    }
    
    // Assert: Deben salir en orden U1, U2, U3, U4, U5
    expect(processingOrder).toEqual(['U1', 'U2', 'U3', 'U4', 'U5'])
  })
  
  test('✅ Debe respetar FIFO dentro de NORMAL', async () => {
    // Arrange
    const processingOrder = []
    
    // Insertar normales en orden específico
    for (let i = 1; i <= 5; i++) {
      await queueManager.insert({ category: 'NORMAL', id: `N${i}` })
      await sleep(100)
    }
    
    // Act: Dequeue todos
    for (let i = 0; i < 5; i++) {
      const item = await queueManager.dequeue()
      processingOrder.push(item.id)
    }
    
    // Assert
    expect(processingOrder).toEqual(['N1', 'N2', 'N3', 'N4', 'N5'])
  })
  
  test('✅ Debe manejar interleaving de URGENT y NORMAL', async () => {
    // Arrange
    const processingOrder = []
    
    // Insertar en orden aleatorio
    await queueManager.insert({ category: 'NORMAL', id: 'N1' })
    await queueManager.insert({ category: 'URGENT', id: 'U1' })
    await sleep(50)
    await queueManager.insert({ category: 'NORMAL', id: 'N2' })
    await queueManager.insert({ category: 'URGENT', id: 'U2' })
    await sleep(50)
    await queueManager.insert({ category: 'NORMAL', id: 'N3' })
    await queueManager.insert({ category: 'URGENT', id: 'U3' })
    
    // Act
    for (let i = 0; i < 6; i++) {
      const item = await queueManager.dequeue()
      processingOrder.push(item.id)
    }
    
    // Assert: Urgentes primero, luego normales en orden
    expect(processingOrder).toEqual(['U1', 'U2', 'U3', 'N1', 'N2', 'N3'])
  })
  
  test('✅ Debe permitir cambiar prioridad de item existente', async () => {
    // Arrange
    await queueManager.insert({ category: 'NORMAL', id: 'N1' })
    await sleep(50)
    
    // Act: Cambiar a URGENT
    await queueManager.prioritize('N1')
    
    const item = await queueManager.dequeue()
    
    // Assert
    expect(item.id).toBe('N1')
    expect(item.category).toBe('URGENT')
  })
  
  test('✅ Debe retornar null cuando cola está vacía', async () => {
    // Act
    const item = await queueManager.dequeue()
    
    // Assert
    expect(item).toBeNull()
  })
  
  test('✅ Debe actualizar status de item a PROCESSING', async () => {
    // Arrange
    await queueManager.insert({ category: 'URGENT', id: 'U1' })
    
    // Act
    const item = await queueManager.dequeue()
    
    // Assert
    expect(item.status).toBe('PROCESSING')
    expect(item.started_at).toBeDefined()
  })
  
  test('✅ Debe mover item a FAILED si excede max_retries', async () => {
    // Arrange
    const maxRetries = 3
    
    // Act: Intentar procesar 4 veces
    for (let i = 0; i < maxRetries + 1; i++) {
      await queueManager.markFailed('U1', 'Test error')
    }
    
    // Assert
    const item = await queryDb('SELECT status FROM lemonway_temp.queue WHERE id = ?', ['U1'])
    expect(item[0].status).toBe('FAILED')
  })
})
\`\`\`

---

## 8. VALIDACIONES DE BASE DE DATOS (SQL Tests)

### 8.1 Script de Validación SQL

**Archivo: `scripts/test-validate-db-schema.sql`**

\`\`\`sql
-- ============================================
-- VALIDACIONES DE SCHEMA BASE DE DATOS
-- ============================================

-- 1. Verificar que todas las tablas existen
BEGIN;
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'lemonway_temp' OR table_schema = 'public'
AND table_name IN (
  'queue',
  'queue_item',
  'custom_query',
  'query_version',
  'operation_type',
  'field_mapping',
  'snapshot',
  'operation_log'
);
-- EXPECTED: 8 tablas

-- 2. Verificar índices en tabla queue
SELECT COUNT(*) as index_count
FROM pg_indexes
WHERE tablename = 'queue'
AND indexname IN (
  'idx_queue_category_status',
  'idx_queue_created_at',
  'idx_queue_priority'
);
-- EXPECTED: 3 índices

-- 3. Verificar columas requeridas en queue
SELECT COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'queue'
AND column_name IN (
  'id', 'category', 'status', 'created_at',
  'started_at', 'completed_at', 'retry_count', 'payload'
);
-- EXPECTED: 8 columnas

-- 4. Verificar valores enum válidos
SELECT COUNT(DISTINCT category) as valid_categories
FROM lemonway_temp.queue
WHERE category IN ('URGENT', 'NORMAL');
-- EXPECTED: todos validos (no errores)

-- 5. Verificar constraints
SELECT COUNT(*) as constraint_count
FROM information_schema.table_constraints
WHERE table_name = 'queue'
AND constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY', 'CHECK');
-- EXPECTED: >= 4 constraints

-- 6. Verificar que no hay registros NULL en columnas requeridas
SELECT COUNT(*) as null_count
FROM lemonway_temp.queue
WHERE id IS NULL OR category IS NULL OR status IS NULL OR created_at IS NULL;
-- EXPECTED: 0

-- 7. Verificar que queues están divididas correctamente
SELECT 
  category,
  COUNT(*) as count
FROM lemonway_temp.queue
GROUP BY category
ORDER BY category;
-- EXPECTED: NORMAL: X, URGENT: Y

COMMIT;
\`\`\`

---

## 9. CHECKLIST MANUAL DE TESTING (50+ items)

### 9.1 Testing de UI - Panel Admin Lemonway

\`\`\`
SECCIÓN: Overview Dashboard
□ Verificar que KPI cards muestren datos correctos
  □ Queue stats (pending, processing, failed)
  □ API health status (green/yellow/red)
  □ Lemonway balance (actualizado)
  □ Error rate (últimas 24h)

□ Verificar que gráficos carguen sin errores
  □ Queue trend (últimas 7 días)
  □ API response times (P50, P95, P99)
  □ Webhook success rate

□ Verificar alertas activas se muestren
  □ SLA próximo a vencer
  □ Error rate > umbral
  □ Queue backed up

SECCIÓN: Configuration
□ Agregar nueva autenticación Lemonway
  □ Guardar credenciales
  □ Validar conexión
  □ Verificar en BD

□ Editar rate limit
  □ Cambiar max_concurrent_requests
  □ Verificar que se aplica inmediatamente
  □ Verificar en AccessLog

□ Configurar reintentos
  □ Cambiar max_retries
  □ Cambiar backoff_multiplier
  □ Ejecutar test y verificar que se reintenta correctamente

□ Gestionar field mappings
  □ Crear nuevo mapping
  □ Editar mapping existente
  □ Eliminar mapping
  □ Verificar que se aplica a próximas queries

SECCIÓN: API Explorer
□ Ejecutar query existente
  □ Seleccionar método
  □ Llenar parámetros
  □ Ejecutar
  □ Ver response formateado

□ Crear snapshot
  □ Ejecutar query
  □ Guardar snapshot
  □ Verificar en histórico

□ Comparar snapshots
  □ Crear 2 snapshots
  □ Abrir comparador
  □ Ver diff coloreado
  □ Exportar reporte HTML

□ Usar dry-run mode
  □ Ejecutar query en dry-run
  □ Verificar que BD no cambió
  □ Comparar response vs real

□ Testear sandboxing
  □ Ejecutar query que falla
  □ Verificar error sin afectar BD
  □ Reintentar

SECCIÓN: Queue Management
□ Insertar item NORMAL
  □ Abrir form de inserción
  □ Seleccionar NORMAL
  □ Llenar payload
  □ Verificar que aparece en lista

□ Insertar item URGENT
  □ Insertar URGENT
  □ Insertar NORMAL
  □ Verificar que URGENT se procesa primero

□ Cambiar prioridad
  □ Item en cola NORMAL
  □ Cambiar a URGENT
  □ Verificar que se mueve arriba en cola

□ Ver estadísticas de cola
  □ Verificar conteos (pending, processing, failed)
  □ Verificar tiempo promedio de espera
  □ Verificar % de éxito

□ Retry de items fallidos
  □ Item con status FAILED
  □ Click en "Retry"
  □ Verificar que vuelve a PENDING

SECCIÓN: Custom Queries
□ Crear nueva query
  □ Nombre único
  □ Endpoint válido
  □ Validar schema
  □ Guardar

□ Editar query existente
  □ Cambiar nombre
  □ Cambiar endpoint
  □ Guardar
  □ Verificar versión incrementó

□ Ver historial de versiones
  □ Query con múltiples versiones
  □ Abrir historial
  □ Ver todas las versiones

□ Rollback a versión anterior
  □ Query en v3
  □ Rollback a v1
  □ Verificar que query volvió a estado anterior

□ Exportar query
  □ Exportar como Postman
  □ Importar en Postman
  □ Verificar que funciona

SECCIÓN: Security & RBAC
□ Verificar que LemonwayOperator no puede editar config
  □ Logarse con LemonwayOperator
  □ Navegar a Configuration
  □ Botones de editar/eliminar deben estar disabled

□ Verificar que LemonwayAdmin puede ver monitoreo
  □ Logarse con LemonwayAdmin
  □ Abrir Monitoring
  □ Ver dashboards activos

□ Verificar que SuperAdmin puede todo
  □ SuperAdmin puede crear/editar/eliminar todo

□ Verificar auditoría en AccessLog
  □ Hacer acción
  □ Verificar en /dashboard/access-logs
  □ Debe haber registro detallado

SECCIÓN: Error Handling
□ Desconectar BD durante operación
  □ Operación debe fallar gracefully
  □ Mensaje de error claro
  □ UI debe mantener estado

□ Timeout de API Lemonway
  □ Mockear timeout
  □ Ejecutar query
  □ Debe reintentar automáticamente
  □ Mostrar error después de max retries

□ Datos inválidos
  □ Enviar JSON mal formado
  □ API debe retornar 400
  □ Mensaje de error indicar qué está mal

SECCIÓN: Performance
□ Cargar 1000 items en cola
  □ UI debe responder < 500ms
  □ Paginación debe funcionar
  □ Búsqueda debe ser rápido

□ Ejecutar complex query
  □ Query con 5+ joins
  □ Debe completar < 5 segundos
  □ Memory usage debe ser < 500MB

SECCIÓN: Mobile Responsiveness
□ Abrir panel en móvil
  □ Layout debe reflow correctamente
  □ Botones deben ser clickeables
  □ Tablas deben ser scrolleables
\`\`\`

---

## 10. ROLLBACK Y RECOVERY TESTING

### 10.1 Plan de Rollback

**Escenario 1: Falló creación de tabla**
\`\`\`sql
-- Rollback script
DROP TABLE IF EXISTS lemonway_temp.queue CASCADE;
DROP TABLE IF EXISTS lemonway_temp.queue_item CASCADE;
-- Re-ejecutar migration 139
\i scripts/139-create-lemonway-import-schema.sql
\`\`\`

**Escenario 2: Datos corruptos en BD**
\`\`\`sql
-- Validar integridad
SELECT COUNT(*) FROM lemonway_temp.queue WHERE category NOT IN ('URGENT', 'NORMAL');
-- Si hay resultados, rollback completo a checkpoint anterior
\`\`\`

### 10.2 Testing de Disaster Recovery

\`\`\`typescript
describe('Disaster Recovery', () => {
  
  test('✅ Debe recuperar items de cola después de crash', async () => {
    // Arrange: 10 items en cola
    await queueManager.insert({ category: 'URGENT', id: 'U1' })
    await queueManager.insert({ category: 'NORMAL', id: 'N1' })
    // ... 8 más
    
    // Act: Simular crash
    await killDatabase()
    await sleep(2000)
    await restartDatabase()
    
    // Assert: Items deben estar en cola
    const items = await queryDb('SELECT * FROM lemonway_temp.queue')
    expect(items.length).toBe(10)
  })
  
  test('✅ Debe respetar state de items processing tras recovery', async () => {
    // Arrange: Item siendo procesado
    const item = await queueManager.dequeue()
    expect(item.status).toBe('PROCESSING')
    
    // Act: Crash
    await killDatabase()
    await sleep(1000)
    await restartDatabase()
    
    // Assert: Item debe seguir en PROCESSING, no en PENDING
    const recovered = await queryDb(
      'SELECT status FROM lemonway_temp.queue WHERE id = ?',
      [item.id]
    )
    expect(recovered[0].status).toBe('PROCESSING')
  })
})
\`\`\`

---

## 11. RESUMEN DE EJECUCIÓN

### Pasos para ejecutar todas las pruebas:

\`\`\`bash
# 1. Preparar ambiente
npm install

# 2. Crear BD de test
npm run test:db:setup

# 3. Ejecutar todas las pruebas
npm run test:all

# 4. Ver cobertura
npm run test:coverage

# 5. Pruebas específicas
npm run test:unit
npm run test:integration
npm run test:api
npm run test:security
npm run test:queue

# 6. Validaciones SQL
npm run test:db:validate

# 7. E2E con Playwright
npm run test:e2e
\`\`\`

### Salida esperada:

\`\`\`
UNIT TESTS:       59 passed
INTEGRATION:      30 passed
API TESTS:        15 passed
RBAC SECURITY:    10 passed
QUEUE TESTS:      8 passed
UI/COMPONENT:     10 passed
E2E TESTS:        12 passed

COVERAGE:
  Statements   : 85.2%
  Branches     : 82.1%
  Functions    : 88.0%
  Lines        : 84.9%

TOTAL: 144 tests passed ✅
TIME: ~8 minutes
\`\`\`

---

**Documento de Testing: v1.0 - Enero 2026**
