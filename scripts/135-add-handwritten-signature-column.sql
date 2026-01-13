-- Add handwritten signature column to signed_document table
ALTER TABLE documentos.signed_document
ADD COLUMN IF NOT EXISTS firma_manuscrita_url TEXT,
ADD COLUMN IF NOT EXISTS firma_manuscrita_storage_provider VARCHAR(50);

COMMENT ON COLUMN documentos.signed_document.firma_manuscrita_url IS 'URL de la imagen de la firma manuscrita del inversor';
COMMENT ON COLUMN documentos.signed_document.firma_manuscrita_storage_provider IS 'Proveedor de almacenamiento de la firma (blob, s3, etc)';
