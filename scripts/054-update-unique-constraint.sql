-- Actualizar el constraint UNIQUE para permitir múltiples mapeos del mismo campo
-- cuando tienen diferentes target_field

-- Eliminar el constraint actual
ALTER TABLE payments.lemonway_field_mappings 
DROP CONSTRAINT IF EXISTS lemonway_field_mappings_unique;

-- Crear nuevo constraint que incluya target_field (permitiendo NULL)
ALTER TABLE payments.lemonway_field_mappings 
ADD CONSTRAINT lemonway_field_mappings_unique 
UNIQUE NULLS NOT DISTINCT (endpoint, table_name, field_name, field_value, target_field);
