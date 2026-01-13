-- Tabla para mapear valores de campos de Lemonway a etiquetas legibles
CREATE TABLE IF NOT EXISTS payments.lemonway_field_mappings (
  id SERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_value TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(endpoint, field_name, field_value)
);

-- Insertar mapeos existentes
INSERT INTO payments.lemonway_field_mappings (endpoint, field_name, field_value, label) VALUES
  ('accounts/retrieve', 'payerOrBeneficiary', '1', 'Prestamista'),
  ('accounts/retrieve', 'payerOrBeneficiary', '2', 'Promotor Proyecto'),
  ('accounts/retrieve', 'accountType', '0', 'Persona Física'),
  ('accounts/retrieve', 'accountType', '1', 'Persona Jurídica')
ON CONFLICT (endpoint, field_name, field_value) DO NOTHING;

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_field_mappings_lookup 
  ON payments.lemonway_field_mappings(endpoint, field_name, field_value);

-- Comentarios
COMMENT ON TABLE payments.lemonway_field_mappings IS 'Mapeos de valores de campos de la API de Lemonway a etiquetas legibles en español';
COMMENT ON COLUMN payments.lemonway_field_mappings.endpoint IS 'Endpoint de la API de Lemonway (ej: accounts/retrieve)';
COMMENT ON COLUMN payments.lemonway_field_mappings.field_name IS 'Nombre del campo en el payload (ej: payerOrBeneficiary)';
COMMENT ON COLUMN payments.lemonway_field_mappings.field_value IS 'Valor del campo en el payload (ej: 1, 2)';
COMMENT ON COLUMN payments.lemonway_field_mappings.label IS 'Etiqueta legible en español para mostrar en la UI';
