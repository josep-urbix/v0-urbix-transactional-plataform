-- Fixed column names to match AdminSettings schema (snake_case)
-- Add investor portal authentication settings to AdminSettings
INSERT INTO public."AdminSettings" (key, value, created_at, updated_at)
VALUES 
  ('investor_portal_google_oauth_enabled', 'true', NOW(), NOW()),
  ('investor_portal_magic_link_enabled', 'true', NOW(), NOW()),
  ('investor_portal_password_login_enabled', 'true', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Verify the settings were created
SELECT key, value, updated_at 
FROM public."AdminSettings" 
WHERE key LIKE 'investor_portal_%'
ORDER BY key;
