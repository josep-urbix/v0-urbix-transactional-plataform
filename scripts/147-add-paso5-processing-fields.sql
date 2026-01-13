-- Agregar columna movimientos_cuenta_id a tabla temporal para referencia cruzada
ALTER TABLE lemonway_temp.movimientos_cuenta
ADD COLUMN IF NOT EXISTS movimientos_cuenta_id UUID;

-- Agregar índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_movimientos_cuenta_aprobados 
ON lemonway_temp.movimientos_cuenta(estado_revision) 
WHERE estado_revision = 'aprobado';

-- Crear tabla de alertas para notificar errores de procesamiento
CREATE TABLE IF NOT EXISTS lemonway_temp.import_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id UUID,
  movimiento_temp_id TEXT,
  tipo_alerta VARCHAR(50),
  mensaje TEXT,
  datos_error JSONB,
  resuelta BOOLEAN DEFAULT false,
  resuelta_por TEXT,
  resuelta_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_import_alerts_movimiento 
ON lemonway_temp.import_alerts(movimiento_temp_id);

CREATE INDEX IF NOT EXISTS idx_import_alerts_sin_resolver 
ON lemonway_temp.import_alerts(resuelta) 
WHERE resuelta = false;
