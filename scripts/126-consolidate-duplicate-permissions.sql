-- Script 126: Consolidar permisos duplicados (OPCIONAL - revisar antes de ejecutar)
-- Este script identifica permisos similares que podrían consolidarse

-- Listar permisos que parecen duplicados
SELECT 
  p1.name as permiso_1,
  p2.name as permiso_2,
  p1.resource,
  p1.action
FROM public."Permission" p1
JOIN public."Permission" p2 ON p1.resource = p2.resource 
  AND p1.action = p2.action 
  AND p1.id < p2.id
ORDER BY p1.resource, p1.action;

-- Ejemplos de duplicados detectados:
-- bpm.cancel vs bpm:cancel_execution
-- bpm.create vs bpm:create_workflow
-- etc.

-- NOTA: Este script solo lista duplicados. 
-- NO ejecuta consolidación automática porque requiere decisión manual
-- sobre qué nombre de permiso mantener.
