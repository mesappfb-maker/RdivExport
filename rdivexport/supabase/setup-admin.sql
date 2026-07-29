-- =============================================================================
-- RdivExport – Configuration du compte administrateur système
-- =============================================================================
-- Email     : fabricefb@gmail.com
-- Mot de passe : Waze@Div007
-- Rôle      : main_requisitionist (administrateur système)
-- =============================================================================
-- 
-- PRÉREQUIS :
--   1. Le schéma (schema.sql) doit déjà être exécuté dans Supabase
--   2. Les 10 pharmacies doivent être insérées (inclues dans schema.sql)
--   3. L'utilisateur doit d'abord s'inscrire via l'application ou être créé
--      manuellement dans Supabase Dashboard > Authentication > Users
--
-- UTILISATION :
--   Exécuter ce script dans le SQL Editor de Supabase Dashboard
--   (https://supabase.com/dashboard → Votre projet → SQL Editor)
-- =============================================================================

-- ─── Étape 1 : Vérifier que le schéma existe ──────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RAISE EXCEPTION 'La table profiles n\'existe pas. Exécutez d\'abord schema.sql.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pharmacies') THEN
    RAISE EXCEPTION 'La table pharmacies n\'existe pas. Exécutez d\'abord schema.sql.';
  END IF;
END $$;

-- ─── Étape 2 : Créer le profil administrateur ─────────────────────────────────
-- Ce script vérifie si l'utilisateur existe dans auth.users et crée le profil.
-- Si l'utilisateur n'existe pas encore, il faut le créer d'abord.

INSERT INTO public.profiles (id, user_id, full_name, email, phone, role, pharmacy_id, is_active)
SELECT 
  u.id,
  u.id,
  'Administrateur Système',
  u.email,
  NULL,
  'main_requisitionist',
  NULL,  -- Pas de pharmacie assignée (admin global)
  true
FROM auth.users u
WHERE u.email = 'fabricefb@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  pharmacy_id = EXCLUDED.pharmacy_id,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- ─── Étape 3 : Vérification ───────────────────────────────────────────────────
DO $$
DECLARE
  v_count INTEGER;
  v_role TEXT;
BEGIN
  SELECT COUNT(*), role INTO v_count, v_role
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE u.email = 'fabricefb@gmail.com';
  
  IF v_count = 0 THEN
    RAISE NOTICE '⚠ ATTENTION : Aucun utilisateur trouvé avec fabricefb@gmail.com.';
    RAISE NOTICE '  → Créez d\'abord le compte utilisateur dans Supabase Dashboard > Authentication > Users';
    RAISE NOTICE '  → Ou inscrivez-vous via la page de connexion de l\'application RdivExport';
    RAISE NOTICE '  → Puis réexécutez ce script.';
  ELSE
    RAISE NOTICE '✅ Profil administrateur configuré avec succès !';
    RAISE NOTICE '  → Email : fabricefb@gmail.com';
    RAISE NOTICE '  → Rôle : %', v_role;
    RAISE NOTICE '  → Accès : /admin (tableau de bord requisitionniste principal)';
  END IF;
END $$;
