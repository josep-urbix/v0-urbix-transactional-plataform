-- Limpiar todas las transacciones antiguas de Lemonway
-- Esto eliminará el historial de llamadas al API antiguo (GetWalletDetails)

DELETE FROM "LemonwayApiCallLog";

-- Resetear el auto-increment si es necesario
ALTER SEQUENCE "LemonwayApiCallLog_id_seq" RESTART WITH 1;
