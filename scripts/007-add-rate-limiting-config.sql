-- Agregar campos de rate limiting a la configuración de Lemonway
ALTER TABLE "LemonwayConfig" 
ADD COLUMN IF NOT EXISTS max_concurrent_requests INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS min_delay_between_requests_ms INTEGER DEFAULT 1000;

-- Comentarios para documentar los campos
COMMENT ON COLUMN "LemonwayConfig".max_concurrent_requests IS 'Número máximo de peticiones simultáneas permitidas';
COMMENT ON COLUMN "LemonwayConfig".min_delay_between_requests_ms IS 'Tiempo mínimo en milisegundos entre peticiones consecutivas';
