-- =====================================================
-- URBIX INTEGRATIONS - PROCESS TEMPLATES TABLE
-- Schema: tasks
-- Descripción: Tabla para gestionar procesos dinámicamente
-- =====================================================

CREATE TABLE IF NOT EXISTS tasks.process_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  titulo_template TEXT NOT NULL,
  descripcion_template TEXT NOT NULL,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_process_templates_nombre ON tasks.process_templates(nombre);
CREATE INDEX IF NOT EXISTS idx_process_templates_activa ON tasks.process_templates(activa);

-- Insertar proceso de prueba KYC
INSERT INTO tasks.process_templates (nombre, descripcion, titulo_template, descripcion_template, activa)
SELECT 'KYC', 'Proceso de Know Your Customer', 'Verificación KYC de {{customer_id}}', 'Realizar verificación KYC completa del cliente', true
WHERE NOT EXISTS (SELECT 1 FROM tasks.process_templates WHERE nombre = 'KYC');
