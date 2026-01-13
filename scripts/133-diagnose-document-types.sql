-- Diagnóstico de tipos de documentos
SELECT 'Tipos de documentos totales' as info, COUNT(*) as cantidad
FROM documentos.document_type;

SELECT 'Tipos que requieren firma' as info, COUNT(*) as cantidad
FROM documentos.document_type
WHERE requiere_firma = true;

-- Updated column names to match actual schema
SELECT 
  id,
  name,
  display_name,
  requiere_firma,
  obligatorio_antes_de_invertir,
  created_at
FROM documentos.document_type
ORDER BY created_at DESC;

SELECT 'Versiones publicadas' as info, COUNT(*) as cantidad
FROM documentos.document_version
WHERE status = 'publicado';

-- Updated column names and join to match actual schema
SELECT 
  dv.id,
  dv.document_type_id,
  dt.display_name as tipo_nombre,
  dv.version_number,
  dv.status,
  dv.created_at
FROM documentos.document_version dv
JOIN documentos.document_type dt ON dv.document_type_id = dt.id
ORDER BY dv.created_at DESC
LIMIT 10;
