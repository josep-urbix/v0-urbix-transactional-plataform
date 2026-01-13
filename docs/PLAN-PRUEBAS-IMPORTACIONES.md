# Plan de Pruebas - Sistema de Importaciones Lemonway

## Estado Actual
- ✅ Logs pendientes borrados (0 registros)
- ✅ BD limpia para empezar

## Objetivos del Plan
Verificar que cada transacción:
1. Se encole correctamente en `LemonwayApiCallLog`
2. Aparezca en el dashboard `https://integrations.urbix.es/dashboard/lemonway-transactions`
3. Se procese con el retry queue automáticamente
4. Se guarde en `movimientos_cuenta` como movimiento final
5. Aplique correctamente rate limit y reintentos

## Fases de Prueba

### FASE 1: Verificación de Encola (Worker → LemonwayApiCallLog)
**Objetivo**: Confirmar que al hacer una importación, los logs se crean correctamente

**Pasos**:
1. Ejecutar una importación pequeña (ej: 1-3 cuentas, 1 día de datos)
2. Verificar que aparezcan logs en `LemonwayApiCallLog`:
   \`\`\`sql
   SELECT COUNT(*), retry_status, response_status 
   FROM "LemonwayApiCallLog" 
   WHERE endpoint = '/import-transactions' 
   GROUP BY retry_status, response_status;
   \`\`\`
3. Esperado: Logs con `retry_status = 'pending'` y `response_status = null`
4. Verificar que en `lemonway_temp.movimientos_cuenta` haya 0 movimientos (no debe guardar directamente)

**✓ Criterio de Éxito**: Logs encolados, 0 movimientos guardados directamente

---

### FASE 2: Verificación de Dashboard
**Objetivo**: Confirmar que los logs aparecen en el dashboard de transacciones

**Pasos**:
1. Navegar a `https://integrations.urbix.es/dashboard/lemonway-transactions`
2. Verificar que aparezcan X logs con el nombre del endpoint `/import-transactions`
3. Ver estado de cada uno (todos deben mostrar "pending" o "in_progress")

**✓ Criterio de Éxito**: Logs visibles en dashboard

---

### FASE 3: Verificación de Retry Queue
**Objetivo**: Confirmar que el retry queue procesa automáticamente los logs

**Pasos**:
1. Esperar 2-3 minutos (intervalo del cron: */2 * * * *)
2. Revisar en BD:
   \`\`\`sql
   SELECT COUNT(*), retry_status, response_status 
   FROM "LemonwayApiCallLog" 
   WHERE endpoint = '/import-transactions' 
   GROUP BY retry_status, response_status;
   \`\`\`
3. Esperado: Los logs pasen de `'pending'` a `'completed'`
4. Revisar en dashboard: Los logs deben mostrar estado "completed"

**✓ Criterio de Éxito**: Logs cambian de pending a completed automáticamente

---

### FASE 4: Verificación de Movimientos Guardados
**Objetivo**: Confirmar que los logs procesados generan movimientos en la BD

**Pasos**:
1. Después de que los logs se procesen (Fase 3):
   \`\`\`sql
   SELECT COUNT(*) FROM lemonway_temp.movimientos_cuenta 
   WHERE import_run_id = '[IMPORT_ID]';
   \`\`\`
2. Esperado: Movimientos guardados (igual cantidad que transacciones)
3. Verificar campos: `cuenta_virtual_id`, `lemonway_transaction_id`, `import_run_id`, etc.

**✓ Criterio de Éxito**: Movimientos guardados correctamente en BD

---

### FASE 5: Verificación de Rate Limiting
**Objetivo**: Confirmar que se aplica rate limit correctamente

**Pasos**:
1. Hacer 2 importaciones consecutivas rápidamente
2. Ver en `LemonwayApiCallLog` los campos `next_retry_at` y `rate_limit_until`
3. Verificar que algunos logs tengan `retry_status = 'limit_pending'`
4. Esperar a que se procesen según el rate limit

**✓ Criterio de Éxito**: Rate limit se aplica y logs se procesan según política

---

### FASE 6: Verificación de Reintentos
**Objetivo**: Confirmar que los errores se retentan correctamente

**Pasos**:
1. En una importación posterior, si hay errores:
   \`\`\`sql
   SELECT id, retry_count, error_message, retry_status 
   FROM "LemonwayApiCallLog" 
   WHERE endpoint = '/import-transactions' AND retry_count > 0;
   \`\`\`
2. Verificar que `retry_count` incremente en cada reintento
3. Verificar que finalmente cambien a `'completed'` o `'failed_max_retries'`

**✓ Criterio de Éxito**: Reintentos funcionan correctamente

---

### FASE 7: Verificación End-to-End
**Objetivo**: Confirmar el flujo completo funciona sin intervención

**Pasos**:
1. Hacer una importación normal
2. Sin intervención manual, esperar 5 minutos
3. Verificar: logs → procesados → movimientos guardados → visibles en dashboard

**✓ Criterio de Éxito**: Flujo completo automático sin errores

---

## Checklist de Validación Final

- [ ] FASE 1: Logs encolados correctamente
- [ ] FASE 2: Dashboard muestra transacciones
- [ ] FASE 3: Retry queue procesa automáticamente
- [ ] FASE 4: Movimientos guardados en BD
- [ ] FASE 5: Rate limit funciona
- [ ] FASE 6: Reintentos funcionan
- [ ] FASE 7: Flujo end-to-end automático

## Comandos SQL Útiles para Debug

\`\`\`sql
-- Ver estado actual de logs
SELECT COUNT(*), retry_status, response_status 
FROM "LemonwayApiCallLog" 
WHERE endpoint = '/import-transactions' 
GROUP BY retry_status, response_status;

-- Ver logs con errores
SELECT id, error_message, retry_count, next_retry_at 
FROM "LemonwayApiCallLog" 
WHERE endpoint = '/import-transactions' AND error_message IS NOT NULL;

-- Ver movimientos guardados por importación
SELECT import_run_id, COUNT(*) as total 
FROM lemonway_temp.movimientos_cuenta 
GROUP BY import_run_id 
ORDER BY created_at DESC LIMIT 5;

-- Ver últimas importaciones
SELECT id, status, total_transactions, imported_transactions, created_at 
FROM lemonway_temp.import_runs 
ORDER BY created_at DESC LIMIT 5;
\`\`\`

## Notas Importantes

1. **Worker**: Debe encolar en `LemonwayApiCallLog`, NO guardar directamente en `movimientos_cuenta`
2. **Retry Queue**: Debe procesar automáticamente cada 2 minutos
3. **Endpoint `/import-transactions`**: Debe saber cómo procesar cada log y guardar en `movimientos_cuenta`
4. **Dashboard**: Debe mostrar TODOS los logs con sus estados
5. **Rate Limit**: Máximo 15 transacciones por minuto según configuración

## Estado Después de Pruebas
- [ ] Sistema listo para producción
- [ ] Documento de confirmación generado
