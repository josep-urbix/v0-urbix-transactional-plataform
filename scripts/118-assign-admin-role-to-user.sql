-- Script 118: Asignar rol Admin al usuario josep@urbix.es
-- Este script actualiza el rol del usuario directamente en la tabla User

DO $$
DECLARE
    v_user_count INTEGER;
BEGIN
    -- Actualizar el rol del usuario josep@urbix.es a Admin
    UPDATE public."User"
    SET role = 'Admin'
    WHERE email = 'josep@urbix.es';

    GET DIAGNOSTICS v_user_count = ROW_COUNT;

    IF v_user_count = 0 THEN
        RAISE NOTICE 'Usuario josep@urbix.es no encontrado';
    ELSE
        RAISE NOTICE 'Rol Admin asignado correctamente al usuario josep@urbix.es';
    END IF;
END $$;

-- Verificar la asignación
SELECT 
    id,
    email,
    name,
    role,
    "isActive",
    "createdAt"
FROM public."User"
WHERE email = 'josep@urbix.es';
