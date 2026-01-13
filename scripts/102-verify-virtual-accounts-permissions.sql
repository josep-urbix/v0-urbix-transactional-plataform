-- =====================================================
-- VERIFY VIRTUAL ACCOUNTS PERMISSIONS
-- =====================================================

-- Check if Virtual Accounts permissions exist
SELECT 
  'PERMISSIONS' as tipo,
  resource,
  action,
  name,
  description
FROM public."Permission"
WHERE resource = 'VIRTUAL_ACCOUNTS'
ORDER BY action;

-- Check which roles have Virtual Accounts permissions
SELECT 
  r.name as role_name,
  r."displayName" as role_display,
  COUNT(rp."permissionId") as virtual_accounts_permissions_count,
  STRING_AGG(p.action, ', ' ORDER BY p.action) as permissions
FROM public."Role" r
LEFT JOIN public."RolePermission" rp ON rp.role = r.id
LEFT JOIN public."Permission" p ON p.id = rp."permissionId" AND p.resource = 'VIRTUAL_ACCOUNTS'
GROUP BY r.id, r.name, r."displayName"
ORDER BY virtual_accounts_permissions_count DESC;

-- Check if Admin role has all Virtual Accounts permissions
DO $$
DECLARE
  admin_role_id TEXT;
  total_va_perms INTEGER;
  admin_va_perms INTEGER;
BEGIN
  -- Find Admin role
  SELECT id INTO admin_role_id 
  FROM public."Role" 
  WHERE name = 'admin' OR "displayName" ILIKE '%admin%'
  LIMIT 1;
  
  IF admin_role_id IS NULL THEN
    RAISE NOTICE 'WARNING: Admin role not found!';
  ELSE
    -- Count total Virtual Accounts permissions
    SELECT COUNT(*) INTO total_va_perms
    FROM public."Permission"
    WHERE resource = 'VIRTUAL_ACCOUNTS';
    
    -- Count Admin's Virtual Accounts permissions
    SELECT COUNT(*) INTO admin_va_perms
    FROM public."RolePermission" rp
    JOIN public."Permission" p ON p.id = rp."permissionId"
    WHERE rp.role = admin_role_id AND p.resource = 'VIRTUAL_ACCOUNTS';
    
    RAISE NOTICE 'Admin role has % of % Virtual Accounts permissions', admin_va_perms, total_va_perms;
    
    IF admin_va_perms < total_va_perms THEN
      RAISE NOTICE 'WARNING: Admin role is missing some Virtual Accounts permissions!';
    ELSE
      RAISE NOTICE 'SUCCESS: Admin role has all Virtual Accounts permissions';
    END IF;
  END IF;
END $$;
