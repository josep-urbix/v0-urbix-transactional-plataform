-- Agregar columna table_name a la tabla de mapeos
ALTER TABLE payments.lemonway_field_mappings 
ADD COLUMN IF NOT EXISTS table_name TEXT;

-- Actualizar mapeos existentes con el nombre de tabla
UPDATE payments.lemonway_field_mappings 
SET table_name = 'payment_accounts' 
WHERE endpoint = 'accounts/retrieve';

-- Hacer table_name obligatorio para nuevos registros
ALTER TABLE payments.lemonway_field_mappings 
ALTER COLUMN table_name SET NOT NULL;

-- Actualizar constraint UNIQUE para incluir table_name
ALTER TABLE payments.lemonway_field_mappings 
DROP CONSTRAINT IF EXISTS lemonway_field_mappings_endpoint_field_name_field_value_key;

ALTER TABLE payments.lemonway_field_mappings 
ADD CONSTRAINT lemonway_field_mappings_unique 
UNIQUE(endpoint, table_name, field_name, field_value);

-- Comentario
COMMENT ON COLUMN payments.lemonway_field_mappings.table_name IS 'Nombre de la tabla en la base de datos donde se guarda este campo';
