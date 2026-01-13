# Sistema de Gestión de Documentos y Firma Electrónica

**Fecha de creación:** 7 de enero de 2026  
**Última actualización:** 7 de enero de 2026, 16:00h

**Versión:** 1.0  
**Fecha:** Enero 2026  
**Módulo:** Documentos y Firma Electrónica

---

## Índice

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Modelo de Datos](#modelo-de-datos)
4. [Componentes Principales](#componentes-principales)
5. [Flujos de Trabajo](#flujos-de-trabajo)
6. [APIs](#apis)
7. [Seguridad](#seguridad)
8. [Testing](#testing)

---

## Visión General

El **Sistema de Gestión de Documentos y Firma Electrónica** permite a la plataforma URBIX gestionar documentos legales que requieren firma electrónica de los inversores. El sistema incluye:

- **Gestión de tipos de documentos** (contratos, mandatos, etc.)
- **Control de versiones** de documentos con estado (borrador/publicado)
- **Editor de contratos** con validación de variables dinámicas
- **Firma electrónica** con OTP por email
- **Captura de firma manuscrita** del inversor
- **Sistema de testing** para probar flujos de firma
- **Vista previa** de documentos con datos reales del inversor

### Casos de Uso

- **Mandatos de inversión**: Autorización para invertir
- **Contratos de servicios**: Acuerdos entre URBIX e inversores
- **Documentos KYC**: Consentimientos y declaraciones
- **Políticas y términos**: T&C, políticas de privacidad

---

## Arquitectura del Sistema

### Schema de Base de Datos: `documentos`

Todos los datos del módulo se almacenan en el schema `documentos` con las siguientes tablas:

```sql
documentos.document_type          -- Tipos de documentos
documentos.document_version       -- Versiones de documentos
documentos.signature_session      -- Sesiones de firma
documentos.signed_document        -- Documentos firmados
documentos.signature_verification  -- CSV de verificación
```

### Estructura de Carpetas

```
app/
├── api/
│   ├── admin/
│   │   └── documents/
│   │       ├── types/                    # CRUD tipos de documentos
│   │       ├── versions/                 # CRUD versiones
│   │       ├── validate-variable/        # Validación de variables
│   │       ├── signatures/               # Gestión de firmas
│   │       └── testing/
│   │           └── create-session/       # Testing de firmas
│   └── investors/
│       └── documents/
│           └── sign/
│               ├── [token]/              # Validar token de firma
│               ├── [token]/preview/      # Vista previa documento
│               └── otp/
│                   ├── send/             # Enviar código OTP
│                   └── verify/           # Verificar y completar firma
├── dashboard/
│   └── documents/
│       ├── page.tsx                      # Lista de tipos
│       ├── [typeId]/
│       │   └── versions/                 # Gestión de versiones
│       └── testing/                      # Testing de firmas
└── investor-portal/
    ├── documents/                        # Documentos del inversor
    └── sign/
        └── [token]/                      # Página de firma

components/
├── documents/
│   ├── document-types-manager.tsx        # Gestión de tipos
│   ├── document-versions-manager.tsx     # Gestión de versiones
│   ├── rich-text-editor.tsx             # Editor con validación
│   └── document-testing-manager.tsx      # Testing de firmas
└── investor-portal/
    ├── signing-page.tsx                  # Flujo de firma completo
    └── signature-canvas.tsx              # Canvas para firma manuscrita

lib/
└── document-signing.ts                   # Lógica de negocio de firmas

scripts/
├── 129-create-documents-schema.sql       # Schema inicial
├── 130-create-documents-apis.sql         # Funciones SQL
├── 131-add-document-rbac.sql            # Permisos RBAC
└── 135-add-handwritten-signature-column.sql  # Firma manuscrita
```

---

## Modelo de Datos

### Tabla: `document_type`

Define los tipos de documentos disponibles en la plataforma.

```sql
CREATE TABLE documentos.document_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,     -- Código único (ej: mandato_inversion)
  display_name VARCHAR(200) NOT NULL,    -- Nombre visible
  description TEXT,
  requiere_firma BOOLEAN DEFAULT false,  -- ¿Requiere firma electrónica?
  obligatorio_antes_invertir BOOLEAN DEFAULT false,
  dias_vigencia INTEGER,                 -- Días hasta caducidad
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Campos clave:**
- `requiere_firma`: Si es `true`, el documento necesita ser firmado por el inversor
- `obligatorio_antes_invertir`: Si es `true`, el inversor debe firmarlo antes de poder invertir
- `dias_vigencia`: Días que la firma es válida (ej: 365 días)

### Tabla: `document_version`

Versiones de cada tipo de documento con control de estado.

```sql
CREATE TABLE documentos.document_version (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type_id UUID NOT NULL REFERENCES documentos.document_type(id) ON DELETE CASCADE,
  version_number VARCHAR(20) NOT NULL,   -- Ej: "1.0", "1.1", "2.0"
  contenido TEXT NOT NULL,               -- HTML del documento
  variables TEXT[],                      -- Variables usadas (ej: {{email}})
  notas_version TEXT,
  status VARCHAR(20) DEFAULT 'borrador', -- 'borrador' o 'publicado'
  publicado_en TIMESTAMP,
  publicado_por VARCHAR(255),
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(document_type_id, version_number)
);
```

**Estados:**
- `borrador`: Editable, no disponible para firma
- `publicado`: Read-only, disponible para crear sesiones de firma

### Tabla: `signature_session`

Sesiones de firma únicas para cada inversor y documento.

```sql
CREATE TABLE documentos.signature_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inversor_id UUID NOT NULL REFERENCES investors."User"(id),
  document_version_id UUID NOT NULL REFERENCES documentos.document_version(id),
  status VARCHAR(20) DEFAULT 'pendiente',  -- pendiente, firmado, expirado, cancelado
  token_firma VARCHAR(500) UNIQUE,         -- Token único para el enlace de firma
  qr_token VARCHAR(500) UNIQUE,           -- Token para QR (móvil)
  qr_token_expires_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  canal_origen documentos.firma_channel,   -- desktop, mobile, qr_mobile
  ip_firma VARCHAR(45),
  user_agent TEXT,
  otp_code VARCHAR(10),                    -- Código OTP generado
  otp_expires_at TIMESTAMP,
  otp_attempts INTEGER DEFAULT 0,
  firmado_en TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Flujo de estados:**
```
pendiente → firmado
          ↘ expirado
          ↘ cancelado
```

### Tabla: `signed_document`

Documentos firmados con todos los metadatos de verificación.

```sql
CREATE TABLE documentos.signed_document (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_session_id UUID NOT NULL REFERENCES documentos.signature_session(id),
  inversor_id UUID NOT NULL REFERENCES investors."User"(id),
  document_version_id UUID NOT NULL REFERENCES documentos.document_version(id),
  contenido_firmado TEXT NOT NULL,         -- HTML renderizado con datos del inversor
  firma_manuscrita_url TEXT,               -- URL de imagen de firma (Vercel Blob)
  metodo_firma VARCHAR(20),                -- otp_email, otp_sms
  ip_firma VARCHAR(45),
  user_agent TEXT,
  firma_valida BOOLEAN DEFAULT true,
  fecha_firma TIMESTAMP NOT NULL,
  fecha_expiracion TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: `signature_verification`

Registro CSV para verificación posterior de firmas.

```sql
CREATE TABLE documentos.signature_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signed_document_id UUID NOT NULL REFERENCES documentos.signed_document(id),
  verificacion_csv TEXT NOT NULL,          -- CSV con hash, fecha, email, etc.
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Componentes Principales

### 1. Editor de Contratos con Validación de Variables

**Componente:** `components/documents/rich-text-editor.tsx`

**Características:**
- Editor contentEditable con barra de herramientas (negrita, cursiva, listas, alineación)
- Botón `{{var}}` para insertar variables dinámicas
- Validación en tiempo real de variables contra el schema de `investors."User"`
- Ancho optimizado para escritura (1400px max)
- Formato de variables: `{{investors.User.column_name}}`

**Ejemplo de uso:**
```tsx
<RichTextEditor 
  value={documentContent}
  onChange={setDocumentContent}
/>
```

**Variables disponibles:**
- `{{investors.User.email}}`
- `{{investors.User.first_name}}`
- `{{investors.User.last_name}}`
- `{{investors.User.phone}}`
- `{{investors.User.display_name}}`
- Y todas las demás columnas de `investors."User"`

**Validación:**
1. Usuario hace clic en botón `{{var}}`
2. Introduce nombre de columna (ej: `phone`)
3. Sistema valida contra database schema
4. Si existe → inserta `{{investors.User.phone}}`
5. Si no existe → muestra error y no permite insertar

### 2. Captura de Firma Manuscrita

**Componente:** `components/investor-portal/signature-canvas.tsx`

**Características:**
- Canvas HTML5 con soporte mouse y touch
- Tamaño adaptable (default: 600x200px)
- Botones: Borrar, Rehacer
- Exporta imagen como Data URL (base64)
- Detección de firma vacía

**Flujo:**
1. Inversor dibuja firma con mouse/dedo
2. Valida que no esté vacía
3. Convierte canvas a Data URL
4. Sube imagen a Vercel Blob
5. Guarda URL en `signed_document.firma_manuscrita_url`

### 3. Sistema de Testing de Firmas

**Componente:** `components/documents/document-testing-manager.tsx`  
**Ruta:** `/dashboard/documents/testing`

**Funcionalidades:**
- Seleccionar tipo de documento (solo con `requiere_firma=true`)
- Seleccionar versión publicada
- Buscar inversor por email
- Crear sesión de firma de prueba
- Generar enlace único y código QR
- Visualizar sesiones recientes con estados

**Casos de uso:**
- Probar flujo completo de firma antes de producción
- Verificar renderizado de variables con datos reales
- Validar emails OTP
- Comprobar captura de firma manuscrita

---

## Flujos de Trabajo

### Flujo 1: Creación de Documento

```
Admin Dashboard → /dashboard/documents
         ↓
  Clic en "Crear Tipo de Documento"
         ↓
  Rellenar formulario:
    - Nombre (código único)
    - Display Name
    - Descripción
    - [✓] Requiere Firma
    - [✓] Obligatorio antes de invertir
    - Días de vigencia: 365
         ↓
  POST /api/admin/documents/types
         ↓
  INSERT en documentos.document_type
         ↓
  Redirigir a "Ver Versiones"
         ↓
  Crear nueva versión:
    - Número de versión: "1.0"
    - Contenido (con editor)
    - Insertar variables validadas
    - Notas de versión
         ↓
  POST /api/admin/documents/versions
         ↓
  INSERT en documentos.document_version (status='borrador')
         ↓
  Vista previa con inversor real
         ↓
  Clic en "Publicar"
         ↓
  PATCH /api/admin/documents/versions/[id]
         ↓
  UPDATE status='publicado', publicado_en=NOW()
```

### Flujo 2: Firma de Documento (Completo)

```
1. ADMIN: Crear sesión de firma (Testing o Producción)
   POST /api/admin/documents/testing/create-session
   Body: {
     documentVersionId: UUID,
     investorEmail: string
   }
   ↓
   INSERT signature_session (status='pendiente')
   ↓
   Generar token_firma único
   ↓
   Enviar email al inversor con enlace:
   https://urbix.es/investor-portal/sign/{token}

2. INVERSOR: Abrir enlace de firma
   GET /investor-portal/sign/[token]
   ↓
   GET /api/investors/documents/sign/[token]
   ↓
   Validar token:
     - Existe en signature_session
     - status='pendiente'
     - expires_at > NOW()
   ↓
   Obtener datos del documento y del inversor
   ↓
   Renderizar componente <SigningPage>

3. INVERSOR: Revisar documento
   - Ver contenido con variables sustituidas
   - Ejemplo: "Yo, Juan Pérez, con email juan@example.com..."
   ↓
   Marcar checkbox "He leído y acepto"
   ↓
   Clic en "Continuar a Firma"

4. INVERSOR: Firmar manuscritamente
   - Dibujar firma en canvas
   ↓
   Validar firma no vacía
   ↓
   Guardar Data URL en estado
   ↓
   Clic en "Continuar"

5. INVERSOR: Elegir método OTP
   - Seleccionar "Email"
   - Campo email pre-llenado automáticamente
   ↓
   Clic en "Enviar Código"
   ↓
   POST /api/investors/documents/sign/otp/send
   Body: { sessionId: UUID, method: "email", destination: "user@example.com" }
   ↓
   Generar código OTP (6 dígitos)
   ↓
   UPDATE signature_session SET otp_code=XXX, otp_expires_at=NOW()+5min
   ↓
   Enviar email con código usando gmailClient
   ↓
   Mostrar campo para introducir código

6. INVERSOR: Verificar código OTP
   - Introducir código recibido por email
   ↓
   Clic en "Verificar y Firmar"
   ↓
   POST /api/investors/documents/sign/otp/verify
   Body: {
     sessionId: UUID,
     otpCode: "123456",
     signatureDataUrl: "data:image/png;base64,..."
   }
   ↓
   Validar OTP:
     - Código correcto
     - No expirado (< 5 min)
     - Max 3 intentos
   ↓
   Subir firma manuscrita a Vercel Blob:
     const blob = await put(`signatures/${sessionId}.png`, buffer, {
       access: 'public',
       contentType: 'image/png'
     })
   ↓
   INSERT en signed_document:
     - contenido_firmado (HTML renderizado)
     - firma_manuscrita_url (blob.url)
     - metodo_firma: "otp_email"
     - ip_firma, user_agent
     - fecha_firma: NOW()
   ↓
   Generar CSV de verificación:
     hash_documento,fecha_firma,inversor_email,ip,metodo
   ↓
   INSERT en signature_verification
   ↓
   UPDATE signature_session SET status='firmado', firmado_en=NOW()
   ↓
   Retornar { success: true, signedDocumentId: UUID }
   ↓
   Mostrar mensaje de éxito al inversor
   ↓
   Redirigir a /investor-portal/documents
```

### Flujo 3: Testing de Firma

```
Admin → /dashboard/documents/testing
      ↓
1. Seleccionar tipo de documento
   GET /api/admin/documents/types
   ↓
   Filtrar: requiere_firma = true
   ↓
   Mostrar dropdown con tipos disponibles

2. Seleccionar versión publicada
   GET /api/admin/documents/versions?typeId=X&status=publicado
   ↓
   Mostrar dropdown con versiones

3. Introducir email del inversor
   - Campo de texto con validación de formato

4. Crear sesión de prueba
   POST /api/admin/documents/testing/create-session
   Body: {
     documentVersionId: UUID,
     investorEmail: "test@example.com"
   }
   ↓
   Buscar inversor por email
   ↓
   Crear signature_session con expires_at=NOW()+24h
   ↓
   Generar token_firma único
   ↓
   Retornar:
     - sessionId
     - token_firma
     - expires_at
     - link completo: https://urbix.es/investor-portal/sign/{token}

5. Mostrar resultados
   - Enlace de firma (botón copiar)
   - Código QR (generado dinámicamente)
   - Botón "Abrir en Nueva Pestaña"
   - Fecha de expiración

6. Lista de sesiones recientes
   GET /api/admin/documents/signatures?limit=10
   ↓
   Mostrar tabla con:
     - Tipo de documento
     - Versión
     - Email inversor
     - Estado (pendiente/firmado/expirado)
     - Fecha creación
     - Acciones (ver/reenviar)
```

---

## APIs

### Admin - Tipos de Documentos

**Listar Tipos**
```
GET /api/admin/documents/types
Response: {
  types: [{
    id: UUID,
    name: string,
    display_name: string,
    description: string,
    requiere_firma: boolean,
    obligatorio_antes_invertir: boolean,
    dias_vigencia: number,
    created_at: timestamp
  }]
}
```

**Crear Tipo**
```
POST /api/admin/documents/types
Body: {
  name: string,
  display_name: string,
  description?: string,
  requiere_firma: boolean,
  obligatorio_antes_invertir?: boolean,
  dias_vigencia?: number
}
Response: { success: true, type: DocumentType }
```

**Actualizar Tipo**
```
PATCH /api/admin/documents/types/[id]
Body: Partial<DocumentType>
Response: { success: true }
```

**Eliminar Tipo**
```
DELETE /api/admin/documents/types/[id]
Response: { success: true }
```

### Admin - Versiones

**Listar Versiones de un Tipo**
```
GET /api/admin/documents/versions?typeId=UUID
Response: {
  versions: [{
    id: UUID,
    document_type_id: UUID,
    version_number: string,
    contenido: string,
    variables: string[],
    status: 'borrador' | 'publicado',
    publicado_en: timestamp,
    created_at: timestamp
  }]
}
```

**Crear Versión**
```
POST /api/admin/documents/versions
Body: {
  document_type_id: UUID,
  version_number: string,
  contenido: string,
  variables?: string[],
  notas_version?: string
}
Response: { success: true, version: DocumentVersion }
```

**Actualizar Versión**
```
PATCH /api/admin/documents/versions/[id]
Body: Partial<DocumentVersion>
Response: { success: true }
```

**Publicar Versión**
```
POST /api/admin/documents/versions/[id]/publish
Response: { 
  success: true, 
  version: DocumentVersion (status='publicado') 
}
```

**Vista Previa con Inversor**
```
POST /api/admin/documents/versions/[id]/preview
Body: { investorEmail: string }
Response: {
  contenidoRenderizado: string,  // HTML con variables sustituidas
  variables: { [key: string]: any }
}
```

### Admin - Testing

**Crear Sesión de Prueba**
```
POST /api/admin/documents/testing/create-session
Body: {
  documentVersionId: UUID,
  investorEmail: string
}
Response: {
  sessionId: UUID,
  token: string,
  link: string,
  expires_at: timestamp
}
```

### Admin - Validación de Variables

**Validar Variable**
```
POST /api/admin/documents/validate-variable
Body: { columnName: string }
Response: {
  valid: boolean,
  columnName?: string,
  dataType?: string,
  error?: string
}
```

### Investors - Firma

**Obtener Datos de Sesión**
```
GET /api/investors/documents/sign/[token]
Response: {
  session: SignatureSession,
  document: DocumentVersion,
  investor: InvestorUser
}
```

**Vista Previa de Documento**
```
GET /api/investors/documents/sign/[token]/preview
Response: {
  contenidoRenderizado: string,
  variables: object
}
```

**Enviar OTP**
```
POST /api/investors/documents/sign/otp/send
Body: {
  sessionId: UUID,
  method: 'email' | 'sms',
  destination: string
}
Response: {
  sent: boolean,
  maskedDestination: string  // "j***@example.com"
}
```

**Verificar OTP y Completar Firma**
```
POST /api/investors/documents/sign/otp/verify
Body: {
  sessionId: UUID,
  otpCode: string,
  signatureDataUrl: string  // Base64 de imagen de firma
}
Response: {
  success: boolean,
  signedDocumentId?: UUID,
  error?: string
}
```

### Investors - Mis Documentos

**Listar Documentos del Inversor**
```
GET /api/investors/documents
Response: {
  pending: SignatureSession[],
  signed: SignedDocument[]
}
```

---

## Seguridad

### Validación de Tokens

**Verificaciones:**
1. Token existe en `signature_session`
2. Estado es `'pendiente'`
3. `expires_at > NOW()` (no expirado)
4. Inversor coincide con el de la sesión

**Expiración:**
- Sesiones estándar: 7 días
- Sesiones de testing: 24 horas
- OTP: 5 minutos

### Protección de OTP

**Medidas:**
- Máximo 3 intentos de verificación
- Código expira en 5 minutos
- Códigos de 6 dígitos aleatorios
- No se reutilizan códigos

### Firma Manuscrita

**Almacenamiento:**
- Subida a Vercel Blob con acceso público
- Formato PNG
- Nombre: `signatures/{sessionId}.png`
- URL almacenada en `signed_document.firma_manuscrita_url`

**Validación:**
- Canvas no puede estar vacío
- Mínimo 10 píxeles dibujados

### RBAC Permisos

```sql
-- Permisos necesarios
documents:read
documents:write
documents:delete
documents:publish
documents:testing
signatures:read
signatures:write
```

**Roles:**
- **SuperAdmin**: Todos los permisos
- **Admin**: Gestión de documentos y firmas
- **Editor**: Crear/editar documentos, no puede publicar
- **Viewer**: Solo lectura

---

## Testing

### Script SQL de Prueba

```sql
-- Verificar tipos de documentos existentes
SELECT 
  id, 
  name, 
  display_name, 
  requiere_firma, 
  obligatorio_antes_invertir,
  dias_vigencia
FROM documentos.document_type;

-- Verificar versiones publicadas
SELECT 
  dv.id,
  dt.display_name AS tipo_documento,
  dv.version_number,
  dv.status,
  dv.publicado_en
FROM documentos.document_version dv
JOIN documentos.document_type dt ON dt.id = dv.document_type_id
WHERE dv.status = 'publicado';

-- Verificar sesiones de firma pendientes
SELECT 
  ss.id,
  iu.email AS inversor_email,
  dt.display_name AS documento,
  dv.version_number,
  ss.status,
  ss.expires_at,
  ss.created_at
FROM documentos.signature_session ss
JOIN investors."User" iu ON iu.id = ss.inversor_id
JOIN documentos.document_version dv ON dv.id = ss.document_version_id
JOIN documentos.document_type dt ON dt.id = dv.document_type_id
WHERE ss.status = 'pendiente'
ORDER BY ss.created_at DESC;

-- Verificar documentos firmados
SELECT 
  sd.id,
  iu.email AS inversor_email,
  dt.display_name AS documento,
  sd.firma_manuscrita_url,
  sd.metodo_firma,
  sd.fecha_firma,
  sd.firma_valida
FROM documentos.signed_document sd
JOIN investors."User" iu ON iu.id = sd.inversor_id
JOIN documentos.document_version dv ON dv.id = sd.document_version_id
JOIN documentos.document_type dt ON dt.id = dv.document_type_id
ORDER BY sd.fecha_firma DESC;
```

### Checklist de Testing

- [ ] Crear tipo de documento con `requiere_firma=true`
- [ ] Crear versión con variables dinámicas
- [ ] Validar que variables incorrectas muestran error
- [ ] Publicar versión
- [ ] Crear sesión de testing
- [ ] Escanear código QR con móvil
- [ ] Revisar documento con datos reales del inversor
- [ ] Firmar manuscritamente en canvas
- [ ] Recibir email con código OTP
- [ ] Verificar código OTP (3 intentos máximo)
- [ ] Confirmar documento firmado en `/investor-portal/documents`
- [ ] Verificar firma manuscrita se muestra correctamente
- [ ] Comprobar CSV de verificación generado

---

## Conclusión

El Sistema de Gestión de Documentos y Firma Electrónica proporciona una solución completa y segura para la firma digital de documentos legales. Con validación de variables en tiempo real, captura de firma manuscrita, OTP por email y un sistema robusto de testing, la plataforma URBIX puede gestionar contratos y documentos legales de forma totalmente digital y auditable.

**Última actualización**: Enero 2026  
**Versión del documento**: 1.0
