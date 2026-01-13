-- Agregar columna enum_value a process_templates
ALTER TABLE tasks.process_templates
ADD COLUMN enum_value VARCHAR(100) NOT NULL DEFAULT 'OTRO';

-- Actualizar proceso KYC existente a REVISION_KYC
UPDATE tasks.process_templates SET enum_value = 'REVISION_KYC' WHERE nombre = 'KYC';

-- Crear constraint para validar que enum_value sea válido
ALTER TABLE tasks.process_templates
ADD CONSTRAINT check_valid_enum_value 
CHECK (enum_value IN ('VINCULACION_WALLETS', 'REVISION_KYC', 'VERIFICACION_SALDOS', 'AUDITORIA_TRANSACCIONES', 'GESTION_USUARIOS', 'SOPORTE_TECNICO', 'OTRO'));
