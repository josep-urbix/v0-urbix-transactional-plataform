-- Agregar columnas para mapeos cruzados de campos
ALTER TABLE payments.lemonway_field_mappings 
  ADD COLUMN IF NOT EXISTS target_field TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT;

-- Comentarios para las nuevas columnas
COMMENT ON COLUMN payments.lemonway_field_mappings.target_field IS 'Campo destino donde aplicar la etiqueta (si es diferente del campo origen)';
COMMENT ON COLUMN payments.lemonway_field_mappings.color IS 'Color de la etiqueta (ej: green, red, yellow)';

-- Eliminado el INSERT con table_name que causaba conflicto con el constraint UNIQUE
-- Los mapeos cruzados se deben crear desde el CRUD en la interfaz de usuario
