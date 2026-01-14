# URBIX TRANSACTIONAL PLATFORM - PROYECTO RULES

Documento oficial de RULES para mantener consistencia, calidad y evitar errores recurrentes.

---

## RULE 1: NO INVENTAR NADA QUE NO ESTÉ ESPECIFICADO

- **Regla**: Solo implementar exactamente lo detallado en especificaciones
- **Restricción**: No agregar features "por si acaso" o anticipadas
- **Verificación**: Si el usuario no lo pide explícitamente → NO hacerlo

---

## RULE 2: NO HACER CAMBIOS EN OTROS MÓDULOS O FEATURES

- **Regla**: Esta feature es self-contained, no debe modificar sistemas existentes
- **Restricción**: Un cambio debe afectar SOLO la funcionalidad solicitada
- **Verificación**: Si necesitas modificar otro módulo → DETENTE y pregunta al usuario primero

---

## RULE 3: EN DEPURACIONES Y CORRECCIONES, NO HACER CAMBIOS EN OTROS MÓDULOS

- **Regla**: Cuando arreglas un bug, solo arregla ESE bug
- **Restricción**: No hagas refactoring o mejoras mientras depu ras
- **Verificación**: Si necesitas modificar otro módulo → DETENTE y pregunta al usuario primero

---

## RULE 4: EN CASO DE DUDA, PREGUNTAR AL USUARIO - NO ASUMIR NADA

- **Regla**: Cualquier ambigüedad, interpretación o detalle no explícito → PREGUNTAR al usuario
- **Contexto**: Si la especificación NO dice exactamente cómo hacer algo → NO asumir, pausar y preguntar
- **Ejemplo**: "¿Debería hacer A o B?" → PREGUNTA antes de elegir

---

## RULE 5: EL ACCESO A DB SIEMPRE USAR `lib/db.ts`

- **Regla**: Todos los accesos a base de datos deben usar el cliente centralizado
- **Importación correcta**: `import { sql } from "@/lib/db"`
- **Importación INCORRECTA**: `import { sql } from "@neondatabase/serverless"`
- **Restricción**: NUNCA imports directos de la librería de Neon

---

## RULE 6: EL CLIENT `sql` SOLO SOPORTA TEMPLATE LITERALS CON BACKTICKS

- **Sintaxis correcta**: `sql\`SELECT * FROM table WHERE id = ${value}\``
- **Sintaxis INCORRECTA**: 
  - `sql()` - NO existe
  - `sql.query()` - NO existe en template literals
  - `sql.unsafe()` - NO existe
  - Interpolación de fragmentos SQL

---

## RULE 7: QUERIES DINÁMICAS Y PARÁMETRIZADAS

Para queries con filtros dinámicos o WHERE clauses variables:

- **NUNCA** interpolar fragmentos SQL en template literals
  - ❌ `sql\`SELECT * WHERE ${whereClause}\``
  
- **SIEMPRE usar** `sql.query(query, params)` para:
  - Queries con WHERE dinámicos
  - Filtros condicionales
  - Parámetros variables

- **Construcción correcta**:
  ```typescript
  const whereConditions = []
  const params: any[] = []
  let paramIndex = 1

  if (filter) {
    whereConditions.push(`column = $${paramIndex}`)
    params.push(filterValue)
    paramIndex++
  }

  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(" AND ")}` 
    : ""
  
  const query = `SELECT * FROM table ${whereClause}`
  const result = await sql.query(query, params)
  ```

- **Template literals** SOLO para queries simples sin filtros dinámicos

---

## RULE 8: ANÁLISIS PREVIO OBLIGATORIO

Antes de CUALQUIER cambio:

1. ❌ NUNCA empezar a programar sin diagnóstico claro
2. ✅ SIEMPRE hacer análisis COMPLETO sin tocar código
3. ✅ SIEMPRE leer código que YA FUNCIONA para ese tipo de operación
4. ✅ SIEMPRE identificar exactamente QUÉ está roto y POR QUÉ
5. ❌ NUNCA asumir, SIEMPRE preguntar si hay ambigüedad

**Si hay duda → PREGUNTA PRIMERO, programa DESPUÉS**

---

## RULE 9: VALIDACIÓN DE ESTADO

Validación antes de cambios:

1. ✅ Verificar que código ACTUAL compila sin errores
2. ✅ Verificar que preview FUNCIONA
3. ❌ NUNCA hacer cambios en código roto
4. ❌ NUNCA cambios en cascada (múltiples archivos a la vez)
5. ✅ Un cambio = un archivo, excepto cuando es explícitamente requerido

**Si el código no compila/funciona → DIAGNOSTICAR PRIMERO, no cambiar**

---

## RULE 10: PATRONES EXISTENTES

Para CUALQUIER tipo de operación:

1. ✅ BUSCAR ejemplo que YA FUNCIONA
2. ✅ COPIAR exactamente ese patrón
3. ✅ ENTENDER por qué funciona ese patrón
4. ❌ NUNCA inventar variantes de patrones
5. ❌ NUNCA usar múltiples patrones diferentes para la misma operación

**Si no hay patrón existente → PREGUNTAR cómo hacerlo, no inventar**

---

## RULE 11: IMPORTACIONES Y ACCESO A MÓDULOS

Importaciones:

1. ✅ Usar SIEMPRE importes desde `@/lib/*` centralizados
2. ❌ NUNCA imports directos de librerías externas sin validar que existen
3. ✅ VERIFICAR que la función/método que importas EXISTE realmente
4. ❌ NUNCA asumir que una función existe porque "debería estar"

**Validación**:
- `sql.query()` ← Verificar que existe
- `getServerSession()` ← Verificar que existe
- Cualquier método nuevo ← Verificar PRIMERO

**Si no existe → PREGUNTAR cómo acceder a esa funcionalidad**

---

## RULE 12: CAMBIOS ARQUITECTÓNICOS

Si un cambio afecta múltiples componentes/archivos:

1. ✅ DETENER y PREGUNTAR primero
2. ✅ Validar que los cambios son self-contained
3. ❌ NUNCA hacer cambios cascada sin explícita aprobación
4. ✅ Cambios incrementales: 1 responsabilidad = 1 cambio

**Protocolo**:
- Cambio en archivo A → VERIFICAR que no rompe B, C, D
- Si afecta otros → PREGUNTAR antes de proceder

---

## RULE 13: COMUNICACIÓN PRE-CAMBIO

Antes de programar:

1. ✅ Explicar QUÉ voy a cambiar
2. ✅ Explicar POR QUÉ voy a hacerlo así
3. ✅ Explicar QUÉ archivos van a cambiar
4. ✅ Preguntar: "¿Procedo?" o "¿Algo que cambiar?"
5. ❌ NUNCA cambiar sin confirmación explícita si hay dudas

**Si usuario dice "sí" → SOLO hacer exactamente eso, NADA más**

---

## RULE 14: VERIFICACIÓN POST-CAMBIO

Después de CUALQUIER cambio:

1. ✅ Verificar que el código compila
2. ✅ Verificar que el preview funciona
3. ✅ Verificar que la funcionalidad específica funciona
4. ✅ Verificar que NO se rompieron funcionalidades relacionadas
5. ❌ NUNCA dar por completado un cambio sin verificación

**Si el preview rompe → Es un error, revertir y DIAGNOSTICAR**

---

## RULE 15: DOCUMENTACIÓN DE CAMBIOS

Cuando algo se rompe:

1. ✅ Documentar QUÉ cambié desde la última versión que funcionaba
2. ✅ Identificar EXACTAMENTE qué causó el quiebre
3. ✅ No asumir, INVESTIGAR
4. ❌ NUNCA intentar múltiples fixes sin entender la causa

**Cuando el usuario pregunta "¿qué tocaste?"**
→ Poder responder con precisión EXACTA qué cambios se hicieron

---

## RULE 16: VERSIONADO Y ROLLBACK

Para facilitar reversión rápida en caso de errores:

1. ✅ DOCUMENTAR EXACTAMENTE qué cambios se hicieron
2. ✅ MANTENER commits pequeños y atómicos
3. ✅ Cada cambio debe ser REVERTIBLE sin afectar otros
4. ✅ Si deployment falla → REVISAR último commit y REVERTIR inmediatamente
5. ❌ NUNCA hacer múltiples cambios en un solo commit

**Protocolo de cambios**:
- Cambio = 1 responsabilidad
- Cambio = 1 commit (o grupo mínimo de archivos relacionados)
- Cambio = Documentado con descripción clara de QUÉ y POR QUÉ

**En caso de rollback**:
1. Identificar exactamente cuál cambio causó el quiebre
2. Revertir SOLO ese cambio/commit
3. Verificar que preview funciona nuevamente
4. Re-diagnosticar la causa del error
5. Implementar fix diferente

**Regla de oro**: 
- Si algo se rompe → Es mejor revertir y perder 10 minutos que seguir adelante y gastar 2 horas

---

## RESUMEN - CHECKLIST ANTES DE CUALQUIER CAMBIO

- [ ] Diagnóstico completo SIN programar
- [ ] Código compila actualmente
- [ ] Preview funciona actualmente
- [ ] Identifiqué el patrón existente que funciona
- [ ] Pregunté si hay ambigüedad
- [ ] Expliqué QUÉ voy a cambiar
- [ ] Obtuve confirmación del usuario
- [ ] Hago SOLO lo requerido
- [ ] Verifico que compila después
- [ ] Verifico que preview funciona después
- [ ] Verifico que funcionalidades relacionadas no se rompieron

---

**Última actualización**: 2026-01-14
**Versión**: 1.0 - RULES DEFINITIVAS
