SELECT 
    enumlabel AS valor_permitido
FROM pg_enum
WHERE enumtypid = 'documentos.firma_channel'::regtype
ORDER BY enumsortorder;
