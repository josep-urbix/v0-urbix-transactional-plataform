-- =====================================================
-- Registrar el nuevo método getAccountTransactions en el API Explorer
-- =====================================================

-- Insertar el nuevo método en la tabla de métodos de API
INSERT INTO "lemonway_api_methods" (
  name, 
  endpoint, 
  http_method, 
  category, 
  description, 
  is_enabled, 
  is_implemented,
  request_schema,
  response_schema,
  example_request, 
  example_response
) VALUES (
  'getAccountTransactions',
  '/accounts/{accountId}/transactions',
  'GET',
  'Transactions',
  'Obtiene el historial completo de transacciones de una cuenta específica. Retorna todas las operaciones realizadas con detalles como tipo, monto, fecha, estado y metadata adicional.',
  true,
  true,
  '{
    "type": "object",
    "properties": {
      "accountId": {
        "type": "string",
        "description": "ID de la cuenta de Lemonway",
        "example": "WALLET123"
      },
      "startDate": {
        "type": "string",
        "format": "date",
        "description": "Fecha inicial del rango (opcional)",
        "example": "2024-01-01"
      },
      "endDate": {
        "type": "string",
        "format": "date",
        "description": "Fecha final del rango (opcional)",
        "example": "2024-01-31"
      }
    },
    "required": ["accountId"]
  }'::jsonb,
  '{
    "type": "object",
    "properties": {
      "accountId": {"type": "string"},
      "transactions": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "transactionId": {"type": "string"},
            "creditAmount": {"type": "number"},
            "debitAmount": {"type": "number"},
            "typeLabel": {"type": "string"},
            "date": {"type": "number"},
            "status": {"type": "string"}
          }
        }
      }
    }
  }'::jsonb,
  '{"accountId": "WALLET123", "startDate": "2024-01-01", "endDate": "2024-01-31"}'::jsonb,
  '{
    "accountId": "WALLET123",
    "transactions": [
      {
        "transactionId": "TXN001",
        "creditAmount": 10000,
        "debitAmount": 0,
        "typeLabel": "Money In",
        "date": 1705320000,
        "status": "completed",
        "comment": "Initial deposit"
      }
    ]
  }'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  is_implemented = EXCLUDED.is_implemented,
  request_schema = EXCLUDED.request_schema,
  response_schema = EXCLUDED.response_schema,
  example_request = EXCLUDED.example_request,
  example_response = EXCLUDED.example_response,
  updated_at = NOW();

-- Verificar que el método fue agregado correctamente
SELECT 
  name, 
  endpoint, 
  http_method, 
  category, 
  is_enabled, 
  is_implemented
FROM "lemonway_api_methods"
WHERE name = 'getAccountTransactions';
