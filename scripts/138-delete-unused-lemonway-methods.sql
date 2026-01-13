-- Eliminar métodos de API de Lemonway que no se van a usar:
-- /accounts/create y /accounts/balances

-- Primero eliminar dependencias: presets
DELETE FROM lemonway_api_presets 
WHERE method_id IN (
  SELECT id FROM lemonway_api_methods 
  WHERE endpoint IN ('/accounts/create', '/accounts/balances')
);

-- Luego eliminar historial de llamadas
DELETE FROM lemonway_api_call_history 
WHERE method_id IN (
  SELECT id FROM lemonway_api_methods 
  WHERE endpoint IN ('/accounts/create', '/accounts/balances')
);

-- Finalmente eliminar los métodos
DELETE FROM lemonway_api_methods 
WHERE endpoint IN ('/accounts/create', '/accounts/balances');

-- Verificación
SELECT 
  COUNT(*) as remaining_methods,
  array_agg(DISTINCT endpoint) as endpoints
FROM lemonway_api_methods;
