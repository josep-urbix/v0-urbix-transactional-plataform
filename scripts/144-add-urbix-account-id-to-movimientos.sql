-- Agregar columna urbix_account_id a lemonway_temp.movimientos_cuenta
-- Este campo almacena el ID de la cuenta virtual de URBIX (virtual_accounts.cuentas_virtuales.id)
-- Se obtiene mediante lookup basado en lemonway_account_id

ALTER TABLE lemonway_temp.movimientos_cuenta 
ADD COLUMN urbix_account_id UUID;

-- Crear índice para búsquedas rápidas
CREATE INDEX idx_movimientos_urbix_account_id ON lemonway_temp.movimientos_cuenta(urbix_account_id);

-- Comentario descriptivo
COMMENT ON COLUMN lemonway_temp.movimientos_cuenta.urbix_account_id IS 
'ID de la cuenta virtual URBIX (virtual_accounts.cuentas_virtuales.id) asociada a esta transacción. NULL si no existe mapeo.';
